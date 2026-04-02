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

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Gemini returned invalid JSON structure');

  const parsed = JSON.parse(jsonMatch[0]);
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

  const prompt = `You are an expert translator. Translate the following exam test data into ${targetLanguage}.
Maintain the exact JSON structure, only translating the text content (title, topic, question text, option texts, explanations, hints, sections).
Do NOT translate keys, IDs, or option labels (A, B, C, D).

Original JSON:
${JSON.stringify(testData)}

STRICT JSON FORMAT - respond ONLY with a valid JSON object matching the original structure:`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    const text = response.text?.trim() || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Gemini returned invalid JSON structure for translation');

    return JSON.parse(jsonMatch[0]);
  } catch (error: any) {
    console.error('Translation error:', error);
    throw error;
  }
}
