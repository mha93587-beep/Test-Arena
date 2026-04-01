import { useState, useRef } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ReviewQuestion {
  id: number; text: string; options: { label: string; text: string }[];
  correctAnswer: string; explanation?: string; section?: string;
  selectedAnswer: string | null; isCorrect: boolean | null; timeTakenSeconds: number;
}
interface ReviewData {
  session: { id: number; score: number; total: number; timeTakenSeconds: number; completedAt: string };
  test: { title: string; examType: string; difficulty: string };
  questions: ReviewQuestion[];
}

const FinalReview = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const reviewRef = useRef<HTMLDivElement>(null);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const lang = searchParams.get("lang") || "en";

  const { data, isLoading } = useQuery<ReviewData>({
    queryKey: [`/api/sessions/${sessionId}/results?lang=${lang}`],
    enabled: !!sessionId && sessionId !== "new",
  });

  const handleDownloadPDF = async () => {
    setIsDownloading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");
      const el = reviewRef.current;
      if (!el) return;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = (canvas.height * pdfW) / canvas.width;
      let remaining = pdfH;
      let position = 0;
      const pageH = pdf.internal.pageSize.getHeight();
      while (remaining > 0) {
        pdf.addImage(imgData, "JPEG", 0, -position, pdfW, pdfH);
        remaining -= pageH;
        position += pageH;
        if (remaining > 0) pdf.addPage();
      }
      const fileName = data?.test?.title
        ? `${data.test.title.replace(/[^a-z0-9]/gi, "_").substring(0, 40)}_review.pdf`
        : "test_arena_review.pdf";
      pdf.save(fileName);
      toast({ title: "PDF downloaded!", description: "Your review report is saved." });
    } catch (err) {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)]">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-primary animate-spin block mb-3">refresh</span>
          <p className="text-on-surface-variant">Loading your results...</p>
        </div>
      </div>
    );
  }

  if (!data && sessionId && sessionId !== "new") {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-72px)]">
        <div className="text-center">
          <span className="material-symbols-outlined text-5xl text-muted-foreground block mb-3">quiz</span>
          <h2 className="font-headline font-bold text-xl mb-2">No results found</h2>
          <button onClick={() => navigate("/")} className="px-6 py-3 bg-primary text-white rounded-xl font-bold mt-2">Dashboard</button>
        </div>
      </div>
    );
  }

  const score = data?.session?.score ?? 0;
  const total = data?.session?.total ?? 0;
  const timeTaken = data?.session?.timeTakenSeconds ?? 0;
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;
  const circumference = 2 * Math.PI * 88;
  const offset = circumference - (accuracy / 100) * circumference;

  const wrongCount = total - score;
  const avgTimePerQ = total > 0 ? Math.round(timeTaken / total) : 0;
  const mins = Math.floor(timeTaken / 60);
  const secs = timeTaken % 60;

  const bySection: Record<string, { correct: number; total: number }> = {};
  (data?.questions || []).forEach((q) => {
    const sec = q.section || "General";
    if (!bySection[sec]) bySection[sec] = { correct: 0, total: 0 };
    bySection[sec].total++;
    if (q.isCorrect) bySection[sec].correct++;
  });

  const performanceLabel = accuracy >= 80 ? "Excellent" : accuracy >= 60 ? "Good" : accuracy >= 40 ? "Average" : "Needs Improvement";
  const performanceColor = accuracy >= 80 ? "text-secondary" : accuracy >= 60 ? "text-primary" : accuracy >= 40 ? "text-yellow-600" : "text-error";

  return (
    <>
      <Helmet>
        <title>{data ? `${data.test.title} – Results | Test Arena` : "Test Results | Test Arena"}</title>
        <meta name="description" content={data ? `You scored ${score}/${total} (${accuracy}%) in ${data.test.title}. Review detailed analysis and explanations.` : "View your test results on Test Arena."} />
        <link rel="canonical" href={`https://testarena.ai/review/${sessionId}`} />
      </Helmet>
      <div className="flex">
        <Sidebar />
        <main className="lg:ml-64 w-full p-4 md:p-8 min-h-screen" ref={reviewRef}>
          <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div className="space-y-2">
                <span className="inline-flex items-center px-3 py-1 bg-tertiary-fixed text-on-tertiary-container text-[10px] font-bold uppercase tracking-widest rounded-full">
                  Post-Exam Analysis
                </span>
                <h1 className="text-3xl md:text-4xl font-black font-headline text-on-surface tracking-tight">
                  {data?.test?.title || "Test Results"}
                </h1>
                <p className="text-on-surface-variant text-sm">
                  {data?.test?.examType} · {data?.test?.difficulty} · {total} Questions
                  {data?.session?.completedAt && ` · ${new Date(data.session.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                </p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button
                  data-testid="btn-download-pdf"
                  onClick={handleDownloadPDF}
                  disabled={isDownloading}
                  className="flex-1 md:flex-none px-4 md:px-6 py-3 rounded-xl bg-surface-container-high font-bold text-sm hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <span className="material-symbols-outlined text-lg">{isDownloading ? "hourglass_empty" : "download"}</span>
                  {isDownloading ? "Generating..." : "Download PDF"}
                </button>
                <button
                  data-testid="btn-retake"
                  onClick={() => navigate("/")}
                  className="flex-1 md:flex-none px-4 md:px-6 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-lg">add</span> New Test
                </button>
              </div>
            </div>

            {/* Score Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
              {/* Score Ring */}
              <div className="md:col-span-4 bg-surface-container-lowest rounded-2xl p-6 md:p-8 flex flex-col items-center justify-center relative overflow-hidden border border-outline-variant/10">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <span className="material-symbols-outlined text-8xl filled">military_tech</span>
                </div>
                <div className="relative w-36 h-36 md:w-44 md:h-44 mb-4">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 192 192">
                    <circle className="text-surface-container-low" cx="96" cy="96" fill="transparent" r="88" stroke="currentColor" strokeWidth="12" />
                    <circle
                      className={accuracy >= 60 ? "text-secondary" : "text-primary"}
                      cx="96" cy="96" fill="transparent" r="88" stroke="currentColor"
                      strokeWidth="12" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl md:text-5xl font-black font-headline text-on-surface">
                      {score}<span className="text-xl md:text-2xl text-on-surface-variant">/{total}</span>
                    </span>
                    <span className="text-xs uppercase tracking-widest font-bold text-primary mt-1">{accuracy}% Correct</span>
                  </div>
                </div>
                <h3 className={`text-lg font-bold font-headline ${performanceColor}`}>{performanceLabel}</h3>
                <p className="text-sm text-on-surface-variant text-center mt-1">
                  {accuracy >= 80 ? "Top 10% of candidates today." : accuracy >= 60 ? "Above average performance!" : "Keep practicing to improve!"}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="md:col-span-8 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: "check_circle", label: "Correct", value: score, color: "text-secondary", bg: "bg-secondary/10" },
                  { icon: "cancel", label: "Incorrect", value: wrongCount, color: "text-error", bg: "bg-error/10" },
                  { icon: "schedule", label: "Time Taken", value: `${mins}m ${secs}s`, color: "text-primary", bg: "bg-primary/10" },
                  { icon: "speed", label: "Avg/Question", value: `${avgTimePerQ}s`, color: "text-tertiary", bg: "bg-tertiary/10" },
                ].map((stat) => (
                  <div key={stat.label} className={`${stat.bg} rounded-2xl p-4 border border-outline-variant/5 flex flex-col items-center justify-center text-center`}>
                    <span className={`material-symbols-outlined text-2xl filled ${stat.color} mb-2`}>{stat.icon}</span>
                    <p className="text-2xl font-black font-headline text-on-surface" data-testid={`stat-${stat.label.toLowerCase().replace(/\//g, "-")}`}>{stat.value}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5">{stat.label}</p>
                  </div>
                ))}

                {/* Section Breakdown */}
                {Object.keys(bySection).length > 0 && (
                  <div className="col-span-2 sm:col-span-4 md:col-span-2 lg:col-span-4 bg-surface-container-lowest rounded-2xl p-4 border border-outline-variant/10">
                    <h3 className="font-headline font-bold text-sm mb-3 text-on-surface">Section Breakdown</h3>
                    <div className="space-y-2">
                      {Object.entries(bySection).map(([sec, { correct, total: tot }]) => {
                        const pct = tot > 0 ? Math.round((correct / tot) * 100) : 0;
                        return (
                          <div key={sec}>
                            <div className="flex justify-between items-center text-xs mb-1">
                              <span className="text-on-surface-variant font-medium">{sec}</span>
                              <span className="font-bold text-on-surface">{correct}/{tot} ({pct}%)</span>
                            </div>
                            <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${pct >= 60 ? "bg-secondary" : "bg-primary"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Accuracy Feed */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-outline-variant/10">
                <h2 className="font-headline font-bold text-lg text-on-surface">Accuracy Feed</h2>
                <p className="text-sm text-on-surface-variant mt-0.5">Visual timeline of your answers across the test</p>
              </div>
              <div className="p-4 md:p-6">
                <div className="flex flex-wrap gap-2">
                  {(data?.questions || []).map((q, i) => (
                    <div
                      key={q.id}
                      data-testid={`accuracy-dot-${i + 1}`}
                      title={`Q${i + 1}: ${q.isCorrect ? "Correct" : q.selectedAnswer ? "Wrong" : "Skipped"} (${q.timeTakenSeconds}s)`}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer transition-transform hover:scale-110 ${
                        q.isCorrect ? "bg-secondary/20 text-secondary border border-secondary/30"
                          : q.selectedAnswer ? "bg-error/20 text-error border border-error/30"
                            : "bg-surface-container text-on-surface-variant border border-outline-variant/20"
                      }`}
                      onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-4 text-xs text-on-surface-variant">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-secondary/20 border border-secondary/30 inline-block" /> Correct</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-error/20 border border-error/30 inline-block" /> Wrong</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-surface-container border border-outline-variant/20 inline-block" /> Skipped</span>
                </div>
              </div>
            </div>

            {/* Time Manageability Report */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-outline-variant/10">
                <h2 className="font-headline font-bold text-lg text-on-surface">Time Manageability Report</h2>
                <p className="text-sm text-on-surface-variant mt-0.5">How you distributed time across questions</p>
              </div>
              <div className="p-4 md:p-6">
                <div className="space-y-2">
                  {(data?.questions || []).slice(0, 15).map((q, i) => {
                    const maxTime = Math.max(...(data?.questions || []).map((q) => q.timeTakenSeconds), 1);
                    const pct = maxTime > 0 ? (q.timeTakenSeconds / maxTime) * 100 : 0;
                    return (
                      <div key={q.id} className="flex items-center gap-3">
                        <span className="text-xs text-on-surface-variant w-8 text-right flex-shrink-0">Q{i + 1}</span>
                        <div className="flex-1 h-6 bg-surface-container rounded-lg overflow-hidden relative">
                          <div
                            className={`h-full rounded-lg transition-all ${q.isCorrect ? "bg-secondary/40" : q.selectedAnswer ? "bg-error/40" : "bg-surface-container-high"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-on-surface-variant w-10 flex-shrink-0">{q.timeTakenSeconds}s</span>
                      </div>
                    );
                  })}
                  {(data?.questions || []).length > 15 && (
                    <p className="text-xs text-on-surface-variant text-center pt-2">Showing first 15 questions</p>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Review */}
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
              <div className="p-4 md:p-6 border-b border-outline-variant/10">
                <h2 className="font-headline font-bold text-lg text-on-surface">Detailed Question Review</h2>
                <p className="text-sm text-on-surface-variant mt-0.5">Click each question to see full explanation</p>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {(data?.questions || []).map((q, i) => (
                  <div
                    key={q.id}
                    data-testid={`review-q-${i + 1}`}
                    className="p-4 md:p-6 cursor-pointer hover:bg-surface-container/30 transition-colors"
                    onClick={() => setExpandedQ(expandedQ === q.id ? null : q.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        q.isCorrect ? "bg-secondary/20 text-secondary" : q.selectedAnswer ? "bg-error/20 text-error" : "bg-surface-container text-on-surface-variant"
                      }`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-medium text-on-surface-variant">{q.section || "General"}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{q.timeTakenSeconds}s</span>
                            <span className="material-symbols-outlined text-sm">{expandedQ === q.id ? "expand_less" : "expand_more"}</span>
                          </div>
                        </div>
                        <p className="text-sm font-medium text-on-surface line-clamp-2">{q.text}</p>
                        {q.selectedAnswer && (
                          <div className="flex items-center gap-3 mt-2 text-xs">
                            <span className={`flex items-center gap-1 ${q.isCorrect ? "text-secondary" : "text-error"}`}>
                              <span className="material-symbols-outlined text-sm filled">{q.isCorrect ? "check_circle" : "cancel"}</span>
                              Your answer: ({q.selectedAnswer}) {q.options.find((o) => o.label === q.selectedAnswer)?.text}
                            </span>
                          </div>
                        )}
                        {!q.isCorrect && q.correctAnswer && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-secondary">
                            <span className="material-symbols-outlined text-sm filled">check_circle</span>
                            Correct: ({q.correctAnswer}) {q.options.find((o) => o.label === q.correctAnswer)?.text}
                          </div>
                        )}
                      </div>
                    </div>

                    {expandedQ === q.id && (
                      <div className="mt-4 ml-11 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {q.options.map((opt) => (
                            <div
                              key={opt.label}
                              className={`flex items-center gap-2 p-2.5 rounded-lg text-xs ${
                                opt.label === q.correctAnswer
                                  ? "bg-secondary/10 border border-secondary/30 text-on-surface"
                                  : q.selectedAnswer === opt.label && opt.label !== q.correctAnswer
                                    ? "bg-error/10 border border-error/30 text-on-surface"
                                    : "bg-surface-container text-on-surface-variant"
                              }`}
                            >
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                                opt.label === q.correctAnswer ? "bg-secondary text-white"
                                  : q.selectedAnswer === opt.label ? "bg-error text-white"
                                    : "bg-surface-container-high text-on-surface-variant"
                              }`}>{opt.label}</span>
                              {opt.text}
                            </div>
                          ))}
                        </div>
                        {q.explanation && (
                          <div className="p-3 bg-primary/5 rounded-lg border-l-3 border-primary">
                            <p className="text-xs font-bold text-primary mb-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm filled">lightbulb</span> Explanation
                            </p>
                            <p className="text-xs text-on-surface-variant leading-relaxed">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-6 bg-primary/5 rounded-2xl border border-primary/15">
              <div className="text-center md:text-left">
                <h4 className="font-headline font-bold text-lg text-on-surface">Ready to improve?</h4>
                <p className="text-sm text-on-surface-variant">Generate a new test tailored to your weak areas.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => navigate("/")} className="px-6 py-3 rounded-xl bg-surface-container-lowest font-bold text-primary hover:bg-white shadow-sm transition-all text-sm">
                  Dashboard
                </button>
                <button onClick={() => navigate("/discovery")} className="px-6 py-3 rounded-xl bg-primary text-white font-bold hover:opacity-90 shadow-lg transition-all text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined">explore</span> Discovery
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default FinalReview;
