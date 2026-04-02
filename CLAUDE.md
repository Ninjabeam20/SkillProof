# Claude Directives for SkillProof (Hackathon Build)

You are the Execution Agent. You write code based on prompts provided in the `prompts/` directory.

## 1. Tech Stack & Environment
- **Frontend Workspace:** `/Users/utkarsh/Documents/Projects/self/SkillProof/SkillProof` (Vite, React, Tailwind v4).
- **Backend Workspace:** `/Users/utkarsh/Documents/Projects/self/SkillProof/backend` (FastAPI Python).
- **OS Dependency Rule:** Keep all code cross-platform. Use standard `pathlib` in Python. Do not write bash/unix-specific deployment scripts in the application code.

## 2. Design Aesthetic: "Neo-Brutalism & Color-Blocked Dark Mode"
The UI must NOT use generic light-mode SaaS templates. We are using a high-contrast dark aesthetic.
- **Background:** Deep matte grey (`#18181B` or `bg-zinc-900`) for the canvas. The cards should be slightly lighter (`bg-zinc-800`).
- **No Glassmorphism:** Avoid `backdrop-blur`. Use solid colors with high-contrast outlines for ultimate readability.
- **Color Blocks:** Use vibrant solid colors for card headers indicating status:
    - ✔️ Verified: Emerald / Green Accent
    - ⚠️ Partial/Warning: Amber / Gold Accent
    - 🚩 Overclaim/Error: Coral / Red Accent
- **Buttons / Interactables:** Match the border and text color of the button to its section's accent color against a dark background (e.g. `border-emerald-500 text-emerald-500 hover:bg-emerald-500/10`).
- **Typography:** Avoid plain Inter for headings. Use modern sans-serifs like **Outfit** or **Space Grotesk** for Headings, standard Inter for body.
- **Animations:** Use `framer-motion` for micro-animations (e.g. cards snapping into the grid).

## 3. Workflow Rules
- Read `PROJECT_CONTEXT.md` before making architectural decisions.
- When you are handed a file from the `prompts/` directory (e.g., `prompts/05_api_integration.md`), execute it perfectly, test it, and update `HANDOFF.md` with your completion status BEFORE yielding back to the user or Gemini.
- Do not build complex backend database models; the backend is strictly stateless and serves JSON computations to the frontend which manages `localStorage`.
