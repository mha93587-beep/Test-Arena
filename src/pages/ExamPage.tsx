import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useState } from "react";

interface ExamInfo {
  name: string;
  fullName: string;
  description: string;
  topics: string[];
  syllabus: string[];
  seoDesc: string;
  difficulty: string;
  questionTypes: string[];
}

const examData: Record<string, ExamInfo> = {
  "ssc-cgl": {
    name: "SSC CGL", fullName: "Staff Selection Commission Combined Graduate Level",
    description: "One of India's most competitive central government exams for Group B and C posts. Tests Quantitative Aptitude, General Intelligence, English and General Awareness.",
    topics: ["Quantitative Aptitude", "General Intelligence & Reasoning", "English Language", "General Awareness", "Statistics", "Finance & Accounting"],
    syllabus: ["Tier I: Reasoning, GK, Quant, English (100 Qs, 60 min)", "Tier II: Paper I-IV (MCQ+Descriptive)", "Tier III: Descriptive Paper", "Tier IV: Skill/Computer Test"],
    seoDesc: "Practice SSC CGL mock tests with AI-generated questions. Free Tier I & II preparation for Quantitative Aptitude, Reasoning, English and General Awareness.",
    difficulty: "Medium to Hard", questionTypes: ["MCQ", "Descriptive"],
  },
  "ssc-chsl": {
    name: "SSC CHSL", fullName: "Staff Selection Commission Combined Higher Secondary Level",
    description: "For candidates with 10+2 qualification seeking government positions like LDC, DEO, Postal Assistant and Court Clerk.",
    topics: ["General Intelligence", "English Language", "Quantitative Aptitude", "General Awareness"],
    syllabus: ["Tier I: 100 Questions, 60 Minutes", "Tier II: Descriptive Paper (Letter/Essay)", "Tier III: Skill Test/Typing Test"],
    seoDesc: "Free SSC CHSL mock tests with AI questions. Prepare for LDC, DEO posts with practice tests in Reasoning, English, Quant & GK.",
    difficulty: "Easy to Medium", questionTypes: ["MCQ", "Descriptive"],
  },
  "railway-rrb-ntpc": {
    name: "Railway RRB NTPC", fullName: "Railway Recruitment Board Non-Technical Popular Categories",
    description: "Recruitment for various non-technical posts in Indian Railways including Station Master, Traffic Assistant, Goods Guard and more.",
    topics: ["Mathematics", "General Intelligence & Reasoning", "General Awareness", "Current Affairs", "General Science"],
    syllabus: ["CBT 1: 100 Qs, 90 min (GK + Maths + Reasoning)", "CBT 2: 120 Qs, 90 min (Advanced)", "Typing/Skill Test (post-specific)"],
    seoDesc: "RRB NTPC free mock tests. Practice AI-generated questions for Mathematics, Reasoning and General Awareness for Railway exam preparation.",
    difficulty: "Medium", questionTypes: ["MCQ"],
  },
  "railway-rrb-group-d": {
    name: "Railway Group D", fullName: "Railway Recruitment Board Group D",
    description: "Entry-level recruitment for Track Maintainer, Helper, Porter and various Level 1 posts in Indian Railways.",
    topics: ["Mathematics", "General Intelligence & Reasoning", "General Science", "General Awareness & Current Affairs"],
    syllabus: ["CBT: 100 Questions, 90 Minutes", "Physical Efficiency Test (PET)", "Document Verification"],
    seoDesc: "Railway Group D mock tests free. Practice AI questions for Class 10 level Mathematics, Science, Reasoning and Current Affairs.",
    difficulty: "Easy to Medium", questionTypes: ["MCQ"],
  },
  "upsc-cse": {
    name: "UPSC CSE", fullName: "Union Public Service Commission Civil Services Examination",
    description: "India's most prestigious exam for IAS, IPS, IFS and other central services. Tests comprehensive knowledge of India and current affairs.",
    topics: ["Indian History & Culture", "Indian Polity & Governance", "Indian Geography", "Indian Economy", "Science & Technology", "Environment & Ecology", "Current Events", "International Relations"],
    syllabus: ["Prelims: GS Paper I + CSAT (200+200 marks)", "Mains: 9 Papers including Essay, GS I-IV, Optional", "Interview: 275 marks personality test"],
    seoDesc: "UPSC CSE free mock tests. AI-generated Prelims questions for Polity, History, Geography, Economy and Current Affairs preparation.",
    difficulty: "Hard to Scholar Level", questionTypes: ["MCQ", "Essay", "Analytical"],
  },
  "upsc-csat": {
    name: "UPSC CSAT", fullName: "UPSC Civil Services Aptitude Test",
    description: "Paper II of UPSC Prelims testing comprehension, logical reasoning, analytical ability and basic numeracy.",
    topics: ["Comprehension", "Interpersonal Skills", "Logical Reasoning", "Analytical Ability", "Decision Making", "General Mental Ability", "Data Interpretation", "Basic Numeracy"],
    syllabus: ["200 Marks, 2 hours, 80 Questions", "Qualifying paper (33% cutoff)", "Negative marking: 1/3"],
    seoDesc: "UPSC CSAT practice tests free. Master comprehension, reasoning and data interpretation with AI-generated mock questions.",
    difficulty: "Medium to Hard", questionTypes: ["MCQ"],
  },
  "ibps-po": {
    name: "IBPS PO", fullName: "Institute of Banking Personnel Selection Probationary Officer",
    description: "National level exam for Probationary Officer posts in public sector banks. Highly competitive with lakhs of aspirants.",
    topics: ["English Language", "Quantitative Aptitude", "Reasoning Ability", "Computer Knowledge", "General/Financial Awareness"],
    syllabus: ["Prelims: English + Quant + Reasoning (100 Qs, 60 min)", "Mains: 5 Sections + Descriptive (200+25 marks)", "Interview: 100 marks"],
    seoDesc: "IBPS PO free mock tests. Practice prelims and mains with AI questions for English, Quant, Reasoning and Banking Awareness.",
    difficulty: "Medium to Hard", questionTypes: ["MCQ", "Descriptive"],
  },
  "ibps-clerk": {
    name: "IBPS Clerk", fullName: "IBPS Clerk Recruitment",
    description: "Recruitment for clerical cadre in public sector banks across India. One of the most sought-after banking exams.",
    topics: ["English Language", "Numerical Ability", "Reasoning Ability", "General/Financial Awareness", "Computer Knowledge"],
    syllabus: ["Prelims: English + Numerical + Reasoning (100 Qs, 60 min)", "Mains: 5 Sections (200 Qs, 160 min)"],
    seoDesc: "IBPS Clerk mock tests free. AI-generated practice questions for Prelims and Mains preparation.",
    difficulty: "Easy to Medium", questionTypes: ["MCQ"],
  },
  "sbi-po": {
    name: "SBI PO", fullName: "State Bank of India Probationary Officer",
    description: "Prestigious recruitment for Probationary Officer posts at State Bank of India, India's largest public sector bank.",
    topics: ["English Language", "Data Analysis & Interpretation", "Reasoning & Computer Aptitude", "General/Economy/Banking Awareness"],
    syllabus: ["Prelims: 100 Qs, 60 min", "Mains: Objective (200 marks) + Descriptive (50 marks)", "Group Exercise & Interview"],
    seoDesc: "SBI PO free mock tests. AI practice questions for Prelims, Mains and interview preparation for SBI Probationary Officer.",
    difficulty: "Hard", questionTypes: ["MCQ", "Descriptive"],
  },
  "gate-cs": {
    name: "GATE CS", fullName: "Graduate Aptitude Test in Engineering – Computer Science",
    description: "National entrance exam for M.Tech admissions and PSU recruitment. Tests deep technical knowledge in Computer Science.",
    topics: ["Data Structures & Algorithms", "Operating Systems", "Database Management", "Computer Networks", "Theory of Computation", "Compiler Design", "Digital Logic", "Computer Organization"],
    syllabus: ["65 Questions, 100 Marks, 3 Hours", "General Aptitude: 10 questions (15 marks)", "CS Core: 55 questions (85 marks)", "Negative marking for MCQs"],
    seoDesc: "GATE CS free mock tests. AI-generated questions for Data Structures, OS, DBMS, Networks, TOC and all CS topics.",
    difficulty: "Hard to Scholar Level", questionTypes: ["MCQ", "Numerical"],
  },
  "neet": {
    name: "NEET", fullName: "National Eligibility cum Entrance Test",
    description: "India's single entrance exam for MBBS, BDS, AYUSH and nursing admissions. Conducted by NTA.",
    topics: ["Physics", "Chemistry (Organic, Inorganic, Physical)", "Biology (Botany & Zoology)"],
    syllabus: ["180 Questions, 720 Marks, 3 hours 20 min", "Physics: 45 Qs, Chemistry: 45 Qs, Biology: 90 Qs", "+4 for correct, -1 for wrong"],
    seoDesc: "NEET free mock tests. Practice AI-generated questions for Physics, Chemistry and Biology. Chapter-wise and full mock tests.",
    difficulty: "Hard", questionTypes: ["MCQ"],
  },
  "jee-main": {
    name: "JEE Main", fullName: "Joint Entrance Examination Main",
    description: "Gateway to NITs, IIITs and other CFTIs. Also a qualifier for JEE Advanced (IITs). Conducted by NTA twice a year.",
    topics: ["Physics", "Chemistry", "Mathematics"],
    syllabus: ["Paper 1 (B.Tech): 75 Qs, 300 marks, 3 hours", "MCQs and Numerical Answer Type questions", "Section A: MCQ (20 Qs), Section B: Numerical (10 Qs per subject)"],
    seoDesc: "JEE Main free mock tests. AI-generated Physics, Chemistry, Math practice questions with solutions and explanations.",
    difficulty: "Hard", questionTypes: ["MCQ", "Numerical"],
  },
  "upsc-nda": {
    name: "UPSC NDA", fullName: "National Defence Academy Examination",
    description: "Entry for Army, Navy and Air Force wings of National Defence Academy for class 12 pass students.",
    topics: ["Mathematics", "General Ability Test – English", "General Ability Test – General Knowledge", "Physics", "Chemistry", "History", "Geography", "Current Events"],
    syllabus: ["Mathematics: 120 Qs, 300 marks", "General Ability: 150 Qs, 600 marks", "SSB Interview: 900 marks"],
    seoDesc: "NDA free mock tests. AI-generated Mathematics and General Ability practice questions for UPSC NDA examination preparation.",
    difficulty: "Medium to Hard", questionTypes: ["MCQ"],
  },
  "ctet": {
    name: "CTET", fullName: "Central Teacher Eligibility Test",
    description: "Mandatory certification for central government school teachers. Tests teaching aptitude for Classes I-VIII.",
    topics: ["Child Development & Pedagogy", "Language I (English/Hindi)", "Language II", "Mathematics", "Environmental Studies / Science & Social Studies"],
    syllabus: ["Paper I (Class I-V): 150 Qs, 150 marks", "Paper II (Class VI-VIII): 150 Qs, 150 marks", "Minimum 60% required to qualify"],
    seoDesc: "CTET free mock tests. Practice Child Development, Pedagogy, Maths, EVS and Language papers with AI-generated questions.",
    difficulty: "Medium", questionTypes: ["MCQ"],
  },
};

const defaultExam: ExamInfo = {
  name: "Competitive Exam", fullName: "Competitive Examination",
  description: "Prepare for this competitive exam with AI-generated mock tests on Test Arena.",
  topics: ["General Knowledge", "Reasoning", "Mathematics", "English"],
  syllabus: ["Multiple sections covering core subjects", "MCQ and Descriptive formats"],
  seoDesc: "Free AI-powered mock tests for competitive exam preparation. Practice with thousands of questions.",
  difficulty: "Medium", questionTypes: ["MCQ"],
};

function slugToLabel(slug: string) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

const ExamPage = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [examType, setExamType] = useState("");

  const exam = examData[slug] || { ...defaultExam, name: slugToLabel(slug) };
  const title = `${exam.name} Mock Tests – Free AI Practice | Test Arena`;
  const canonicalUrl = `https://testarena.ai/exam/${slug}`;

  const handlePractice = (topic: string) => {
    navigate(`/?exam=${encodeURIComponent(exam.name)}&topic=${encodeURIComponent(topic)}`);
  };

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Course",
    "name": `${exam.name} Mock Tests`,
    "description": exam.seoDesc,
    "provider": {
      "@type": "Organization",
      "name": "Test Arena",
      "url": "https://testarena.ai",
    },
    "url": canonicalUrl,
    "educationalLevel": exam.difficulty,
    "about": exam.topics.map((t) => ({ "@type": "Thing", "name": t })),
  };

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={exam.seoDesc} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={exam.seoDesc} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={canonicalUrl} />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <main className="max-w-5xl mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-on-surface-variant mb-6">
          <a href="/" className="hover:text-primary">Home</a>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <a href="/discovery" className="hover:text-primary">Discovery</a>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-on-surface font-medium">{exam.name}</span>
        </nav>

        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-primary text-2xl filled">school</span>
            </div>
            <div>
              <h1 className="font-headline text-3xl md:text-4xl font-extrabold tracking-tight text-on-surface mb-1">
                {exam.name} Mock Tests
              </h1>
              <p className="text-on-surface-variant text-sm">{exam.fullName}</p>
            </div>
          </div>
          <p className="text-base text-on-surface-variant leading-relaxed max-w-3xl">{exam.description}</p>
        </div>

        {/* CTA */}
        <div className="bg-primary/5 border border-primary/15 rounded-2xl p-6 mb-8 flex flex-col sm:flex-row items-center gap-4">
          <div className="flex-1">
            <h2 className="font-headline font-bold text-lg text-on-surface mb-1">Start Practicing Now – Free</h2>
            <p className="text-sm text-on-surface-variant">AI generates {exam.name} questions instantly. No signup required.</p>
          </div>
          <button
            data-testid="btn-start-practice"
            onClick={() => navigate("/")}
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20 whitespace-nowrap"
          >
            <span className="material-symbols-outlined filled">auto_awesome</span>
            Generate {exam.name} Test
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Topics */}
          <div className="md:col-span-2 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-5">
            <h2 className="font-headline font-bold text-base mb-4 text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">menu_book</span>
              Topics Covered
            </h2>
            <div className="flex flex-wrap gap-2">
              {exam.topics.map((topic) => (
                <button
                  key={topic}
                  data-testid={`topic-${topic}`}
                  onClick={() => handlePractice(topic)}
                  className="px-3 py-1.5 rounded-full bg-primary/8 text-primary text-xs font-medium hover:bg-primary hover:text-white transition-colors cursor-pointer border border-primary/15"
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-5">
            <h2 className="font-headline font-bold text-base mb-4 text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-tertiary text-xl">analytics</span>
              Exam Details
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Difficulty</span>
                <span className="font-medium text-on-surface">{exam.difficulty}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Question Types</span>
                <span className="font-medium text-on-surface">{exam.questionTypes.join(", ")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Topics</span>
                <span className="font-medium text-on-surface">{exam.topics.length} subjects</span>
              </div>
            </div>
          </div>
        </div>

        {/* Syllabus */}
        <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-5 mb-8">
          <h2 className="font-headline font-bold text-base mb-4 text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-xl">checklist</span>
            Exam Pattern & Syllabus
          </h2>
          <ul className="space-y-2">
            {exam.syllabus.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-secondary text-sm mt-0.5 flex-shrink-0">check_circle</span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Practice by Topic */}
        <div className="mb-8">
          <h2 className="font-headline font-bold text-xl text-on-surface mb-4">Practice by Topic</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {exam.topics.map((topic) => (
              <button
                key={topic}
                data-testid={`practice-topic-${topic}`}
                onClick={() => handlePractice(topic)}
                className="flex items-center justify-between p-4 bg-surface-container-lowest border border-outline-variant/10 rounded-xl hover:border-primary/30 hover:bg-primary/3 transition-all group text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-sm filled">quiz</span>
                  </div>
                  <span className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors">{topic}</span>
                </div>
                <span className="material-symbols-outlined text-muted-foreground text-sm group-hover:text-primary transition-colors">arrow_forward</span>
              </button>
            ))}
          </div>
        </div>

        {/* SEO Content */}
        <div className="prose prose-sm max-w-none text-on-surface-variant">
          <h2 className="font-headline font-bold text-xl text-on-surface mb-3">Why Practice {exam.name} on Test Arena?</h2>
          <p>Test Arena uses Google Gemini AI to generate editorial-grade {exam.name} mock questions tailored to the latest exam pattern. Every question comes with detailed explanations and hints to help you understand concepts deeply, not just memorize answers.</p>
          <p className="mt-3">Our AI analyzes {exam.name} syllabi, past papers, and current trends to generate the most relevant practice questions. Whether you're a first-time aspirant or repeating the exam, Test Arena adapts to your needs with Easy, Medium, Hard, and Scholar Level difficulties.</p>
          <h3 className="font-headline font-bold text-base text-on-surface mt-4 mb-2">Features for {exam.name} Preparation</h3>
          <ul className="space-y-1">
            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-primary filled">check</span> Unlimited AI-generated {exam.name} practice questions</li>
            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-primary filled">check</span> Detailed explanations with every answer</li>
            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-primary filled">check</span> Time management reports and accuracy analysis</li>
            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-primary filled">check</span> Topic-wise practice for all {exam.topics.length} subjects</li>
            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-primary filled">check</span> Downloadable PDF results</li>
            <li className="flex items-center gap-2"><span className="material-symbols-outlined text-sm text-primary filled">check</span> Upload your syllabus PDF for custom questions</li>
          </ul>
        </div>
      </main>
    </>
  );
};

export default ExamPage;
