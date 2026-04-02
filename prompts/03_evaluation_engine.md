# Claude Execution Prompt: 03 Evaluation Engine

**Context:** The UI is redesigned, and the FastAPI backend + JSON data layer are established. Now, build the intelligence layer that serves the questions and grades the responses statelessly.

### Step 1: Frontend Evaluation State
- Modify `/Users/utkarsh/Documents/Projects/self/SkillProof/SkillProof/frontend/src/pages/EvaluationPage.jsx`.
- Build the state manager to read the `SKG queue` and serve questions one at a time.
- Implement the "Forward-Only" rule: Once an answer is clicked, immediately proceed to the next question. Do not allow back navigation.
- Store selected answers in a local array: `{ question_id, selected_option_id }`.

### Step 2: Backend Grader Endpoint
- In `backend/main.py`, implement `POST /api/evaluation/score`.
- Accepts: `{ user_id, session_id, skill_id, claimed_level, answers: [] }`.
- Logic: Compute the `theory_score`, `practical_score`, and `edge_case_score` by comparing against `questions.json`.
- Apply the Rule Thresholds (R01 to R06) defined in `PROJECT_CONTEXT.md`.
- Extract and aggregate `misconception_tags` for wrong answers.
- Return the full `EvaluationSession` object.

### Step 3: LocalStorage State Write
- On successful return from the score endpoint, the React frontend must save the `EvaluationSession` object into `localStorage` under `SkillProof_Sessions`.
- Transition the frontend route to the overarching `/results` or `/graph` page to queue the next skill.

### Step 4: Verification
- Run a full test using your mocked default resume. Proceed through the `EvaluationPage`, randomly select answers, ensure the backend scores it, and ensure it saves to `localStorage`. Update `HANDOFF.md` when done.
