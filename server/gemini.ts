import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface GeneratedQuestion {
  text: string;
  options: { label: string; text: string }[];
  correct_answer: string;
  explanation: string;
  section: string;
  hint?: string;
}

function stripMarkdownAndParseJson(text: string): any {
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```(?:json|JSON)?\s*/m, '').replace(/\s*```\s*$/m, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {}
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try { return JSON.parse(objMatch[0]); } catch {}
  }
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try { return JSON.parse(arrMatch[0]); } catch {}
  }
  throw new Error('Could not parse JSON from Gemini response');
}

export async function generateQuestions(
  topic: string,
  examType: string,
  difficulty: string,
  count: number,
  extra?: string
): Promise<GeneratedQuestion[]> {
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
  const parsed = stripMarkdownAndParseJson(text);
  if (!Array.isArray(parsed)) throw new Error('Expected array of questions');
  return parsed.slice(0, count);
}

export async function extractTextFromBase64(base64: string, mimeType: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: {
      parts: [
        {
          inlineData: {
            data: base64,
            mimeType
          }
        },
        { text: "Extract all text from this document." }
      ]
    }
  });
  return response.text || '';
}

export async function extractTextFromUrl(url: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: `Fetch and summarize the main educational content from this URL for exam preparation purposes: ${url}`,
  });
  return response.text || '';
}

export async function translateTest(
  testData: any,
  targetLanguageCode: string
): Promise<any> {
  const langMap: Record<string, string> = {
    en: 'English', hi: 'Hindi', bn: 'Bengali', te: 'Telugu', mr: 'Marathi',
    ta: 'Tamil', ur: 'Urdu', gu: 'Gujarati', kn: 'Kannada', ml: 'Malayalam'
  };
  const targetLanguage = langMap[targetLanguageCode] || targetLanguageCode;

  const prompt = `You are an expert translator specializing in educational content.
Translate the following exam test data into ${targetLanguage}.

IMPORTANT RULES:
- Maintain the EXACT same JSON structure
- Only translate text values: title, topic, question text, option texts, explanations, hints, sections
- Do NOT add any language codes, suffixes like "(hi)" or "(${targetLanguageCode})" to translated text
- Do NOT translate: JSON keys, id fields, correctAnswer labels (A, B, C, D)
- Do NOT add markdown, code blocks, or any explanation outside the JSON
- Respond with ONLY a valid JSON object

Original JSON:
${JSON.stringify(testData)}

Respond with ONLY the translated JSON object:`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });
  const text = response.text?.trim() || '';
  return stripMarkdownAndParseJson(text);
}
