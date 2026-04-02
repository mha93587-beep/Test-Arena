const SUPPORTED_LANGS: Record<string, string> = {
  hi: 'hi',
  bn: 'bn',
  te: 'te',
  mr: 'mr',
  ta: 'ta',
  ur: 'ur',
  gu: 'gu',
  kn: 'kn',
  ml: 'ml',
};

const SEP = ' ||| ';
const SEP_REGEX = /\s*\|{2,4}\s*/;
const MAX_CHUNK_CHARS = 3000;

async function translateBlock(text: string, langCode: string): Promise<string> {
  const url =
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${langCode}&dt=t&q=${encodeURIComponent(text)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) throw new Error(`Google Translate returned ${res.status}`);
  const data = await res.json() as any;
  return (data[0] as any[]).map((x: any) => x[0]).filter(Boolean).join('');
}

async function translateTexts(texts: string[], langCode: string): Promise<string[]> {
  const results: string[] = new Array(texts.length).fill('');

  type Batch = { indices: number[]; parts: string[] };
  const batches: Batch[] = [];
  let cur: Batch = { indices: [], parts: [] };
  let curLen = 0;

  for (let i = 0; i < texts.length; i++) {
    const t = (texts[i] || '').substring(0, 1000);
    const needed = t.length + SEP.length;
    if (curLen + needed > MAX_CHUNK_CHARS && cur.indices.length > 0) {
      batches.push(cur);
      cur = { indices: [i], parts: [t] };
      curLen = needed;
    } else {
      cur.indices.push(i);
      cur.parts.push(t);
      curLen += needed;
    }
  }
  if (cur.indices.length > 0) batches.push(cur);

  for (const batch of batches) {
    try {
      const combined = batch.parts.join(SEP);
      const translated = await translateBlock(combined, langCode);
      const parts = translated.split(SEP_REGEX);
      batch.indices.forEach((idx, j) => {
        results[idx] = parts[j]?.trim() || texts[idx];
      });
    } catch {
      batch.indices.forEach((idx) => { results[idx] = texts[idx]; });
    }
  }

  return results;
}

export async function translateTestData(
  testData: { test: any; questions: any[] },
  targetLangCode: string,
): Promise<{ test: any; questions: any[] }> {
  const langCode = SUPPORTED_LANGS[targetLangCode];
  if (!langCode) throw new Error(`Language ${targetLangCode} not supported`);

  const { test, questions } = testData;

  const toTranslate: string[] = [
    test.title || '',
    ...questions.flatMap((q: any) => [
      q.text || '',
      ...((q.options || []) as any[]).map((o: any) => o.text || ''),
      q.explanation || '',
      q.hint || '',
      q.section || '',
    ]),
  ];

  const translated = await translateTexts(toTranslate, langCode);

  let idx = 0;
  const translatedTest = { ...test, title: translated[idx++] };
  const translatedQuestions = questions.map((q: any) => ({
    ...q,
    text: translated[idx++],
    options: ((q.options || []) as any[]).map((o: any) => ({ ...o, text: translated[idx++] })),
    explanation: translated[idx++] || q.explanation,
    hint: translated[idx++] || q.hint,
    section: translated[idx++] || q.section,
  }));

  return { test: translatedTest, questions: translatedQuestions };
}

export function isLanguageSupported(langCode: string): boolean {
  return langCode in SUPPORTED_LANGS;
}
