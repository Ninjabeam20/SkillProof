# Claude Execution Prompt: 06 Taxonomy & Bulk Ingestion

**Context:** The app currently runs on a prototype taxonomy with only three skills. We need to standardize the application to support EXACTLY 15 specific skills. We also need to remove the strict prerequisite locks in the UI so users can evaluate skills in any order, and we need a dedicated Python ingestion script to seamlessly bulk-load external JSON question banks into PostgreSQL.

Please execute this step-by-step.

---

### Step 1: Standardize the 15 Skills
You must completely overwrite `backend/data/taxonomy.json` and `backend/data/skill_graph.json` to hardcode exactly these 15 canonical skills.

The canonical IDs must be:
`javascript`, `python`, `java`, `system_design`, `cpp`, `html`, `css`, `nodejs`, `expressjs`, `fastapi`, `sql`, `nosql`, `rest_api`, `docker`, `react`.

- In **`taxonomy.json`**: Ensure all common variations map correctly (e.g., "C++" and "c plus plus" map to `cpp`, "REST" maps to `rest_api`). Remove all other prototype skills.
- In **`skill_graph.json`**: Add all 15 skills into the `nodes` object with proper `tier`, `domain`, and `canonical_name` fields. Ensure the `edges` object draws meaningful visual prerequisites for these items (e.g., `html` -> `javascript` -> `react`), but ensure there are no missing nodes or dangling edges.

### Step 2: Remove Evaluation Locks (Flexible Answering)
The user wants to see the visual hierarchy but evaluate skills in whatever order they choose based on their own requirements.
- In `backend/routers/evaluation.py`: Remove or neuter the `POST /api/skg/queue` restriction logic. It should return all 15 skills as "unlocked", or simply remove the `prerequisites_met` boolean check entirely so no skill is ever explicitly blocked.
- In `SkillProof/frontend/src/state/useSkillProofStore.js`: Ensure that when claims are extracted, the evaluation queue simply loads all claimed skills without enforcing sequential locking.
- In `GraphPage.jsx` and `NodeInspector`: Remove the "Locked" status. If a skill hasn't been tested yet, it should just be "Untested" and the user should be able to click an active "Evaluate" button on any of them.

### Step 3: Setup Bulk Question Ingestion
The prototype seeded a single `questions.json` file on startup. We are upgrading to a bulk drag-and-drop system.
1. Make a new directory: `backend/data/question_banks/`.
2. Create a new standalone Python script: `backend/scripts/seed_questions.py`.
3. The `seed_questions.py` script must:
   - Connect to the local Postgres database (`DATABASE_URL="postgresql://<os-user>@localhost:5432/skillproof"`).
   - Iterate through every `.json` file inside `backend/data/question_banks/`.
   - Parse the files and validate that their `skill_id` matches one of the 15 canonical IDs in `taxonomy.json`. If it doesn't, skip it and print a warning.
   - Use SQLAlchemy/SQLModel to `UPSERT` the questions into the `questions` table (matching on `question_id` so we update existing questions rather than duplicating them).
4. Update `backend/main.py`: **Remove** the prototype logic inside the lifespan event that automatically seeds `backend/data/questions.json`. The application should no longer auto-seed on startup; ingestion is now handled manually via the seeding script.

### Step 4: Verification 
- Run `uvicorn` and the Vite dev server. Verify the app boots without trying to auto-seed.
- Extract a dummy resume containing these new skills (e.g., "I know C++, React, and System Design"). 
- Go to the Knowledge Graph and verify the nodes render beautifully with connections, and verify you can click "Evaluate" on any of them regardless of prerequisites.
- Update `HANDOFF.md` with completion status and note that Phase 7 (Authentication) is next.
