# Claude Execution Prompt: 07 Fixes & Graph Hierarchy Engine

**Context:** The project was transferred to a new PC. As a result, the local PostgreSQL database is empty, causing the UI (like Node Inspector and the Extracted Claims queue) to display "No questions" for skills like React even though the JSON files exist in the file system. Additionally, the backend seems to have logged "Ghost" 0% evaluations for untested skills because questions were missing. Finally, the Skill Knowledge Graph currently renders in a generic vertical list, but it needs to be an automated left-to-right hierarchical tree.

Please execute this step-by-step to restore functionality and upgrade the graph layout.

---

### Step 1: Upgrade & Execute the Database Seeder (Fixing "No questions" error)
The reason the frontend says "No questions" for React (and everything else) is because the JSON files in `backend/data/question_banks/` have not been parsed and inserted into this new PC's local PostgreSQL database. The user has added multiple new JSON files (like `qna.json`, `ml_questions.json`, `react.json`, etc.) with potentially varying top-level structures.
- **Analyze:** Read `backend/scripts/seed_questions.py` and compare it to the structure of the new files in `backend/data/question_banks/`.
- **Upgrade:** Modify `seed_questions.py` to be extremely robust. It must handle raw JSON arrays, or objects that contain arrays of questions, and gracefully skip any malformed questions rather than crashing the script.
- **Run:** Open the terminal and run the script:
  ```bash
  cd backend
  source venv/bin/activate
  python scripts/seed_questions.py
  ```
- *Note:* Ensure the script successfully upserts all the questions from the new JSON banks into the DB. This step single-handedly fixes the "No questions" bug.

### Step 2: Fix 0% "Ghost" Evaluations in the Backend
Because the database was missing questions, clicking into the evaluation loop likely caused the frontend to submit empty answers arrays, forcing the backend to record ghost 0% composite scores and "Overclaim" verdicts.
Modify `backend/routers/evaluation.py` inside the `score_evaluation` endpoint:
- Add a strict guard clause at the very top: `if not req.answers: raise HTTPException(status_code=400, detail="Cannot grade an evaluation with zero answers.")`
- Since the user's local database currently has bad data, write a tiny temporary python script (`backend/scripts/clear_evaluations.py`) that connects to Postgres via SQLModel and deletes all rows from the `Evaluation` table, so the Results page gets a perfectly clean slate. DO NOT delete the User or Question tables, just `Evaluation`.

### Step 3: Install Dagre for Directed Acyclic Graphs
To achieve the left-to-right tree structure for the Knowledge Graph, we will use the `dagre` layout engine on top of React Flow.
- Open the terminal.
- Navigate to the frontend and install `dagre`:
  ```bash
  cd SkillProof
  npm install dagre
  ```

### Step 4: Implement Left-to-Right Hierarchy in GraphPage
Modify `SkillProof/frontend/src/pages/GraphPage.jsx`:
1. **Import Dagre:** Add `import dagre from 'dagre';` at the top.
2. **Build the Layout Engine Function:** Create a helper function `getLayoutedElements(nodes, edges, direction = 'LR')`.
   - Inside this function, initialize a new `dagre.graphlib.Graph()`.
   - Call `setGraph({ rankdir: direction })` to make it flow left to right.
   - Loop through the nodes and call `setNode(node.id, { width: 180, height: 60 })`.
   - Loop through the edges and call `setEdge(edge.source, edge.target)`.
   - Run `dagre.layout(dagreGraph)`.
   - Map over the nodes again and update their `position` property with the newly calculated `x` and `y` exact coordinates from Dagre. 
   - Return the dynamically positioned nodes and edges.
3. **Apply Layout on Render:** Where you initialize React Flow's `initialNodes` inside the component, pass them through `getLayoutedElements(initialNodes, initialEdges)` first, so they automatically arrange beautifully across the screen.

### Step 5: Upgrade NodeInspector Metrics
The user wants the NodeInspector to be explicitly clear about whether a stack has been tested and the consistency of questions.
In `GraphPage.jsx`, inside the `NodeInspector` panel (`<aside>`):
- Add a row under "Tier / Domain" called **Test Status**. If `selected.session` exists, display `"Tested"`. If not, display `"Untested"`.
- Add another row called **Questions Answered**. If `selected.session` exists, display `"3"` (since the PostgreSQL evaluation engine natively pulls exactly 1 Theory, 1 Practical, and 1 Edge Case per evaluation). If untested, omit the row or show `"0"`.
- Ensure styling matches the Neo-Brutalist transparent borders and color variables.

### Step 6: Verification 
- Run `python backend/scripts/clear_evaluations.py` to wipe the ghost 0% verdicts, ensuring the Claim vs Reality table correctly defaults back to `Untested`.
- Run the FastAPI backend and Vite frontend.
- Go to the **Resume Input** page. Verify that React now correctly shows questions available (the "No questions" badge should be gone).
- Go to the **Knowledge Graph**. Verify that it no longer renders as a vertical stack, but instead beautifully flows from Left to Right respecting the `skill_graph.json` prerequisites!
- Click a node to verify the new NodeInspector metrics.
- Update `HANDOFF.md` marking this prompt as complete.
