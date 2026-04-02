import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, desc, ilike, and } from 'drizzle-orm';
import { GoogleGenAI } from '@google/genai';
import {
  tests, questions, sessions, sessionAnswers, testTranslations,
} from '../server/schema';

export interface CfEnv {
  NEON_DATABASE_URL: string;
  GEMINI_API_KEY: string;
  ASSETS: Fetcher;
}

function getDb(env: CfEnv) {
  const sql = neon(env.NEON_DATABASE_URL);
  return drizzle(sql, { schema: { tests, questions, sessions, sessionAnswers, testTranslations } });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function generateQuestionsAI(
  env: CfEnv,
  topic: string,
  examType: string,
  difficulty: string,
  count: number,
  extra?: string,
) {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const difficultyDesc: Record<string, string> = {
    Easy: 'basic, straightforward questions suitable for beginners',
    Medium: 'moderate difficulty with application of concepts',
    Hard: 'advanced, analytical questions requiring deep understanding',
    'Scholar Level': 'exceptionally challenging, editorial-grade questions testing mastery',
  };

  const prompt = `You are an expert exam paper setter for ${examType} examination.
Generate exactly ${count} high-quality multiple choice questions at ${difficulty} difficulty (${difficultyDesc[difficulty] || 'moderate'}) on the topic: "${topic}".
${extra ? `Additional context: ${extra}` : ''}

STRICT JSON FORMAT - respond ONLY with a valid JSON array, no markdown, no explanation:
[
  {
    "text": "question text here",
    "options": [
      {"label": "A", "text": "option A text"},
      {"label": "B", "text": "option B text"},
      {"label": "C", "text": "option C text"},
      {"label": "D", "text": "option D text"}
    ],
    "correct_answer": "A",
    "explanation": "detailed explanation of why A is correct and why others are wrong",
    "section": "subject area e.g. General Awareness, Quantitative Aptitude, Reasoning",
    "hint": "a brief hint without giving away the answer"
  }
]

Requirements:
- All 4 options must be plausible and well-crafted
- Correct answer label must be A, B, C, or D
- Explanations must be educationally rich and detailed
- Questions must be appropriate for ${examType} examination standards
- Vary the correct answer position (not all A)`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });
  const text = response.text?.trim() || '';
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Gemini returned invalid JSON structure');
  const parsed = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) throw new Error('Expected array of questions');
  return parsed.slice(0, count);
}

async function translateTestAI(env: CfEnv, testData: unknown, targetLanguageCode: string) {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const langMap: Record<string, string> = {
    en: 'English', hi: 'Hindi', bn: 'Bengali', te: 'Telugu', mr: 'Marathi',
    ta: 'Tamil', ur: 'Urdu', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam',
  };
  const targetLanguage = langMap[targetLanguageCode] || targetLanguageCode;
  const prompt = `You are an expert translator. Translate the following exam test data into ${targetLanguage}.
Maintain the exact JSON structure, only translating the text content (title, topic, question text, option texts, explanations, hints, sections).
Do NOT translate keys, IDs, or option labels (A, B, C, D).

Original JSON:
${JSON.stringify(testData)}

STRICT JSON FORMAT - respond ONLY with a valid JSON object matching the original structure:`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });
  const text = response.text?.trim() || '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Gemini returned invalid JSON structure for translation');
  return JSON.parse(jsonMatch[0]);
}

async function extractTextFromBase64AI(env: CfEnv, base64: string, mimeType: string) {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: {
      parts: [
        { inlineData: { data: base64, mimeType } },
        { text: 'Extract all text from this document.' },
      ],
    },
  });
  return response.text || '';
}

async function extractTextFromUrlAI(env: CfEnv, url: string) {
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `Fetch and summarize the main educational content from this URL for exam preparation purposes: ${url}`,
  });
  return response.text || '';
}

export async function handleApiRequest(request: Request, env: CfEnv): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '');
  const method = request.method;
  const db = getDb(env);

  try {
    // POST /api/generate
    if (method === 'POST' && path === '/generate') {
      const body = await request.json() as any;
      const { prompt, examType, difficulty, questionCount, fileContent, imageContent, urlContent } = body;
      const countMatch = (questionCount || '20 Questions').match(/\d+/);
      const count = countMatch ? Math.min(parseInt(countMatch[0]), 50) : 20;
      let topic = prompt || '';
      let extra = '';
      if (urlContent) extra += `URL Content: ${urlContent}\n`;
      if (fileContent) extra += `Document Content: ${fileContent}\n`;
      if (imageContent) extra += `Image Content: ${imageContent}\n`;
      if (!topic && extra) topic = extra.substring(0, 200);
      if (!topic) return json({ error: 'Please provide a topic or upload content.' }, 400);

      const generatedQs = await generateQuestionsAI(env, topic, examType || 'General', difficulty || 'Medium', count, extra);
      const title = `${examType || 'General'} – ${topic.substring(0, 60)}`;

      const [test] = await db.insert(tests).values({
        title, topic: topic.substring(0, 500),
        examType: examType || 'General', difficulty: difficulty || 'Medium',
        questionCount: generatedQs.length, isPublic: true,
      }).returning();

      const questionRows = generatedQs.map((q: any) => ({
        testId: test.id, text: q.text, options: q.options,
        correctAnswer: q.correct_answer, explanation: q.explanation,
        section: q.section, hint: q.hint || null, imageUrl: null,
      }));
      await db.insert(questions).values(questionRows);
      return json({ testId: test.id, title, questionCount: generatedQs.length });
    }

    // POST /api/upload/file
    if (method === 'POST' && path === '/upload/file') {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      if (!file) return json({ error: 'No file provided' }, 400);
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const text = await extractTextFromBase64AI(env, base64, file.type);
      return json({ content: text });
    }

    // POST /api/upload/url
    if (method === 'POST' && path === '/upload/url') {
      const body = await request.json() as any;
      if (!body.url) return json({ error: 'URL is required' }, 400);
      const text = await extractTextFromUrlAI(env, body.url);
      return json({ content: text });
    }

    // GET /api/tests/:testId
    const testMatch = path.match(/^\/tests\/(\d+)$/);
    if (method === 'GET' && testMatch) {
      const testId = parseInt(testMatch[1]);
      const lang = url.searchParams.get('lang') || 'en';
      const [test] = await db.select().from(tests).where(eq(tests.id, testId));
      if (!test) return json({ error: 'Test not found' }, 404);
      const qs = await db.select().from(questions).where(eq(questions.testId, testId));

      if (lang && lang !== 'en') {
        const [existing] = await db.select().from(testTranslations)
          .where(and(eq(testTranslations.testId, testId), eq(testTranslations.language, lang)));
        if (existing) return json(existing.translatedData);
        const translated = await translateTestAI(env, { test, questions: qs }, lang);
        await db.insert(testTranslations).values({ testId, language: lang, translatedData: translated });
        return json(translated);
      }
      return json({ test, questions: qs });
    }

    // POST /api/sessions
    if (method === 'POST' && path === '/sessions') {
      const body = await request.json() as any;
      const testIdNum = parseInt(body.testId);
      const qs = await db.select().from(questions).where(eq(questions.testId, testIdNum));
      const [session] = await db.insert(sessions).values({ testId: testIdNum, total: qs.length }).returning();
      return json(session);
    }

    // PUT /api/sessions/:id/complete
    const completeMatch = path.match(/^\/sessions\/(\d+)\/complete$/);
    if (method === 'PUT' && completeMatch) {
      const sessionId = parseInt(completeMatch[1]);
      const body = await request.json() as any;
      const { answers, timeTakenSeconds } = body;
      const [sess] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
      const qs = await db.select().from(questions).where(eq(questions.testId, sess.testId));
      const answerRows = answers.map((a: any) => {
        const q = qs.find((q) => q.id === a.questionId);
        return {
          sessionId, questionId: a.questionId, selectedAnswer: a.selectedAnswer,
          isCorrect: q ? q.correctAnswer === a.selectedAnswer : false,
          timeTakenSeconds: a.timeTakenSeconds || 0,
        };
      });
      await db.insert(sessionAnswers).values(answerRows);
      const score = answerRows.filter((a: any) => a.isCorrect).length;
      const [updated] = await db.update(sessions)
        .set({ score, total: qs.length, timeTakenSeconds, completedAt: new Date() })
        .where(eq(sessions.id, sessionId)).returning();
      return json(updated);
    }

    // GET /api/sessions/:id/results
    const resultsMatch = path.match(/^\/sessions\/(\d+)\/results$/);
    if (method === 'GET' && resultsMatch) {
      const sessionId = parseInt(resultsMatch[1]);
      const lang = url.searchParams.get('lang') || 'en';
      const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
      if (!session) return json({ error: 'Session not found' }, 404);
      let [test] = await db.select().from(tests).where(eq(tests.id, session.testId));
      let qs = await db.select().from(questions).where(eq(questions.testId, session.testId));
      const ans = await db.select().from(sessionAnswers).where(eq(sessionAnswers.sessionId, sessionId));

      if (lang && lang !== 'en') {
        const [existing] = await db.select().from(testTranslations)
          .where(and(eq(testTranslations.testId, session.testId), eq(testTranslations.language, lang)));
        if (existing) {
          test = (existing.translatedData as any).test;
          qs = (existing.translatedData as any).questions;
        } else {
          const translated = await translateTestAI(env, { test, questions: qs }, lang);
          await db.insert(testTranslations).values({ testId: session.testId, language: lang, translatedData: translated });
          test = translated.test;
          qs = translated.questions;
        }
      }

      const enriched = qs.map((q) => {
        const a = ans.find((a) => a.questionId === q.id);
        return { ...q, selectedAnswer: a?.selectedAnswer ?? null, isCorrect: a?.isCorrect ?? null, timeTakenSeconds: a?.timeTakenSeconds ?? 0 };
      });
      return json({ session, test, questions: enriched });
    }

    // GET /api/discovery
    if (method === 'GET' && path === '/discovery') {
      const category = url.searchParams.get('category') || '';
      const search = url.searchParams.get('search') || '';
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = 12;
      const offset = (page - 1) * limit;
      const conditions = [];
      if (category && category !== 'All') conditions.push(ilike(tests.examType, `%${category}%`));
      if (search) conditions.push(ilike(tests.topic, `%${search}%`));
      const results = conditions.length
        ? await db.select().from(tests).where(and(...conditions)).orderBy(desc(tests.createdAt)).limit(limit).offset(offset)
        : await db.select().from(tests).orderBy(desc(tests.createdAt)).limit(limit).offset(offset);
      return json({ tests: results, page });
    }

    return json({ error: 'Not found' }, 404);
  } catch (err: any) {
    console.error('API error:', err);
    return json({ error: err.message || 'Internal server error' }, 500);
  }
}
