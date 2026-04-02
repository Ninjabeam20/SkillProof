# Prompt 06 — Project Configuration: .gitignore Setup

The goal is to create a robust `.gitignore` file at the root of the repository to ensure all build artifacts, virtual environments, and sensitive files are excluded from Git.

## Requirements

### 1. Root .gitignore Creation
Create a `.gitignore` file in the root directory (`/Users/utkarsh/Documents/Projects/self/SkillProof/`) that covers all project components.

### 2. Required Exclusions

#### Python (Backend)
- `backend/venv/`
- `backend/__pycache__/`
- `backend/.pytest_cache/`
- `*.pyc`
- `backend/data/*.db` (if any local databases are used)

#### Node.js (Frontend)
- `node_modules/`
- `SkillProof/node_modules/`
- `dist/`
- `SkillProof/dist/`
- `dist-ssr/`

#### Environment & Sensitive Files
- `.env`
- `.env.local`
- `.env.development.local`
- `.env.test.local`
- `.env.production.local`

#### OS & IDEs
- `.DS_Store`
- `.vscode/`
- `.idea/`
- `*.swp`
- `*.swo`

### 3. Clean up
- If there are any other `.gitignore` files that conflict or are redundant, ensure the root one is the source of truth for the monorepo structure. (Keep `SkillProof/.gitignore` if it's a separate nested repo/submodule, but ideally, the root should handle it).

## Verification
- Run `git status` to ensure that `venv`, `node_modules`, and other ignored patterns are no longer tracked (or marked as untracked).
- Note: If `node_modules` or `venv` were already tracked, they might need to be removed from the index using `git rm -r --cached`.
