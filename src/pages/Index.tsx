import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Sidebar from "@/components/Sidebar";
import { useToast } from "@/hooks/use-toast";
import { generateSlug } from "@/lib/utils";

const examTypes = [
  "SSC CGL", "SSC CHSL", "SSC MTS", "SSC GD", "SSC CPO",
  "Railway RRB NTPC", "Railway RRB Group D", "Railway RRB JE",
  "UPSC CSE", "UPSC CSAT", "UPSC NDA", "UPSC CDS",
  "IBPS PO", "IBPS Clerk", "SBI PO", "SBI Clerk", "RBI Grade B",
  "GATE CS", "UGC NET", "NEET", "JEE Main", "JEE Advanced",
  "CAT", "CLAT", "CTET", "NDA", "AFCAT",
  "BPSC", "UPPSC", "MPPSC", "RPSC",
];
const difficulties = ["Easy", "Medium", "Hard", "Scholar Level"];
const questionCounts = ["10 Questions", "20 Questions", "50 Questions", "Full Mock (100+)"];

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [prompt, setPrompt] = useState("");
  const [examType, setExamType] = useState("SSC CGL");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questionCount, setQuestionCount] = useState("20 Questions");
  const [isGenerating, setIsGenerating] = useState(false);
  const [extractedContent, setExtractedContent] = useState({ file: "", image: "", url: "" });
  const [urlInput, setUrlInput] = useState("");
  const [showUrlBox, setShowUrlBox] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "file" | "image") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    toast({ title: `Processing ${type === "file" ? "document" : "image"}...`, description: "Extracting content with Gemini AI" });
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload/file", { method: "POST", body: formData });
      const data = await res.json();
      if (data.content) {
        setExtractedContent((prev) => ({ ...prev, [type === "file" ? "file" : "image"]: data.content }));
        if (!prompt) setPrompt(data.content.substring(0, 200));
        toast({ title: "Content extracted!", description: "File content ready for question generation" });
      } else {
        toast({ title: "Extraction failed", variant: "destructive" });
      }
    } catch {
      toast({ title: "Upload failed", description: "Could not extract content from file", variant: "destructive" });
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) return;
    setIsUploading(true);
    toast({ title: "Fetching URL...", description: "Extracting content with AI" });
    try {
      const res = await fetch("/api/upload/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput }),
      });
      const data = await res.json();
      if (data.content) {
        setExtractedContent((prev) => ({ ...prev, url: data.content }));
        if (!prompt) setPrompt(data.content.substring(0, 200));
        setShowUrlBox(false);
        setUrlInput("");
        toast({ title: "URL content extracted!", description: "Ready to generate questions" });
      }
    } catch {
      toast({ title: "URL fetch failed", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerate = async () => {
    const hasInput = prompt.trim() || extractedContent.file || extractedContent.image || extractedContent.url;
    if (!hasInput) {
      toast({ title: "Enter a topic first", description: "Type a topic or upload a document/image/URL", variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          examType,
          difficulty,
          questionCount,
          fileContent: extractedContent.file,
          imageContent: extractedContent.image,
          urlContent: extractedContent.url,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");
      toast({ title: `${data.questionCount} questions generated!`, description: `${examType} · ${difficulty}` });
      navigate(`/test-arena/${generateSlug(data.title, data.testId)}`);
    } catch (err: any) {
      toast({ title: "Generation failed", description: err.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Test Arena – AI Question Generator for SSC, Railway, UPSC & More</title>
        <meta name="description" content="Generate AI-powered mock tests for SSC CGL, Railway NTPC, UPSC, Banking & 50+ exams. Paste a topic, upload a PDF, or share a URL for editorial-grade questions in seconds." />
        <meta property="og:title" content="Test Arena – AI Question Generator" />
        <meta property="og:description" content="Generate AI-powered mock tests for SSC, Railway, UPSC and 50+ competitive exams instantly at testarena.ai" />
        <meta property="og:url" content="https://testarena.ai" />
        <link rel="canonical" href="https://testarena.ai/" />
      </Helmet>
      <div className="flex min-h-[calc(100vh-72px)]">
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-4 md:p-8 bg-surface-bright">
          <section className="max-w-4xl mx-auto pt-6 md:pt-10 pb-8 md:pb-16">
            <div className="text-center mb-8 md:mb-10">
              <h1 className="font-headline text-3xl md:text-5xl font-extrabold tracking-tight text-on-surface mb-4">
                What will you <span className="text-primary">master</span> today?
              </h1>
              <p className="text-on-surface-variant text-base md:text-lg font-body max-w-xl mx-auto">
                Paste a topic, upload a syllabus, or share a URL. Test Arena AI crafts editorial-grade exam questions in seconds.
              </p>
            </div>

            {/* Prompt Box */}
            <div className="bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/20 transition-all focus-within:ring-2 focus-within:ring-primary/20 mb-6">
              <div className="p-4">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  data-testid="input-prompt"
                  className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-base md:text-lg font-body placeholder:text-on-surface-variant/40 resize-none h-28"
                  placeholder="Ask Test Arena to generate questions on Indian Polity, Quant, Data Structures or any topic..."
                />
                {(extractedContent.file || extractedContent.image || extractedContent.url) && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {extractedContent.file && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-secondary/10 text-secondary rounded-full text-xs font-medium">
                        <span className="material-symbols-outlined text-sm">description</span> Document loaded
                        <button onClick={() => setExtractedContent((p) => ({ ...p, file: "" }))} className="ml-1 hover:opacity-70">×</button>
                      </span>
                    )}
                    {extractedContent.image && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-tertiary/10 text-tertiary rounded-full text-xs font-medium">
                        <span className="material-symbols-outlined text-sm">image</span> Image loaded
                        <button onClick={() => setExtractedContent((p) => ({ ...p, image: "" }))} className="ml-1 hover:opacity-70">×</button>
                      </span>
                    )}
                    {extractedContent.url && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        <span className="material-symbols-outlined text-sm">link</span> URL loaded
                        <button onClick={() => setExtractedContent((p) => ({ ...p, url: "" }))} className="ml-1 hover:opacity-70">×</button>
                      </span>
                    )}
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-outline-variant/15">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input ref={fileInputRef} type="file" accept=".pdf,.txt,.doc,.docx" className="hidden" onChange={(e) => handleFileUpload(e, "file")} />
                    <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, "image")} />
                    <button
                      data-testid="btn-upload-pdf"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                      <span className="hidden sm:inline">Upload PDF</span>
                    </button>
                    <button
                      data-testid="btn-upload-image"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={isUploading}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm font-medium disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">image</span>
                      <span className="hidden sm:inline">Upload Image</span>
                    </button>
                    <button
                      data-testid="btn-insert-url"
                      onClick={() => setShowUrlBox(!showUrlBox)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm font-medium"
                    >
                      <span className="material-symbols-outlined text-[18px]">link</span>
                      <span className="hidden sm:inline">Insert URL</span>
                    </button>
                  </div>
                  <button
                    data-testid="btn-generate"
                    onClick={handleGenerate}
                    disabled={isGenerating || isUploading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                  >
                    {isGenerating ? (
                      <>
                        <span className="material-symbols-outlined text-lg animate-spin">refresh</span> Generating...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-lg filled">auto_awesome</span> Generate
                      </>
                    )}
                  </button>
                </div>
                {showUrlBox && (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      data-testid="input-url"
                      placeholder="https://example.com/syllabus"
                      className="flex-1 px-3 py-2 rounded-lg border border-outline-variant/30 bg-surface-container-low text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                    />
                    <button
                      onClick={handleUrlSubmit}
                      data-testid="btn-url-submit"
                      disabled={isUploading}
                      className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-60"
                    >
                      {isUploading ? "..." : "Fetch"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Exam Type</label>
                <select
                  value={examType}
                  data-testid="select-exam-type"
                  onChange={(e) => setExamType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                >
                  {examTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Difficulty</label>
                <select
                  value={difficulty}
                  data-testid="select-difficulty"
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                >
                  {difficulties.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">Question Count</label>
                <select
                  value={questionCount}
                  data-testid="select-question-count"
                  onChange={(e) => setQuestionCount(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
                >
                  {questionCounts.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Quick Start Cards */}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-widest text-on-surface-variant mb-3">Quick Start</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { color: "primary", icon: "school", exam: "SSC CGL", topic: "General Awareness for SSC CGL 2025", desc: "Current Affairs, Polity & History" },
                  { color: "secondary", icon: "train", exam: "Railway RRB NTPC", topic: "Railway NTPC General Science 2025", desc: "Physics, Chemistry & Biology" },
                  { color: "tertiary", icon: "account_balance", exam: "UPSC CSE", topic: "UPSC Prelims Indian Polity and Governance", desc: "Constitution, Acts & Policies" },
                ].map((card) => (
                  <button
                    key={card.exam}
                    data-testid={`card-quickstart-${card.exam}`}
                    onClick={() => { setExamType(card.exam); setPrompt(card.topic); }}
                    className={`text-left bg-${card.color}/5 border border-${card.color}/15 rounded-2xl p-4 cursor-pointer hover:bg-${card.color}/10 transition-colors group`}
                  >
                    <span className={`material-symbols-outlined text-${card.color} text-2xl filled mb-2 block`}>{card.icon}</span>
                    <h3 className="font-headline font-bold text-on-surface text-sm mb-0.5">{card.exam}</h3>
                    <p className="text-xs text-on-surface-variant">{card.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default Index;
