import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { extractIdFromSlug } from "@/lib/utils";

interface Option { label: string; text: string }
interface Question {
  id: number; text: string; options: Option[]; correctAnswer: string;
  explanation?: string; imageUrl?: string; hint?: string; section?: string;
}
interface TestData {
  test: { title: string; examType: string; difficulty: string };
  questions: Question[];
  translationFailed?: boolean;
}

const LANG_META: Record<string, { name: string; desc: string }> = {
  en: { name: 'English', desc: 'Take AI-generated mock tests in English.' },
  hi: { name: 'हिंदी', desc: 'हिंदी में AI-जनित मॉक टेस्ट दें।' },
  bn: { name: 'বাংলা', desc: 'বাংলায় AI-তৈরি মক টেস্ট দিন।' },
  te: { name: 'తెలుగు', desc: 'తెలుగులో AI-రూపొందించిన మాక్ టెస్ట్ తీసుకోండి.' },
  mr: { name: 'मराठी', desc: 'मराठीत AI-निर्मित मॉक टेस्ट द्या.' },
  ta: { name: 'தமிழ்', desc: 'தமிழில் AI உருவாக்கிய மாக் தேர்வு எழுதுங்கள்.' },
  ur: { name: 'اردو', desc: 'اردو میں AI سے تیار کردہ ماک ٹیسٹ دیں۔' },
  gu: { name: 'ગુજરાતી', desc: 'ગુજરાતીમાં AI-જનિત મૉક ટેસ્ટ આપો.' },
  kn: { name: 'ಕನ್ನಡ', desc: 'ಕನ್ನಡದಲ್ಲಿ AI ರಚಿಸಿದ ಮಾಕ್ ಟೆಸ್ಟ್ ತೆಗೆದುಕೊಳ್ಳಿ.' },
  ml: { name: 'മലയാളം', desc: 'മലയാളത്തിൽ AI നിർമ്മിത മോക്ക് ടെസ്റ്റ് എടുക്കൂ.' },
};

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'Hindi' },
  { code: 'bn', name: 'Bengali' },
  { code: 'te', name: 'Telugu' },
  { code: 'mr', name: 'Marathi' },
  { code: 'ta', name: 'Tamil' },
  { code: 'ur', name: 'Urdu' },
  { code: 'gu', name: 'Gujarati' },
  { code: 'kn', name: 'Kannada' },
  { code: 'ml', name: 'Malayalam' },
];

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TestArena = () => {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const testId = slug ? extractIdFromSlug(slug) : null;
  const lang = searchParams.get("lang") || "en";

  const handleLanguageChange = (newLang: string) => {
    setSearchParams({ lang: newLang });
  };

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, { selected: string; time: number }>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submittedQuestions, setSubmittedQuestions] = useState<Set<number>>(new Set());
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const { data, isLoading, error, isFetching } = useQuery<TestData>({
    queryKey: [`/api/tests/${testId}?lang=${lang}`],
    enabled: !!testId,
  });

  useEffect(() => {
    const interval = setInterval(() => setTotalSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Stop speech whenever question changes or on unmount
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [currentIndex]);

  useEffect(() => {
    return () => { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); };
  }, []);

  const SPEECH_LANG_MAP: Record<string, string> = {
    en: 'en-IN', hi: 'hi-IN', bn: 'bn-IN', te: 'te-IN',
    mr: 'mr-IN', ta: 'ta-IN', ur: 'ur-PK', gu: 'gu-IN',
    kn: 'kn-IN', ml: 'ml-IN',
  };

  const handleSpeak = useCallback(() => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const q = data?.questions[currentIndex];
    if (!q) return;
    const optionText = q.options.map((o) => `Option ${o.label}: ${o.text}`).join('. ');
    const fullText = `Question ${currentIndex + 1}. ${q.text}. ${optionText}`;
    const utterance = new SpeechSynthesisUtterance(fullText);
    utterance.lang = SPEECH_LANG_MAP[lang] || 'en-IN';
    utterance.rate = 0.88;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [isSpeaking, data, currentIndex, lang]);

  const handleSelect = useCallback((label: string) => {
    if (submitted) return;
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const q = data?.questions[currentIndex];
    if (!q) return;
    setAnswers((prev) => ({ ...prev, [q.id]: { selected: label, time: timeSpent } }));
  }, [submitted, questionStartTime, currentIndex, data]);

  const handleNext = useCallback(() => {
    if (!data) return;
    setSubmitted(false);
    setShowHint(false);
    setQuestionStartTime(Date.now());
    if (currentIndex < data.questions.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  }, [currentIndex, data]);

  const handleSubmitAnswer = useCallback(() => {
    const q = data?.questions[currentIndex];
    if (!q || !answers[q.id]) {
      toast({ title: "Select an answer first", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    setSubmittedQuestions((prev) => new Set(prev).add(q.id));
  }, [data, currentIndex, answers, toast]);

  const handleFinish = async () => {
    if (!data || !testId) {
      navigate("/review");
      return;
    }
    setIsSubmitting(true);
    try {
      // 1. Create session
      const sessionRes = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId })
      });
      if (!sessionRes.ok) throw new Error("Failed to create session");
      const session = await sessionRes.json();
      const newSessionId = session.id;

      // 2. Complete session
      const answerPayload = data.questions.map((q) => ({
        questionId: q.id,
        selectedAnswer: answers[q.id]?.selected || null,
        timeTakenSeconds: answers[q.id]?.time || 0,
      }));
      const completeRes = await fetch(`/api/sessions/${newSessionId}/complete`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answerPayload, timeTakenSeconds: totalSeconds }),
      });
      if (!completeRes.ok) throw new Error("Failed to save answers");
      navigate(`/review/${newSessionId}${lang !== 'en' ? `?lang=${lang}` : ''}`);
    } catch {
      toast({ title: "Failed to submit", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!testId) {
    return (
      <>
        <Helmet>
          <title>Test Arena – Take AI Mock Tests | Test Arena</title>
          <meta name="description" content="Take AI-generated mock tests for competitive exams. Start from the Dashboard by generating a test." />
        </Helmet>
        <div className="flex items-center justify-center min-h-[calc(100vh-72px)]">
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl text-muted-foreground mb-4 block">quiz</span>
            <h2 className="font-headline font-bold text-xl mb-2">No test selected</h2>
            <p className="text-on-surface-variant mb-4">Generate a test from the Dashboard first.</p>
            <button onClick={() => navigate("/")} className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90">
              Go to Dashboard
            </button>
          </div>
        </div>
      </>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)]">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin block mb-3">refresh</span>
          <p className="text-on-surface-variant font-medium">Loading your test...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)]">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-error block mb-3">error</span>
          <h2 className="font-headline font-bold text-xl mb-2">
            {error ? "Failed to load test" : "Test not found"}
          </h2>
          <p className="text-on-surface-variant mb-4 text-sm max-w-xs mx-auto">
            {error ? "There was a problem fetching this test. Please try again." : "This test could not be found."}
          </p>
          <button onClick={() => navigate("/")} className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:opacity-90 mt-2">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { test, questions } = data;
  const q = questions[currentIndex];
  const selectedAnswer = answers[q.id]?.selected || null;
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const answeredCount = Object.keys(answers).length;
  const isLastQuestion = currentIndex === questions.length - 1;

  const getOptionStyle = (opt: Option) => {
    if (!submitted) {
      return selectedAnswer === opt.label
        ? "bg-primary/8 border-2 border-primary"
        : "bg-surface-container-lowest border border-outline-variant/15 hover:bg-surface-container hover:shadow-sm";
    }
    if (opt.label === q.correctAnswer) return "bg-green-50 border-2 border-green-500";
    if (selectedAnswer === opt.label && opt.label !== q.correctAnswer) return "bg-error-container/20 border-2 border-error";
    return "bg-surface-container-lowest border border-outline-variant/15 opacity-60";
  };

  const getLetterStyle = (opt: Option) => {
    if (!submitted) {
      return selectedAnswer === opt.label ? "bg-primary text-white" : "bg-surface-container-high text-on-surface-variant";
    }
    if (opt.label === q.correctAnswer) return "bg-green-500 text-white";
    if (selectedAnswer === opt.label) return "bg-error text-white";
    return "bg-surface-container-high text-on-surface-variant";
  };

  const mins = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const secs = String(totalSeconds % 60).padStart(2, "0");

  const langMeta = LANG_META[lang] || LANG_META['en'];
  const metaDesc = `${test.title} | ${questions.length} ${test.difficulty} ${langMeta.desc}`;

  return (
    <>
      <Helmet>
        <html lang={lang} />
        <title>{`${test.title} – Test Arena | testarena.ai`}</title>
        <meta name="description" content={metaDesc} />
        <meta property="og:title" content={`${test.title} – Test Arena`} />
        <meta property="og:description" content={metaDesc} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`https://testarena.ai/test-arena/${slug}${lang !== 'en' ? `?lang=${lang}` : ''}`} />
        <link rel="canonical" href={`https://testarena.ai/test-arena/${slug}${lang !== 'en' ? `?lang=${lang}` : ''}`} />
        {LANGUAGES.map((l) => (
          <link
            key={l.code}
            rel="alternate"
            href={`https://testarena.ai/test-arena/${slug}${l.code !== 'en' ? `?lang=${l.code}` : ''}`}
            hrefLang={l.code}
          />
        ))}
        <link rel="alternate" href={`https://testarena.ai/test-arena/${slug}`} hrefLang="x-default" />
      </Helmet>
      <div className="min-h-[calc(100vh-72px)] flex flex-col relative">
        {isFetching && !isLoading && (
          <div className="absolute inset-0 bg-surface/50 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="bg-surface-container-high px-6 py-4 rounded-2xl shadow-lg flex items-center gap-3">
              <span className="material-symbols-outlined text-primary animate-spin">refresh</span>
              <span className="font-medium text-on-surface">Translating test...</span>
            </div>
          </div>
        )}
        {data.translationFailed && lang !== 'en' && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-amber-700 text-sm">
            <span className="material-symbols-outlined text-base">info</span>
            Translation unavailable for this language. Showing content in English.
          </div>
        )}
        {/* Context Header */}
        <div className="bg-surface-container-low px-4 md:px-8 py-3 flex justify-between items-center sticky top-[72px] z-40 border-b border-outline-variant/10">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary">quiz</span>
            <div>
              <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant">{test.examType} · {test.difficulty}</p>
              <h1 className="text-sm md:text-base font-headline font-bold text-on-surface line-clamp-1">{test.title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div>
              <Select value={lang} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-[100px] sm:w-[120px] h-8 text-xs bg-surface-container border-none">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.code} value={l.code} className="text-xs">
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 bg-surface-container px-3 py-1.5 rounded-lg">
              <span className="material-symbols-outlined text-sm text-muted-foreground">schedule</span>
              <span className="font-mono text-sm font-bold text-on-surface">{mins}:{secs}</span>
            </div>
            <span className="text-sm text-on-surface-variant font-medium">{currentIndex + 1} / {questions.length}</span>
          </div>
        </div>

        {/* Progress */}
        <div className="w-full h-1 bg-surface-container-low">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex-1 flex flex-col md:flex-row max-w-5xl mx-auto w-full p-4 md:p-8 gap-6">
          {/* Question */}
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">
                {q.section || "General"}
              </span>
              <span className="text-xs text-on-surface-variant">Multiple Choice</span>
            </div>

            {q.imageUrl && (
              <img src={q.imageUrl} alt="Question image" className="w-full max-h-48 object-cover rounded-xl mb-4" />
            )}

            <div className="flex items-start gap-3 mb-6">
              <h2 className="font-headline font-bold text-on-surface text-base md:text-lg leading-relaxed flex-1">
                Q{currentIndex + 1}. {q.text}
              </h2>
              <button
                onClick={handleSpeak}
                title={isSpeaking ? "Stop reading" : "Read question aloud"}
                className={`flex-shrink-0 mt-0.5 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm border ${
                  isSpeaking
                    ? "bg-primary text-white border-primary animate-pulse"
                    : "bg-surface-container text-primary border-primary/20 hover:bg-primary/10 hover:border-primary/50"
                }`}
              >
                <span className="material-symbols-outlined text-[20px] filled">
                  {isSpeaking ? "stop_circle" : "volume_up"}
                </span>
              </button>
            </div>

            <div className="space-y-3">
              {q.options.map((opt) => (
                <button
                  key={opt.label}
                  data-testid={`option-${opt.label}`}
                  onClick={() => handleSelect(opt.label)}
                  disabled={submitted}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all group ${getOptionStyle(opt)}`}
                >
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${getLetterStyle(opt)}`}>
                    {opt.label}
                  </span>
                  <span className="font-body text-sm md:text-base text-on-surface">{opt.text}</span>
                  {submitted && opt.label === q.correctAnswer && (
                    <span className="material-symbols-outlined text-green-500 ml-auto text-xl filled">check_circle</span>
                  )}
                  {submitted && selectedAnswer === opt.label && opt.label !== q.correctAnswer && (
                    <span className="material-symbols-outlined text-error ml-auto text-xl filled">cancel</span>
                  )}
                </button>
              ))}
            </div>

            {/* Explanation */}
            {submitted && q.explanation && (
              <div className="mt-5 p-4 bg-surface-container-low rounded-xl border-l-4 border-green-500">
                <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm filled">lightbulb</span> Editorial Explanation
                </p>
                <p className="text-sm text-on-surface-variant leading-relaxed">{q.explanation}</p>
              </div>
            )}

            {/* Hint */}
            {!submitted && q.hint && (
              <button
                onClick={() => setShowHint(!showHint)}
                className="mt-4 text-xs text-primary font-medium flex items-center gap-1 hover:underline"
              >
                <span className="material-symbols-outlined text-sm">tips_and_updates</span>
                {showHint ? "Hide hint" : "Show hint"}
              </button>
            )}
            {showHint && q.hint && (
              <p className="mt-2 p-3 bg-primary/5 rounded-lg text-sm text-on-surface-variant border border-primary/15">{q.hint}</p>
            )}
          </div>

          {/* Side Panel */}
          <div className="md:w-72 space-y-4">
            <div className="flex flex-col gap-2">
              {!submitted ? (
                <button
                  data-testid="btn-submit-answer"
                  onClick={handleSubmitAnswer}
                  disabled={!selectedAnswer}
                  className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Submit Answer
                </button>
              ) : (
                <button
                  data-testid="btn-next"
                  onClick={isLastQuestion ? handleFinish : handleNext}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <><span className="material-symbols-outlined animate-spin">refresh</span> Submitting...</>
                  ) : isLastQuestion ? (
                    <><span className="material-symbols-outlined filled">flag</span> Finish Test</>
                  ) : (
                    <>Next Question <span className="material-symbols-outlined">arrow_forward</span></>
                  )}
                </button>
              )}
              <button
                data-testid="btn-finish-early"
                onClick={handleFinish}
                disabled={isSubmitting}
                className="w-full py-2.5 bg-surface-container text-on-surface-variant font-medium text-sm rounded-xl hover:bg-surface-container-high transition-all"
              >
                End & Review ({answeredCount}/{questions.length})
              </button>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-4">
              <h3 className="font-headline font-bold text-sm mb-3 text-on-surface">Question Navigator</h3>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((_, i) => {
                  const qId = questions[i].id;
                  const isAnswered = !!answers[qId];
                  const isSubmitted = submittedQuestions.has(qId);
                  const isCorrect = isAnswered && answers[qId].selected === questions[i].correctAnswer;
                  
                  let btnClass = "bg-surface-container text-on-surface-variant";
                  if (i === currentIndex) {
                    btnClass = "bg-primary text-white";
                  } else if (isSubmitted) {
                    btnClass = isCorrect ? "bg-green-100 text-green-600" : "bg-error/20 text-error";
                  } else if (isAnswered) {
                    btnClass = "bg-primary/10 text-primary";
                  }

                  return (
                    <button
                      key={i}
                      data-testid={`nav-q-${i + 1}`}
                      onClick={() => { if (i < currentIndex + 1 || isSubmitted || isAnswered) { setSubmitted(submittedQuestions.has(qId)); setCurrentIndex(i); setShowHint(false); } }}
                      className={`aspect-square rounded-lg text-xs font-bold transition-colors ${btnClass}`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-on-surface-variant">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-green-100 inline-block" /> Correct</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-error/20 inline-block" /> Wrong</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-primary/10 inline-block" /> Answered</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-surface-container inline-block" /> Pending</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default TestArena;
