# Claude Execution Prompt: 05 Ultimate UI Polish & Frontend Postgres Wiring

**Context:** The backend successfully writes evaluations to PostgreSQL, but the React frontend still relies on `localStorage` to display the Results and Roadmap. Additionally, the UI layout needs structural fixing, we want to inject vibrant colors, add top-tier Framer Motion micro-interactions, and ensure the new changes are backed by testing.

Execute this **step-by-step** and do not skip any effects or tests.

---

### Step 1: Backend Reporting Endpoints
- In `backend/routers/report.py` (create this file), implement:
  **`GET /api/report/{user_id}`**
  - Query the PostgreSQL `evaluations` table for all rows matching `user_id`.
  - Gather and format the data exactly how `ResultsPage.jsx` and `RoadmapPage.jsx` need it.
- Register this router in `main.py`.

### Step 2: Frontend Data Fetching (Replacing LocalStorage)
- Update `useSkillProofStore.js`. Remove the deep object caching of session histories in `localStorage`. 
- Instead, ONLY store the anonymous `user_id` (the UUID returned from Phase 4) in `localStorage`.
- `ResultsPage.jsx` and `RoadmapPage.jsx` must now use `useEffect` (or React Query if preferred) to fetch data directly from `GET /api/report/{user_id}`. 

### Step 3: Structural Layout Fixes
- Fix `AppShell.jsx` so the Sidebar is truly anchored (`h-screen sticky top-0` or `fixed`), and the main content area is a robust `flex-1` container that expands to fill the remaining width.
- Ensure the main content panes use `max-w-7xl mx-auto` to center beautifully on wide monitors.

### Step 4: Component Consistency & Ultimate Animations
Go all-in on `framer-motion` to make the UI feel incredibly state-of-the-art:
- **Layout Flowing:** Add the `<motion.div layout>` property to cards inside your grids. If an element expands (like the Audit accordion), the `layout` prop ensures surrounding elements smoothly glide out of the way instead of instantly snapping.
- **Accordion Smoothness:** Wrap the expanding Audit content in `<motion.div initial={{ height: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">`.
- **Page Transitions:** Wrap inner page contents in `<motion.div>` so pages slide in from the right when navigated to (`initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}`).
- **Staggered Cascades:** When rendering the Evaluation Queue or Results list, use `staggerChildren` so the rows visually cascade/pop in one after another.
- **Radar Chart Intro:** If you are using Recharts, enable/configure its built-in stroke animation (or wrap it in Framer Motion) so the "Verified" polygon smoothly draws itself outward from the center.
- **Hover Physics:** Add subtle `<motion.div whileHover={{ scale: 1.02 }} ...>` effects to all interactable cards (Skill cards, Audit rows).

### Step 5: Vibrant Color Injection
- We want a multi-color "Neo-Brutalist" pop, moving away from exclusively green. Keep `bg-zinc-900` as the canvas.
- Modify `index.css` to introduce component-specific gradients and accents:
  1. **Knowledge Graph Nodes:** Add fiery Sunset accents (e.g., `rose-500` to `orange-500` borders/shadows).
  2. **Roadmap Component:** Add Ocean/Aurora gradients (e.g., `teal-400` to `blue-500`, or `violet-500` to `sky-400`) for headers.
  3. **Sidebar Active States:** Use an electric `pink-500` or `crimson` glow/border-left indicator for active navigation links.
  4. **Interactables:** Accents of `amber-400` or crisp `lime-400` on subtle buttons.
- strictly preserve `Emerald/Amber/Coral` exclusively for the Verified/Partial/Overclaim data verdicts.

### Step 6: Full Stack Testing
- **Backend Test:** Add a test in `backend/tests/test_report.py` using `pytest`. Mock or insert a raw evaluation score into the DB, hit `GET /api/report/{user_id}`, and assert it returns status 200 with the correctly structured data.
- **Frontend Test:** Add a test in `frontend/src/tests/ResultsPage.test.jsx` using `vitest` to verify that the frontend renders the Claim vs Reality table properly when provided mocked API data.

### Step 7: Verification
- Run `pytest` and `vitest run` to ensure all tests pass.
- Start the server (`npm run dev` & `uvicorn main:app`). Step through a full evaluation and watch the slide-in, cascade, and hover animations fire.
- Update `HANDOFF.md` with full details.
