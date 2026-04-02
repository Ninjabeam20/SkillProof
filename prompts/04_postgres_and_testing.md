# Claude Execution Prompt: 04 PostgreSQL & Testing

**Context:** The application is fully functional using localStorage and static JSON files. The user has installed PostgreSQL locally. Your task is to migrate the data layer to PostgreSQL, update the backend to query random questions, prepare the schema for future auth, and establish a testing suite. 

Execute this **step-by-step**. Do not skip any verification steps.

---

### Step 1: Database Setup & Models
- In `/Users/utkarsh/Documents/Projects/self/SkillProof/backend`, add `sqlmodel`, `psycopg2-binary`, and `pytest` to `requirements.txt`.
- Create `backend/database.py` with an engine connecting to `postgresql://<user>@localhost:5432/skillproof` (use a fallback to local standard users or ENV var).
- Create `backend/models.py`. Define the following SQLModel tables:
  1. `User`: `id` (UUID), `email` (Optional, for future auth), `password_hash` (Optional), `created_at`.
  2. `Question`: `id`, `skill_id`, `question_type`, `question_text`, `options` (JSON), `correct_option_id`, `explanation`.
  3. `Evaluation`: `id`, `user_id` (FK), `skill_id`, `claimed_level`, `composite_score`, `verdict`, `misconception_tags` (JSON), `created_at`.
- Use `SQLModel.metadata.create_all(engine)` in `main.py` lifespan to auto-generate tables on startup (no Alembic needed yet).

### Step 2: Seed Script & Randomization
- On startup, read `backend/data/questions.json`. If the `questions` table is empty, seed all questions into the database.
- Modify `GET /api/evaluation/{skill_id}/questions`: Instead of parsing JSON, query the `questions` table. Use Postgres `ORDER BY RANDOM()` to select exactly: 1 Theory, 1 Practical, and 1 Edge Case question.

### Step 3: Stateful Evaluation Persistence
- Modify `POST /api/evaluation/score`:
  - It currently computes the score and fires rules flawlessly. Keep that logic.
  - Add logic to generate an anonymous `user_id` if missing, and **INSERT** the resulting `Evaluation` row into Postgres.
  - Return the `evaluation_id` or full object so the frontend knows it succeeded.

### Step 4: Testing Suite Implementation
- **Backend Tests:** Create `backend/tests/test_scoring.py`. Use `pytest` to write at least 3 tests covering the R03 (Verified), R04 (Partial), and R05 (Overclaim) deterministic math logic.
- **Frontend Tests:** Set up `Vitest` in Vite. Write a basic test in `frontend/src/tests/App.test.jsx` that simply mounts the `SkillInputPage` to ensure the component tree isn't breaking.

### Step 5: Verification
- Boot the database and the app. 
- Run `pytest` to prove backend math works.
- Verify `skillproof` Postgres DB contains the seeded questions and your new evaluations exist in the table `evaluations`.
- Update `HANDOFF.md` with full status, files modified, and instructions to the user.
