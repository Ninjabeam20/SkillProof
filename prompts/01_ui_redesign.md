# Claude Execution Prompt: 01 UI Redesign

**Context:** The current UI in `/Users/utkarsh/Documents/Projects/self/SkillProof/SkillProof` uses a flat, light mode dashboard aesthetic that does not fit the hackathon goal. We also have a functional mismatch where the home page uses a manual search form instead of a resume input.

**Task Restrictions:** For this phase, only modify the React frontend. Do not touch backend code yet.

### Step 1: CSS Overhaul (The Matte Dark Aesthetic)
Modify `index.css`.
- Remove all light mode references. Set the root background to `bg-zinc-900` (`#18181B`).
- Implement the Color-Blocked Dark Mode aesthetic defined in `CLAUDE.md`. You should configure Tailwind variables for the primary verified (Emerald), partial (Amber), and overclaim (Coral) states.

### Step 2: The Resume Input Page
Completely rewrite `SkillInputPage.jsx`.
- Remove the manual search and 'Add Custom Skill' functionalities.
- Replace them with a large, centered `<textarea>` labeled "Paste Resume Text".
- Below it, add a primary "Extract Claims" button.
- Pre-fill the textarea with a minimal default resume string: `"I am a Web Developer. I have 3 years of experience in React (Expert), and basic exposure to SQL and Docker."`
- (Mock the extraction visually for now. When the user clicks Extract, hardcode a mock state that sets the Claims library to show React(Expert), SQL(Beginner), Docker(Beginner)).

### Step 3: Remove Demo Mode
Remove all the `demoMode` toggles, variables, and logic from `AppShell.jsx`.

### Step 4: Verification
Run `npm run dev` and ensure the application boots in the new dark theme with the Resume generic paste box. Update `HANDOFF.md` upon completion.
