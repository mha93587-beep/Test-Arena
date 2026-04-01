# Test Arena (testarena.ai)

AI-powered competitive exam preparation platform for SSC, Railway, UPSC, Banking, GATE, NEET and 50+ exams.

## Project Overview

Test Arena is a full-stack application where users paste a topic, upload a PDF/image, or share a URL, and Google Gemini AI generates editorial-grade mock exam questions. Users can take timed tests, get detailed results with accuracy analysis, and download PDF reports.

## Architecture

- **Backend**: Express.js + TypeScript served via `npx tsx server/index.ts`
- **Frontend**: React 18 + Vite (served as middleware in dev, static in prod)
- **Database**: Neon PostgreSQL via `@neondatabase/serverless` + Drizzle ORM
- **AI**: Google Gemini 2.5 Flash (`@google/generative-ai`)
- **SSR**: Vite SSR with fallback to SPA if SSR fails
- **Styling**: Tailwind CSS + shadcn/ui
- **Routing**: React Router v6 (wouter not used — react-router-dom is installed)
- **State**: TanStack React Query v5
- **Forms**: React Hook Form + Zod

## Key Features

- **AI Question Generator**: Paste topic → Gemini generates MCQs with explanations + hints
- **File Upload**: Upload PDF/image/URL → Gemini extracts content → generates questions
- **Dynamic Discovery**: Browse AI-generated tests shared publicly (paginated, searchable)
- **Test Arena**: Full exam interface with timer, navigator, answer feedback, explanations
- **Final Review**: Score ring, accuracy feed, time report, section breakdown, PDF download
- **Programmatic SEO**: `/exam/:slug` pages for 13+ exam types with JSON-LD structured data
- **Sitemap**: Dynamic XML sitemap at `/sitemap.xml`

## Workflow

```bash
npx tsx server/index.ts
```

Runs on port 5000. Express handles:
- `/api/*` — All API routes
- `/sitemap.xml` — Dynamic sitemap
- `/robots.txt` — Robots file  
- `/*` — Vite middleware (dev) or static files (prod) with SSR

## Environment Variables

- `NEON_DATABASE_URL` — Neon PostgreSQL connection string
- `GEMINI_API_KEY` — Google Gemini API key

## Project Structure

```
server/
  index.ts     - Express server with Vite SSR middleware
  db.ts        - Neon DB connection + initDb() (auto-creates tables)
  schema.ts    - Drizzle schema (tests, questions, sessions, session_answers)
  gemini.ts    - Gemini AI functions (generateQuestions, extractText)
  routes.ts    - All API routes (/api/generate, /api/tests, /api/sessions, /api/discovery)
  sitemap.ts   - Sitemap handler

src/
  App.tsx           - Root app with providers
  AppRoutes.tsx     - All routes
  entry-server.tsx  - SSR entry point (StaticRouter + HelmetProvider)
  main.tsx          - Client entry (hydrateRoot with SPA fallback)
  pages/
    Index.tsx        - Dashboard with AI prompt box + file upload
    Discovery.tsx    - Browse public tests (paginated, category filter)
    TestArena.tsx    - Exam interface with timer, navigator, feedback
    FinalReview.tsx  - Results with score ring, accuracy feed, PDF download
    ExamPage.tsx     - SEO pages for 13+ competitive exams
  components/
    TopNav.tsx       - Navigation with Test Arena branding
    Sidebar.tsx      - Exam library links
    Footer.tsx       - Footer with Test Arena branding
    Layout.tsx       - Root layout wrapper
```

## API Routes

- `POST /api/generate` — Generate AI questions (saves to DB, returns testId + sessionId)
- `POST /api/upload/file` — Extract text from PDF/image via Gemini
- `POST /api/upload/url` — Extract text from URL via Gemini
- `GET  /api/tests/:testId` — Get test + questions
- `POST /api/sessions` — Create new session
- `PUT  /api/sessions/:sessionId/complete` — Submit answers, compute score
- `GET  /api/sessions/:sessionId/results` — Get full results with enriched questions
- `GET  /api/discovery` — List public tests (paginated, category/search filters)

## Database Tables

- `tests` — title, topic, examType, difficulty, questionCount, isPublic, createdAt
- `questions` — testId, text, options (JSONB), correctAnswer, explanation, hint, section
- `sessions` — testId, score, total, timeTakenSeconds, completedAt
- `session_answers` — sessionId, questionId, selectedAnswer, isCorrect, timeTakenSeconds

## SEO Exam Pages (`/exam/:slug`)

Supported slugs: `ssc-cgl`, `ssc-chsl`, `railway-rrb-ntpc`, `railway-rrb-group-d`, `upsc-cse`, `upsc-csat`, `ibps-po`, `ibps-clerk`, `sbi-po`, `gate-cs`, `neet`, `jee-main`, `upsc-nda`, `ctet`
