# Claude Execution Prompt: 04 Report & Roadmap

**Context:** Evaluations are being successfully scored and stored in `localStorage`. The final step is rendering the Claim vs Reality table, the Radar Chart, and the Improvement Roadmap.

### Step 1: Claim vs Reality Table
- Modify `/Users/utkarsh/Documents/Projects/self/SkillProof/SkillProof/frontend/src/pages/ResultsPage.jsx`.
- Read the completed sessions from `localStorage`.
- Render the table rows with the exact Matte Dark Aesthetic (e.g. Green outline for Verified, Red outline for Overclaim).
- Build the Expandable Audit Trail: When a user clicks a row, expand to show exactly what questions they missed and which Rule Threshold fired off.

### Step 2: The Skill Radar Chart
- Use `recharts` to render a Polygon Radar Chart on the `ResultsPage`.
- Polygon A = Claimed Level (Beginner = 33, Intermediate = 66, Expert = 100).
- Polygon B = Verified Score (The composite score % from the backend).
- The visual delta between these polygons is the primary wow-factor of the demo.

### Step 3: Improvement Roadmap
- Modify `RoadmapPage.jsx`.
- Implement `POST /api/report/roadmap` on the FastAPI backend. The frontend sends the failed/partial `EvaluationSession` objects. The backend maps the `misconception_tags` to specific `concept_nodes` or `edge_case_nodes` from the `skill_graph.json` and returns the syllabus.
- Render the syllabus on the Roadmap page with the highest severity gaps at the top.

### Step 4: Verification
- Verify the entire "Golden Path" flow from `/` (Paste Resume) -> Extracted Claims -> `EvaluationPage` -> `ResultsPage` (Radar Chart looks perfect). Update `HANDOFF.md` upon completion.
