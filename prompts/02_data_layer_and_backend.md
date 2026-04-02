# Claude Execution Prompt: 02 Data Layer & FastAPI Setup

**Context:** The frontend is visually mocked. Now we need to set up the Stateless FastAPI backend and the core `JSON` files that drive the rules engine.

**Task Restrictions:** All code logic goes in `/Users/utkarsh/Documents/Projects/self/SkillProof/backend`. 

### Step 1: FastAPI Scaffolding
- Create the backend directory if it doesn't exist.
- Standardize the `main.py` entry point with FastAPI & CORS middleware configured to accept requests from the Vite frontend (port 5173).
- Implement a basic health check endpoint `GET /api/health`.

### Step 2: The Core JSON Data Files
Inside `backend/data`, create three files:
1. `taxonomy.json`: A mapping of text aliases to canonical IDs. E.g., `{"react js": "react", "sql server": "sql", "docker": "docker"}`.
2. `skill_graph.json`: Create SKG Nodes for these three skills. React requires nothing, Docker requires nothing, but SQL is independent. (Just define the schema according to `PROJECT_CONTEXT.md`).
3. `questions.json`: Create exactly 3 questions per skill (Theory, Practical, Edge Case) with correct `options` and `misconception_tag`s.

### Step 3: Implement `POST /api/resume/extract`
Create the resume parsing logic.
- Accept raw text.
- Match substrings against `taxonomy.json`.
- Detect nearby signals (Regex for words like 'expert', 'basic') to apply `BEGINNER`, `INTERMEDIATE`, or `EXPERT` levels.
- Return the structured `SkillProfile[]`.

### Step 4: Verification
Use uvicorn to start the server. Test `/api/resume/extract` with a raw curl command passing the default resume string. Update `HANDOFF.md` upon completion.
