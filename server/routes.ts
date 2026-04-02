import { Router } from 'express';
import multer from 'multer';
import { db } from './db.js';
import { tests, questions, sessions, sessionAnswers } from './schema.js';
import { generateQuestions, extractTextFromBase64, extractTextFromUrl } from './gemini.js';
import { eq, desc, ilike, and } from 'drizzle-orm';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/generate - Generate questions with Gemini
router.post('/generate', async (req, res) => {
  try {
    const { prompt, examType, difficulty, questionCount, fileContent, imageContent, urlContent } = req.body;

    const countMatch = (questionCount || '20 Questions').match(/\d+/);
    const count = countMatch ? Math.min(parseInt(countMatch[0]), 50) : 20;

    let topic = prompt || '';
    let extra = '';

    if (urlContent) extra += `URL Content: ${urlContent}\n`;
    if (fileContent) extra += `Document Content: ${fileContent}\n`;
    if (imageContent) extra += `Image Content: ${imageContent}\n`;

    if (!topic && extra) topic = extra.substring(0, 200);
    if (!topic) return res.status(400).json({ error: 'Please provide a topic or upload content.' });

    const generatedQs = await generateQuestions(topic, examType || 'General', difficulty || 'Medium', count, extra);

    const title = `${examType || 'General'} – ${topic.substring(0, 60)}`;

    const [test] = await db.insert(tests).values({
      title,
      topic: topic.substring(0, 500),
      examType: examType || 'General',
      difficulty: difficulty || 'Medium',
      questionCount: generatedQs.length,
      isPublic: true,
    }).returning();

    const questionRows = generatedQs.map((q) => ({
      testId: test.id,
      text: q.text,
      options: q.options,
      correctAnswer: q.correct_answer,
      explanation: q.explanation,
      section: q.section,
      hint: q.hint || null,
      imageUrl: null,
    }));

    await db.insert(questions).values(questionRows);

    res.json({ testId: test.id, title, questionCount: generatedQs.length });
  } catch (err: any) {
    console.error('Generate error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate questions' });
  }
});

// POST /api/upload/file - Extract text from PDF/image
router.post('/upload/file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    const base64 = req.file.buffer.toString('base64');
    const text = await extractTextFromBase64(base64, req.file.mimetype);
    res.json({ content: text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/upload/url - Extract content from URL
router.post('/upload/url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    const text = await extractTextFromUrl(url);
    res.json({ content: text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/echo', (req, res) => {
  res.json({ query: req.query, url: req.url, originalUrl: req.originalUrl });
});

// GET /api/tests/:testId - Get test with questions
router.get('/tests/:testId', async (req, res) => {
  try {
    const testId = parseInt(req.params.testId);
    const lang = req.query.lang as string;
    console.log('GET /tests/:testId - req.query:', req.query);

    const [test] = await db.select().from(tests).where(eq(tests.id, testId));
    if (!test) return res.status(404).json({ error: 'Test not found' });

    const qs = await db.select().from(questions).where(eq(questions.testId, testId));
    
    // If language is requested and it's not English
    if (lang && lang !== 'en') {
      console.log(`Translation requested for lang: ${lang}`);
      const { testTranslations } = await import('./schema.js');
      const { translateTestData } = await import('../src/lib/translate.js');
      
      try {
        const [existingTranslation] = await db.select().from(testTranslations)
          .where(and(eq(testTranslations.testId, testId), eq(testTranslations.language, lang)));
          
        if (existingTranslation) {
          console.log('Found existing translation');
          return res.json(existingTranslation.translatedData);
        } else {
          console.log('Translating on the fly with free translation...');
          const translatedData = await translateTestData({ test, questions: qs }, lang);
          
          await db.insert(testTranslations).values({
            testId,
            language: lang,
            translatedData
          });
          
          console.log('Translation saved');
          return res.json(translatedData);
        }
      } catch (translationErr: any) {
        console.error('Translation error, falling back to English:', translationErr.message);
        return res.json({ test, questions: qs, translationFailed: true });
      }
    }

    res.json({ test, questions: qs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sessions - Create session
router.post('/sessions', async (req, res) => {
  try {
    const { testId } = req.body;
    const testIdNum = parseInt(testId);
    const qs = await db.select().from(questions).where(eq(questions.testId, testIdNum));
    const [session] = await db.insert(sessions).values({
      testId: testIdNum,
      total: qs.length,
    }).returning();
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/sessions/:sessionId/complete - Complete session with answers
router.put('/sessions/:sessionId/complete', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const { answers, timeTakenSeconds } = req.body;

    const qs = await db.select().from(questions)
      .where(eq(questions.testId,
        (await db.select().from(sessions).where(eq(sessions.id, sessionId)))[0].testId
      ));

    const answerRows: typeof sessionAnswers.$inferInsert[] = answers.map((a: any) => {
      const q = qs.find((q) => q.id === a.questionId);
      const isCorrect = q ? q.correctAnswer === a.selectedAnswer : false;
      return {
        sessionId,
        questionId: a.questionId,
        selectedAnswer: a.selectedAnswer,
        isCorrect,
        timeTakenSeconds: a.timeTakenSeconds || 0,
      };
    });

    await db.insert(sessionAnswers).values(answerRows);

    const score = answerRows.filter((a) => a.isCorrect).length;

    const [updated] = await db.update(sessions)
      .set({ score, total: qs.length, timeTakenSeconds, completedAt: new Date() })
      .where(eq(sessions.id, sessionId))
      .returning();

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:sessionId/results - Get full results
router.get('/sessions/:sessionId/results', async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const lang = req.query.lang as string;
    const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    if (!session) return res.status(404).json({ error: 'Session not found' });

    let [test] = await db.select().from(tests).where(eq(tests.id, session.testId));
    let qs = await db.select().from(questions).where(eq(questions.testId, session.testId));
    const answers = await db.select().from(sessionAnswers).where(eq(sessionAnswers.sessionId, sessionId));

    // If language is requested and it's not English
    if (lang && lang !== 'en') {
      const { testTranslations } = await import('./schema.js');
      const { translateTestData } = await import('../src/lib/translate.js');
      
      try {
        const [existingTranslation] = await db.select().from(testTranslations)
          .where(and(eq(testTranslations.testId, session.testId), eq(testTranslations.language, lang)));
          
        if (existingTranslation) {
          test = (existingTranslation.translatedData as any).test;
          qs = (existingTranslation.translatedData as any).questions;
        } else {
          const translatedData = await translateTestData({ test, questions: qs }, lang);
          await db.insert(testTranslations).values({
            testId: session.testId,
            language: lang,
            translatedData
          });
          test = translatedData.test;
          qs = translatedData.questions;
        }
      } catch (translationErr: any) {
        console.error('Translation error in results, falling back to English:', translationErr.message);
      }
    }

    const enriched = qs.map((q) => {
      const ans = answers.find((a) => a.questionId === q.id);
      return {
        ...q,
        selectedAnswer: ans?.selectedAnswer ?? null,
        isCorrect: ans?.isCorrect ?? null,
        timeTakenSeconds: ans?.timeTakenSeconds ?? 0,
      };
    });

    res.json({ session, test, questions: enriched });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/discovery - List public tests
router.get('/discovery', async (req, res) => {
  try {
    const { category, search, page = '1' } = req.query as Record<string, string>;
    const pageNum = parseInt(page);
    const limit = 12;
    const offset = (pageNum - 1) * limit;

    const conditions = [];
    if (category && category !== 'All') {
      conditions.push(ilike(tests.examType, `%${category}%`));
    }
    if (search) {
      conditions.push(ilike(tests.topic, `%${search}%`));
    }

    const query = db.select().from(tests)
      .orderBy(desc(tests.createdAt))
      .limit(limit)
      .offset(offset);

    const results = conditions.length
      ? await db.select().from(tests).where(and(...conditions)).orderBy(desc(tests.createdAt)).limit(limit).offset(offset)
      : await query;

    res.json({ tests: results, page: pageNum });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/test-server', (req, res) => {
  res.json({ status: 'ok', message: 'Routes are running new code' });
});

export default router;
