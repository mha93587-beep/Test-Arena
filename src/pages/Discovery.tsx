import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { generateSlug } from "@/lib/utils";

const categories = ["All", "SSC", "Railway", "UPSC", "Banking", "Defence", "GATE", "NEET", "State PSC", "Teaching"];

const difficultyColor: Record<string, string> = {
  Easy: "bg-green-100 text-green-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Hard: "bg-red-100 text-red-800",
  "Scholar Level": "bg-purple-100 text-purple-800",
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const Discovery = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  const params = new URLSearchParams({ page: String(page) });
  if (activeCategory !== "All") params.set("category", activeCategory);
  if (searchQuery) params.set("search", searchQuery);

  const { data, isLoading } = useQuery<{ tests: any[]; page: number }>({
    queryKey: [`/api/discovery?${params.toString()}`],
    staleTime: 30000,
  });

  const tests = data?.tests || [];

  return (
    <>
      <Helmet>
        <title>Discovery – Browse AI-Generated Mock Tests | Test Arena</title>
        <meta name="description" content="Explore AI-generated mock tests for SSC, Railway, UPSC, Banking, GATE, NEET and 50+ competitive exams. Practice community-created question sets for free at testarena.ai." />
        <meta property="og:title" content="Discovery – Browse Mock Tests | Test Arena" />
        <meta property="og:description" content="Browse thousands of AI-generated mock tests across all competitive exams." />
        <link rel="canonical" href="https://testarena.ai/discovery" />
      </Helmet>
      <main className="flex-1 p-4 md:p-8 bg-surface-bright min-h-[calc(100vh-72px)]">
        <section className="max-w-6xl mx-auto pt-4 md:pt-8 pb-6">
          <div className="text-center mb-6 md:mb-8">
            <h1 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-3">
              Global <span className="text-primary">Discovery</span>
            </h1>
            <p className="text-on-surface-variant text-base font-body max-w-2xl mx-auto">
              Browse AI-generated mock tests shared by the community. Filter by exam type and dive in instantly.
            </p>
          </div>

          {/* Search */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-muted-foreground text-xl">search</span>
              <input
                type="text"
                value={searchQuery}
                data-testid="input-discovery-search"
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                placeholder="Search tests by topic, exam, or keyword..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 flex-wrap mb-6">
            {categories.map((cat) => (
              <button
                key={cat}
                data-testid={`tab-category-${cat}`}
                onClick={() => { setActiveCategory(cat); setPage(1); }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-5 animate-pulse">
                  <div className="h-4 bg-surface-container rounded mb-3 w-1/3" />
                  <div className="h-5 bg-surface-container rounded mb-2" />
                  <div className="h-4 bg-surface-container rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : tests.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tests.map((item) => (
                <Link
                  key={item.id}
                  to={`/test-arena/${generateSlug(item.title, item.id)}`}
                  data-testid={`card-test-${item.id}`}
                  className="group bg-surface-container-lowest border border-outline-variant/10 rounded-xl p-5 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all cursor-pointer flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest">
                      {item.examType}
                    </span>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${difficultyColor[item.difficulty] || "bg-gray-100 text-gray-700"}`}>
                      {item.difficulty}
                    </span>
                  </div>
                  <h3 className="font-headline font-bold text-on-surface text-base leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-on-surface-variant text-xs mb-4">{item.questionCount} Questions</p>
                  <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-bold">
                        AI
                      </div>
                      <span>Test Arena AI</span>
                    </div>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-5xl text-muted-foreground mb-4 block">search_off</span>
              <p className="text-on-surface-variant font-medium">No tests found yet.</p>
              <p className="text-sm text-muted-foreground mt-1">Generate your first test from the Dashboard!</p>
            </div>
          )}

          {/* Pagination */}
          {tests.length === 12 && (
            <div className="flex justify-center mt-8 gap-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded-lg bg-surface-container text-on-surface-variant text-sm font-medium disabled:opacity-40 hover:bg-surface-container-high transition-colors"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-sm text-on-surface-variant">Page {page}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
};

export default Discovery;
