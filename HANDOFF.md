**Current Active Agent:** Gemini (Planning/Review Mode)
**Last Completed Prompt:** `prompts/06_gitignore_setup.md` ✅ (Manual Gemini Override)
**Next Pending Prompt:** *(waiting for next task)*

---

## Prompt 01 — UI Redesign ✅ COMPLETE

**Completed:** 2026-04-02

### What was done:
1. **CSS Overhaul (Step 1):** Rewrote `index.css` — removed all light-mode references, implemented Matte Dark / Color-Blocked aesthetic. Root background set to `#18181B` (zinc-900). Added CSS variables for verified (Emerald), partial (Amber), overclaim (Coral) states. Configured `Outfit` + `Space Grotesk` for headings, `Inter` for body. Cleared legacy `App.css`.

2. **Resume Input Page (Step 2):** Completely rewrote `SkillInputPage.jsx` — removed manual search and "Add Custom Skill" forms. Replaced with a large centered `<textarea>` pre-filled with default resume string. Added "Extract Claims" button that mock-extracts to hardcoded React(Expert), SQL(Beginner), Docker(Beginner). Uses `framer-motion` for card snap animations.

3. **Demo Mode Removal (Step 3):** Removed all `demoMode` toggles, variables, and logic from `AppShell.jsx`. Updated Zustand store (`useSkillProofStore.js`) — removed `demoMode`, `setDemoMode`, and `demoClaims` imports. Added `setClaims` action. Store now initializes with empty claims.

4. **Verification (Step 4):** Dev server runs cleanly (`npm run dev`). App boots in dark theme with resume paste textarea and working mock extraction. `framer-motion` installed. No console errors.

### Files Modified:
- `frontend/src/index.css` — Complete rewrite (dark theme tokens)
- `frontend/src/App.css` — Cleared legacy styles
- `frontend/src/app/AppShell.jsx` — Removed demoMode, dark theme
- `frontend/src/pages/SkillInputPage.jsx` — Complete rewrite (resume textarea)
- `frontend/src/state/useSkillProofStore.js` — Removed demoMode, added setClaims
- `frontend/index.html` — Updated meta, title, font preconnects

### Dependencies Added:
- `framer-motion` (for micro-animations per CLAUDE.md directive)

---

## Prompt 02 — Data Layer & Backend ✅ COMPLETE

**Completed:** 2026-04-02

### What was done:

1. **FastAPI Scaffolding (Step 1):**
   - Created `backend/` directory with `main.py` entry point
   - FastAPI app with CORS middleware accepting requests from Vite frontend (ports 5173, 5174)
   - `GET /api/health` → returns `{ status: "ok", service: "skillproof-api" }`
   - Python venv at `backend/venv/` with `requirements.txt` (fastapi, uvicorn[standard])

2. **Core JSON Data Files (Step 2):**
   - `backend/data/taxonomy.json` — 34 alias→canonical_id mappings covering all 11 skills
   - `backend/data/skill_graph.json` — 11 SKG nodes (React, JS, TS, SQL, Docker, Python, Stats, ML Basics, Random Forest, D3, Data Viz) with proper `tier`, `domain`, `prerequisites`, `concept_tags`, `edge_case_tags` per PROJECT_CONTEXT.md schema
   - `backend/data/questions.json` — 9 questions total (3 per skill: React, SQL, Docker), each with THEORY/PRACTICAL/EDGE_CASE types, 4 options with `misconception_tag` on wrong answers, `correct_option_id`, and `explanation`

3. **Resume Extract Endpoint (Step 3):**
   - `POST /api/resume/extract` — accepts `{ text: string }`, returns `{ profiles: SkillProfile[] }`
   - Taxonomy matching: longest-alias-first substring search
   - Level detection: distance-based closest-signal algorithm — finds all EXPERT/BEGINNER signals in the text, picks the one closest to each skill mention, with a 50-char proximity threshold
   - Defaults to INTERMEDIATE when no signal is close enough

4. **Verification (Step 4):**

   **Health check:**
   ```
   curl http://localhost:8000/api/health
   → { "status": "ok", "service": "skillproof-api" }
   ```

   **Resume extract — default string:**
   ```
   curl -X POST http://localhost:8000/api/resume/extract \
     -d '{"text": "I am a Web Developer. I have 3 years of experience in React (Expert), and basic exposure to SQL and Docker."}'
   → React(EXPERT), SQL(BEGINNER), Docker(BEGINNER)  ✅
   ```

   **Resume extract — edge case:**
   ```
   curl -X POST http://localhost:8000/api/resume/extract \
     -d '{"text": "Senior Python developer with 5 years experience. Built ML pipelines and managed PostgreSQL databases."}'
   → Python(EXPERT), ML_Basics(EXPERT), SQL(INTERMEDIATE)  ✅
   ```

### Files Created:
- `backend/main.py` — FastAPI app + CORS + health check
- `backend/requirements.txt` — Python dependencies
- `backend/routers/__init__.py` — Package init
- `backend/routers/resume.py` — Resume extraction endpoint
- `backend/data/taxonomy.json` — Alias→ID mapping
- `backend/data/skill_graph.json` — 11 SKG node definitions
- `backend/data/questions.json` — 9 questions (3 per skill)

### How to run:
```bash
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Prompt 03 — Evaluation Engine ✅ COMPLETE

**Completed:** 2026-04-02

### What was done:

1. **Frontend → Backend Wiring (Step 1):**
   - Rewrote `SkillInputPage.jsx` — "Extract Claims" button now calls `POST /api/resume/extract` (real API, no more mock data). Maps backend `SkillProfile[]` response to Zustand store format.
   - After extraction, calls `POST /api/skg/queue` to get the prerequisite-gated evaluation order. Skill cards now show tier, domain, and missing prerequisite warnings.
   - Added "Begin Evaluation →" CTA button that navigates to the first evaluable skill.
   - Added Vite proxy (`/api → http://127.0.0.1:8000`) to avoid CORS in dev.

2. **Backend Grader Endpoint (Step 2):**
   - `POST /api/evaluation/score` — accepts `{ skill_id, claimed_level, answers[] }`. No user_id/session_id (stateless).
   - Computes per-type scores: `theory_score`, `practical_score`, `edge_case_score`.
   - Composite formula: `(theory × 0.3) + (practical × 0.4) + (edge_case × 0.3)` per PROJECT_CONTEXT.md §4.
   - Fires verdict rules R01–R06 sequentially using skill tier from `skill_graph.json`.
   - Collects `misconception_tags` from wrong answers (mapped from question options).
   - Returns full `EvaluationSession` object with all scores, verdict, rule_fired, and answers_detail.

3. **Backend SKG Queue Endpoint:**
   - `POST /api/skg/queue` — accepts `{ claims[] }`, walks skill_graph.json to check prerequisites.
   - Returns ordered queue: prereqs-met first, then by tier (1 before 2), then by domain.
   - Each item includes `has_questions`, `prerequisites_met`, `missing_prerequisites`.

4. **Backend Questions Endpoint:**
   - `GET /api/evaluation/{skill_id}/questions` — returns questions stripped of `correct_option_id` and `misconception_tag`. Answer keys stay server-side only.

5. **Frontend EvaluationPage (Step 1 + Step 3):**
   - Complete rewrite. Fetches questions from API on mount. Forward-only answering (no back navigation).
   - After all questions answered, POSTs to `/api/evaluation/score`. On response, saves `EvaluationSession` to `localStorage` under `SkillProof_Sessions`.
   - Auto-navigates to next unevaluated skill in the queue, then to `/results` when all skills are done.
   - Progress bar, question type badges (THEORY/PRACTICAL/EDGE_CASE), framer-motion slide animations.
   - Fixed race condition: state resets when skillId route param changes.

6. **Zustand Store Rewrite:**
   - Removed all old engine imports (`evaluationBank`, `scoring`, `rules`, `library`, `levels`, `prereqs`).
   - New minimal state: `claims`, `evaluationQueue`, `evaluatedSkills`.
   - Persists `claims` and `evaluationQueue` to localStorage for navigation survival.

7. **Dependent Page Refactors:**
   - `GraphPage.jsx` — refactored to read from `evaluationQueue` + `localStorage` sessions instead of deleted engine files. ReactFlow graph nodes now show backend-computed verdicts.
   - `ResultsPage.jsx` — reads from localStorage `SkillProof_Sessions` instead of old `resultsBySkill`. Audit trail shows composite scores, misconception tags, rule firings.
   - `RoadmapPage.jsx` — reads from localStorage sessions. Shows misconception tags from backend instead of old concept tags.

8. **Old Engine Files Deleted:**
   - `frontend/src/engine/evaluationBank.js` — DELETED
   - `frontend/src/engine/scoring.js` — DELETED
   - `frontend/src/engine/rules.js` — DELETED
   - `frontend/src/engine/levels.js` — DELETED
   - `frontend/src/engine/prereqs.js` — DELETED
   - `frontend/src/data/library.js` — DELETED
   - `frontend/src/engine/` directory — DELETED

### Verification (Step 4):

**Backend curl tests:**
```
GET /api/evaluation/react/questions
→ 3 questions returned, stripped of correct_option_id and misconception_tag  ✅

POST /api/evaluation/score (all correct, claimed EXPERT)
→ composite 1.0, verdict VERIFIED, rule R03, no misconception_tags  ✅

POST /api/evaluation/score (all wrong, claimed EXPERT)
→ composite 0.0, verdict OVERCLAIM, rule R05, misconception_tags: [direct-dom-manipulation, memo-vs-effect, blaming-css]  ✅

POST /api/skg/queue (react + sql + docker)
→ SQL first (tier 1, no prereqs), Docker second (tier 2), React last (missing javascript prereq)  ✅
```

**Browser E2E flow:**
```
1. Paste default resume → Extract Claims → 3 skills extracted (SQL, Docker, React)  ✅
2. React shows "Missing prereqs: javascript" warning  ✅
3. Begin Evaluation → SQL (3 questions) → Docker (3 questions) → Results  ✅
4. Results page: Docker 100% BASIC_VERIFIED, SQL 100% VERIFIED, React gated  ✅
5. Radar chart renders claimed vs verified comparison  ✅
6. Roadmap: React pinned as prerequisite blocker, Docker/#1 SQL/#2 ranked  ✅
7. EvaluationSession objects saved to localStorage SkillProof_Sessions  ✅
```

### Files Created:
- `backend/routers/evaluation.py` — Questions, Score, and SKG Queue endpoints

### Files Modified:
- `backend/main.py` — Registered evaluation router
- `SkillProof/vite.config.js` — Added API proxy to backend
- `frontend/src/pages/SkillInputPage.jsx` — Wired to real extract + queue APIs
- `frontend/src/pages/EvaluationPage.jsx` — Complete rewrite (API-driven evaluation)
- `frontend/src/pages/GraphPage.jsx` — Refactored for new data model
- `frontend/src/pages/ResultsPage.jsx` — Refactored for localStorage sessions
- `frontend/src/pages/RoadmapPage.jsx` — Refactored for localStorage sessions
- `frontend/src/state/useSkillProofStore.js` — Complete rewrite (localStorage persistence)

### Files Deleted:
- `frontend/src/engine/evaluationBank.js`
- `frontend/src/engine/scoring.js`
- `frontend/src/engine/rules.js`
- `frontend/src/engine/levels.js`
- `frontend/src/engine/prereqs.js`
- `frontend/src/data/library.js`


---

## Prompt 04 — PostgreSQL & Testing ✅ COMPLETE

**Completed:** 2026-04-02

### What was done:

1. **Database Setup & Models (Step 1):**
   - Added `sqlmodel>=0.0.22`, `psycopg2-binary>=2.9.9`, `pytest>=8.3.0` to `requirements.txt`.
   - Created `backend/database.py` — SQLAlchemy engine connecting to `postgresql://<os_user>@localhost:5432/skillproof` with `DATABASE_URL` env var override. Provides `create_db_and_tables()` and `get_session()` dependency.
   - Created `backend/models.py` — Three SQLModel tables:
     - **`User`**: `id` (UUID PK), `email` (optional, indexed, unique — placeholder for future auth), `password_hash` (optional), `created_at`.
     - **`Question`**: `id` (auto PK), `question_id` (unique indexed), `skill_id` (indexed), `question_type`, `question_text`, `options` (JSON column), `correct_option_id`, `explanation`.
     - **`Evaluation`**: `id` (UUID PK), `user_id` (FK → users.id, indexed), `skill_id`, `claimed_level`, `composite_score`, `verdict`, `rule_fired`, `misconception_tags` (JSON), `created_at`.
   - Updated `main.py` with FastAPI lifespan event that runs `SQLModel.metadata.create_all(engine)` on startup (idempotent table creation, no Alembic needed).

2. **Seed Script & Randomization (Step 2):**
   - On startup, the lifespan checks if the `questions` table is empty. If so, it reads `backend/data/questions.json` and seeds all 9 questions into Postgres.
   - `GET /api/evaluation/{skill_id}/questions` — rewrote to query Postgres. Uses `ORDER BY RANDOM()` to select exactly 1 THEORY, 1 PRACTICAL, and 1 EDGE_CASE question per skill. Questions are stripped of `correct_option_id` and `misconception_tag` before returning to the frontend.

3. **Stateful Evaluation Persistence (Step 3):**
   - `POST /api/evaluation/score` — core scoring logic and verdict rules R01–R06 preserved unchanged.
   - Added anonymous user creation: if no `user_id` is provided, a new anonymous `User` row is inserted. The `User.id` is used as the FK for the `Evaluation` row.
   - After scoring, an `Evaluation` row is INSERTed into Postgres with `composite_score`, `verdict`, `rule_fired`, `misconception_tags`.
   - Response now includes `evaluation_id` (UUID string from Postgres) so the frontend knows the evaluation was persisted.

4. **Testing Suite Implementation (Step 4):**
   - **Backend:** Created `backend/tests/test_scoring.py` — 8 pytest tests covering:
     - `TestR03Verified`: All-correct scores, threshold at 0.70 → VERIFIED, R03.
     - `TestR04Partial`: Intermediate at 0.55, boundary at 0.50, composite math → PARTIAL, R04.
     - `TestR05Overclaim`: All-wrong expert, just-below-threshold (0.59), at-threshold (0.60 → PARTIAL) → OVERCLAIM, R05.
   - **Frontend:** Set up Vitest with jsdom environment. Created:
     - `frontend/src/tests/setup.js` — imports `@testing-library/jest-dom`.
     - `frontend/src/tests/App.test.jsx` — 2 tests: mounts `SkillInputPage` in MemoryRouter, verifies heading, textarea with default resume, Extract Claims button, and stage label all render without crashing.

### Verification (Step 5):

**Backend pytest:**
```
8 passed in 0.18s ✅
  TestR03Verified::test_all_correct_expert        ✅
  TestR03Verified::test_threshold_exactly_070      ✅
  TestR04Partial::test_partial_intermediate        ✅
  TestR04Partial::test_partial_at_boundary_050     ✅
  TestR04Partial::test_partial_composite_math      ✅
  TestR05Overclaim::test_all_wrong_expert          ✅
  TestR05Overclaim::test_expert_just_below_threshold ✅
  TestR05Overclaim::test_expert_at_threshold_passes ✅
```

**Frontend Vitest:**
```
2 passed (2) ✅
  SkillInputPage::renders heading and textarea     ✅
  SkillInputPage::has the correct stage label      ✅
```

**Postgres verification:**
```
questions table: 9 rows (3 per skill: react, sql, docker)  ✅
evaluations table: 1 row after curl test (VERIFIED, R03)    ✅
users table: 1 anonymous user created                       ✅
```

**API curl test:**
```
POST /api/evaluation/score (all correct, EXPERT)
→ composite 1.0, verdict VERIFIED, rule R03, evaluation_id returned  ✅
```

### Files Created:
- `backend/database.py` — Engine, session factory, create_all helper
- `backend/models.py` — User, Question, Evaluation SQLModel tables
- `backend/tests/__init__.py` — Package init
- `backend/tests/test_scoring.py` — 8 pytest tests for R03/R04/R05
- `frontend/src/tests/setup.js` — Vitest setup with jest-dom
- `frontend/src/tests/App.test.jsx` — SkillInputPage mount tests

### Files Modified:
- `backend/requirements.txt` — Added sqlmodel, psycopg2-binary, pytest
- `backend/main.py` — Added lifespan event (create_all + seed), bumped to v0.2.0
- `backend/routers/evaluation.py` — Full rewrite: Postgres queries, random ordering, evaluation persistence
- `SkillProof/vite.config.js` — Added Vitest test configuration
- `SkillProof/package.json` — Added "test" script, vitest + testing-library devDeps

### Dependencies Added:
- **Python:** sqlmodel, psycopg2-binary, pytest
- **Node:** vitest, @testing-library/react, @testing-library/jest-dom, jsdom

### How to run:
```bash
# Backend
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Backend tests
cd backend
source venv/bin/activate
python -m pytest tests/test_scoring.py -v

python -m pytest tests/ -v

# Frontend
cd SkillProof
npm run dev

# Frontend tests
cd SkillProof
npx vitest run
```

---

## Prompt 05 — UI Polish & Frontend Postgres Wiring ✅ COMPLETE

**Completed:** 2026-04-02

### What was done:

1. **Backend Report Endpoint (Step 1):**
   - Created `backend/routers/report.py` — `GET /api/report/{user_id}` queries the Postgres `evaluations` table for all rows matching the user, enriches with `canonical_name` from `skill_graph.json`, and returns structured data for Results/Roadmap pages.
   - Extended `Evaluation` model with `theory_score`, `practical_score`, `edge_case_score` float columns (ALTER TABLE applied to live DB). These now persist from the scoring response so the score breakdown survives page refresh.
   - Updated `evaluation.py` — `POST /api/evaluation/score` now saves per-type scores to DB and returns `user_id` in the response so the frontend can track the anonymous user.
   - Registered `report` router in `main.py`.

2. **Frontend Data Fetching — localStorage Removed (Step 2):**
   - **`useSkillProofStore.js`** — Removed `SkillProof_Sessions` localStorage caching entirely. Added `userId` field persisted to `SkillProof_UserId`. Store now only persists `claims`, `evaluationQueue`, and `userId`.
   - **`EvaluationPage.jsx`** — Now reads `userId` from store and sends it in score requests. First score response stores the anonymous `user_id` from backend. Subsequent evaluations reuse the same user. All `localStorage.getItem('SkillProof_Sessions')` writes deleted.
   - **`ResultsPage.jsx`** — `useEffect` fetches from `GET /api/report/{user_id}` on mount. Manages `loading`, `error`, `evaluations` state. Rebuilt `rows` and `radarData` from API response.
   - **`RoadmapPage.jsx`** — Same pattern: `useEffect` fetches from report API, builds roadmap items from DB data.
   - **`GraphPage.jsx`** — Same pattern: fetches evaluations from API to determine node verdict statuses.

3. **Structural Layout Fixes (Step 3):**
   - **`AppShell.jsx`** — Sidebar changed from `sticky` inside flex to `fixed h-screen top-0 left-0` with `border-r`. Main content uses dynamic `marginLeft` matching sidebar width. Content area centered with `max-w-7xl mx-auto` for wide monitors. Smooth `transition-all` on sidebar collapse/expand.

4. **Framer Motion Animations (Step 4):**
   - **Page Transitions:** All pages wrapped in `<motion.div>` with slide-in effect (`x: 20 → 0, opacity: 0 → 1`).
   - **Accordion Smoothness:** Results audit trail wrapped in `<AnimatePresence>` + `<motion.div initial={{ height: 0 }} animate={{ height: "auto" }}>` with `overflow-hidden`.
   - **Layout Flowing:** `<LayoutGroup>` + `<motion.tr layout>` on table rows for smooth accordion reflow.
   - **Staggered Cascades:** Results rows and Roadmap items use `staggerChildren` for cascading pop-in.
   - **Hover Physics:** `whileHover={{ scale: 1.02 }}` with spring physics on interactable cards.
   - **Radar Chart Intro:** Recharts `<Radar>` with `animationBegin + animationDuration` for smooth polygon draw.

5. **Vibrant Color Injection (Step 5):**
   - **`index.css`** — New CSS variables (preserving Emerald/Amber/Coral verdict colors):
     - `--color-graph-glow` (rose-500) + `--color-graph-warm` (orange-500) — Sunset graph accents
     - `--color-roadmap-start/end` (teal-400 → blue-500) — Ocean gradient
     - `--color-roadmap-alt-start/end` (violet-500 → sky-400) — Aurora gradient
     - `--color-nav-active` (pink-500) — Electric sidebar active
     - `--color-interact` (lime-400) — Interactable accents
   - **AppShell:** Electric pink nav active + glowing left-border indicator
   - **GraphPage:** Sunset gradient bar, fiery edge colors, node outer glow
   - **RoadmapPage:** Ocean/Aurora gradient bars, violet rank numbers

6. **Full Stack Testing (Step 6):**
   - **Backend:** `test_report.py` — 5 pytest tests (200, structure, data, 404, 400)
   - **Frontend:** `ResultsPage.test.jsx` — 4 vitest tests (heading, skills, verdicts, API call)

### Verification (Step 7):

**Backend pytest:**
```
13 passed in 0.22s ✅
  TestReportEndpoint::test_report_returns_200              ✅
  TestReportEndpoint::test_report_has_correct_structure    ✅
  TestReportEndpoint::test_report_evaluation_data          ✅
  TestReportEndpoint::test_report_nonexistent_user_404     ✅
  TestReportEndpoint::test_report_invalid_uuid_400         ✅
  TestR03Verified::test_all_correct_expert                 ✅
  TestR03Verified::test_threshold_exactly_070              ✅
  TestR04Partial::test_partial_intermediate                ✅
  TestR04Partial::test_partial_at_boundary_050             ✅
  TestR04Partial::test_partial_composite_math              ✅
  TestR05Overclaim::test_all_wrong_expert                  ✅
  TestR05Overclaim::test_expert_just_below_threshold       ✅
  TestR05Overclaim::test_expert_at_threshold_passes        ✅
```

**Frontend Vitest:**
```
6 passed (6) ✅
  SkillInputPage::renders heading and textarea             ✅
  SkillInputPage::has the correct stage label              ✅
  ResultsPage::renders the Claim vs Reality heading        ✅
  ResultsPage::renders skill names from the API data       ✅
  ResultsPage::renders verdict badges correctly            ✅
  ResultsPage::calls the report API with the user ID       ✅
```

### Files Created:
- `backend/routers/report.py` — Report endpoint (GET /api/report/{user_id})
- `backend/tests/test_report.py` — 5 pytest tests for report endpoint
- `frontend/src/tests/ResultsPage.test.jsx` — 4 vitest tests for ResultsPage

### Files Modified:
- `backend/models.py` — Added theory_score, practical_score, edge_case_score to Evaluation
- `backend/main.py` — Registered report router
- `backend/routers/evaluation.py` — Persist per-type scores, return user_id in response
- `backend/requirements.txt` — Added httpx>=0.28.0
- `frontend/src/index.css` — Vibrant Neo-Brutalist color variables
- `frontend/src/app/AppShell.jsx` — Fixed sidebar, electric pink active nav
- `frontend/src/state/useSkillProofStore.js` — userId persistence, removed session caching
- `frontend/src/pages/EvaluationPage.jsx` — User ID tracking, removed localStorage writes
- `frontend/src/pages/ResultsPage.jsx` — API-driven, Framer Motion, LayoutGroup
- `frontend/src/pages/RoadmapPage.jsx` — API-driven, gradient accents, cascades
- `frontend/src/pages/GraphPage.jsx` — API-driven, sunset accents, page transitions

### Dependencies Added:
- **Python:** httpx (for FastAPI TestClient)

---

**Next task:** Awaiting the next prompt module.
