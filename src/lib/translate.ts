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

async function translateSingle(text: string, langCode: string): Promise<string> {
  if (!text?.trim()) return text;
  const query = text.length > 480 ? text.substring(0, 480) : text;
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(query)}&langpair=en|${langCode}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return text;
    const data = await res.json() as any;
    if (
      data.responseStatus === 200 &&
      data.responseData?.translatedText &&
      !data.responseData.translatedText.includes('MYMEMORY WARNING') &&
      !data.responseData.translatedText.includes('YOU USED ALL AVAILABLE FREE TRANSLATIONS')
    ) {
      return data.responseData.translatedText;
    }
    return text;
  } catch {
    return text;
  }
}

async function translateBatch(texts: string[], langCode: string): Promise<string[]> {
  const results: string[] = [];
  const CONCURRENCY = 6;
  for (let i = 0; i < texts.length; i += CONCURRENCY) {
    const chunk = texts.slice(i, i + CONCURRENCY);
    const chunkResults = await Promise.all(chunk.map((t) => translateSingle(t, langCode)));
    results.push(...chunkResults);
    if (i + CONCURRENCY < texts.length) {
      await new Promise((r) => setTimeout(r, 80));
    }
  }
  return results;
}

export async function translateTestData(
  testData: { test: any; questions: any[] },
  targetLangCode: string
): Promise<{ test: any; questions: any[] }> {
  const langCode = SUPPORTED_LANGS[targetLangCode];
  if (!langCode) throw new Error(`Language ${targetLangCode} not supported for free translation`);

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

  const translated = await translateBatch(toTranslate, langCode);

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
