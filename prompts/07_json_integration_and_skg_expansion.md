# Prompt 07 — JSON Question Bank Integration, SKG Expansion & Prerequisite Coverage

Read `PROJECT_CONTEXT.md` and `CLAUDE.md` before making any changes.

## Objective

All 15 JSON files in `backend/data/question_banks/` must be fully integrated into the system.
Questions must be discoverable by their **canonical skill_id** (as used in `skill_graph.json` and `taxonomy.json`).
The Skill Knowledge Graph (SKG) must be expanded to cover every new technology present in those files.
Prerequisite chains must be correctly modelled so that claiming knowledge of a higher-skill automatically implies the lower-level skills are also proven.

---

## Step 1 — Audit the question bank files

The files and their current `skill_id` values are:

| File | `skill_id` used inside | Canonical target |
|------|----------------------|-----------------|
| `javascript_core_question_bank.json` | `javascript_core` | `javascript` |
| `nodejs_question_bank.json` | `nodejs` | `nodejs` ✅ |
| `rest_api_question_bank.json` | `rest_api` | `rest_api` ✅ |
| `state_management_question_bank.json` | `state_management` | NEW SKILL |
| `mongodb.json` | `mongodb` | `nosql` |
| `sql.json` | `sql` | `sql` ✅ |
| `transactions_acid.json` | `transactions_acid` | NEW SKILL |
| `indexing_optimization.json` | `indexing_optimization` | NEW SKILL |
| `docker_questions.json` | `docker` | `docker` ✅ |
| `cicd_questions.json` | `cicd` | NEW SKILL |
| `git_questions.json` | `git` | NEW SKILL |
| `linux_basics_questions.json` | `linux_basics` | NEW SKILL |
| `ml_questions.json` | `linear_regression`, `logistic_regression`, `decision_trees`, `random_forest`, `model_evaluation` | ALL NEW SKILLS |
| `qna.json` | `python`, `java`, `html`, `css`, `cpp` | All ✅ |

---

## Step 2 — Create the `skill_id_mapping.json` normalisation file

Create `backend/data/skill_id_mapping.json`. This file maps the `skill_id` values **as they appear in the JSON files** to the canonical IDs used inside the system. This avoids touching the raw JSON files.

```json
{
  "javascript_core": "javascript",
  "mongodb": "nosql"
}
```

All other skill_ids in the JSON files should either already match a canonical ID or be a **new skill** that will be added to the SKG in Step 3.

---

## Step 3 — Expand `backend/data/skill_graph.json`

Append the following new SKG nodes. Use the exact schema defined in `PROJECT_CONTEXT.md` §2.

### New nodes to add:

```json
[
  {
    "skill_id": "git",
    "canonical_name": "Git",
    "aliases": ["git", "version control", "git vcs", "source control"],
    "tier": 2,
    "domain": "DevOps",
    "prerequisites": [],
    "concept_tags": ["branching", "merging", "rebasing", "commits", "remote-repos"],
    "edge_case_tags": ["detached-head", "merge-conflicts", "force-push-danger", "rebase-vs-merge"]
  },
  {
    "skill_id": "cicd",
    "canonical_name": "CI/CD",
    "aliases": ["ci/cd", "cicd", "continuous integration", "continuous deployment", "continuous delivery", "github actions", "jenkins", "gitlab ci"],
    "tier": 1,
    "domain": "DevOps",
    "prerequisites": ["docker", "git"],
    "concept_tags": ["pipelines", "build-automation", "deployment-strategies", "artifact-management", "testing-gates"],
    "edge_case_tags": ["pipeline-flakiness", "secret-management", "rollback-strategies", "canary-deployments"]
  },
  {
    "skill_id": "linux_basics",
    "canonical_name": "Linux Basics",
    "aliases": ["linux", "bash", "shell", "unix", "command line", "cli", "terminal"],
    "tier": 2,
    "domain": "DevOps",
    "prerequisites": [],
    "concept_tags": ["file-system", "permissions", "processes", "shell-scripting", "networking-commands"],
    "edge_case_tags": ["symlink-pitfalls", "permission-octal", "signal-handling", "stdin-stdout-stderr"]
  },
  {
    "skill_id": "indexing_optimization",
    "canonical_name": "DB Indexing & Optimisation",
    "aliases": ["indexing", "database indexing", "query optimization", "query optimisation", "db optimization", "db optimisation"],
    "tier": 1,
    "domain": "DB",
    "prerequisites": ["sql"],
    "concept_tags": ["b-tree-indexes", "covering-indexes", "query-plans", "execution-plans", "index-selectivity"],
    "edge_case_tags": ["index-bloat", "over-indexing", "null-in-indexes", "partial-indexes-gotchas"]
  },
  {
    "skill_id": "transactions_acid",
    "canonical_name": "DB Transactions & ACID",
    "aliases": ["transactions", "acid", "database transactions", "acid properties", "isolation levels"],
    "tier": 1,
    "domain": "DB",
    "prerequisites": ["sql"],
    "concept_tags": ["atomicity", "consistency", "isolation", "durability", "isolation-levels", "savepoints"],
    "edge_case_tags": ["phantom-reads", "dirty-reads", "deadlock-detection", "two-phase-locking"]
  },
  {
    "skill_id": "state_management",
    "canonical_name": "State Management",
    "aliases": ["state management", "redux", "zustand", "context api", "mobx", "recoil"],
    "tier": 1,
    "domain": "Web",
    "prerequisites": ["react"],
    "concept_tags": ["global-state", "local-state", "derived-state", "side-effects", "immutability"],
    "edge_case_tags": ["stale-state", "context-re-renders", "selector-memoization", "optimistic-updates"]
  },
  {
    "skill_id": "linear_regression",
    "canonical_name": "Linear Regression",
    "aliases": ["linear regression", "ols", "ordinary least squares", "ridge regression", "lasso", "regularization"],
    "tier": 1,
    "domain": "ML",
    "prerequisites": [],
    "concept_tags": ["ols", "r-squared", "residuals", "coefficients", "regularization", "feature-scaling"],
    "edge_case_tags": ["multicollinearity", "heteroscedasticity", "overfitting-regression", "data-drift"]
  },
  {
    "skill_id": "logistic_regression",
    "canonical_name": "Logistic Regression",
    "aliases": ["logistic regression", "classification", "sigmoid", "log-loss"],
    "tier": 1,
    "domain": "ML",
    "prerequisites": ["linear_regression"],
    "concept_tags": ["sigmoid", "log-odds", "decision-boundary", "binary-classification", "multi-class"],
    "edge_case_tags": ["class-imbalance", "perfect-separation", "log-loss-edge-cases", "threshold-selection"]
  },
  {
    "skill_id": "decision_trees",
    "canonical_name": "Decision Trees",
    "aliases": ["decision tree", "decision trees", "cart", "gini impurity", "entropy"],
    "tier": 1,
    "domain": "ML",
    "prerequisites": [],
    "concept_tags": ["splitting-criteria", "depth", "pruning", "feature-importance", "leaf-nodes"],
    "edge_case_tags": ["high-cardinality-splits", "overfitting-depth", "continuous-split-thresholds"]
  },
  {
    "skill_id": "random_forest",
    "canonical_name": "Random Forest",
    "aliases": ["random forest", "ensemble learning", "bagging", "gradient boosting", "xgboost"],
    "tier": 1,
    "domain": "ML",
    "prerequisites": ["decision_trees"],
    "concept_tags": ["bagging", "feature-subsampling", "out-of-bag", "ensemble", "variance-reduction"],
    "edge_case_tags": ["feature-importance-bias", "correlated-trees", "oob-estimate-reliability"]
  },
  {
    "skill_id": "model_evaluation",
    "canonical_name": "ML Model Evaluation",
    "aliases": ["model evaluation", "cross validation", "confusion matrix", "roc auc", "precision recall"],
    "tier": 1,
    "domain": "ML",
    "prerequisites": [],
    "concept_tags": ["cross-validation", "confusion-matrix", "roc-auc", "precision-recall", "bias-variance"],
    "edge_case_tags": ["data-leakage", "class-imbalance-metrics", "temporal-cv-pitfalls"]
  }
]
```

---

## Step 4 — Expand `backend/data/taxonomy.json`

Add the following alias→canonical_id mappings:

```json
{
  "git": "git",
  "version control": "git",
  "git vcs": "git",
  "source control": "git",

  "cicd": "cicd",
  "ci/cd": "cicd",
  "continuous integration": "cicd",
  "continuous deployment": "cicd",
  "continuous delivery": "cicd",
  "github actions": "cicd",
  "jenkins": "cicd",
  "gitlab ci": "cicd",

  "linux": "linux_basics",
  "bash": "linux_basics",
  "shell": "linux_basics",
  "unix": "linux_basics",
  "command line": "linux_basics",
  "cli": "linux_basics",
  "terminal": "linux_basics",

  "indexing": "indexing_optimization",
  "database indexing": "indexing_optimization",
  "query optimization": "indexing_optimization",
  "query optimisation": "indexing_optimization",
  "db optimization": "indexing_optimization",

  "transactions": "transactions_acid",
  "acid": "transactions_acid",
  "database transactions": "transactions_acid",
  "isolation levels": "transactions_acid",

  "state management": "state_management",
  "redux": "state_management",
  "zustand": "state_management",
  "context api": "state_management",
  "mobx": "state_management",
  "recoil": "state_management",

  "linear regression": "linear_regression",
  "ols": "linear_regression",
  "ridge regression": "linear_regression",
  "lasso": "linear_regression",

  "logistic regression": "logistic_regression",

  "decision tree": "decision_trees",
  "decision trees": "decision_trees",
  "cart": "decision_trees",

  "random forest": "random_forest",
  "ensemble learning": "random_forest",
  "xgboost": "random_forest",

  "model evaluation": "model_evaluation",
  "cross validation": "model_evaluation",
  "roc auc": "model_evaluation",
  "confusion matrix": "model_evaluation"
}
```

---

## Step 5 — Update `backend/scripts/seed_questions.py`

Replace the validation and ingestion logic to support the `skill_id_mapping.json` normalisation layer.

### Changes required:

1. Load `skill_id_mapping.json` at the top alongside `taxonomy.json`.
2. In the `validate_question` function, **before the canonical ID check**, apply the mapping:
   ```python
   # Normalise skill_id if it appears in the mapping
   raw_skill_id = q.get("skill_id", "")
   q["skill_id"] = SKILL_ID_MAPPING.get(raw_skill_id, raw_skill_id)
   ```
3. The CANONICAL_IDS check must now reflect all 26 canonical IDs (15 original + 11 new from Step 3).
4. Ensure the `upsert_questions` function stores the **normalised** `skill_id` (after mapping), not the raw value from the file.
5. Update the README.md in `question_banks/` to document the mapping file and the full list of 26 canonical IDs.

---

## Step 6 — Update `backend/routers/evaluation.py` — Prerequisite Coverage in SKG Queue

The `POST /api/skg/queue` endpoint currently accepts only the skills explicitly claimed by the user. 

**New behaviour required:** When a user claims skill X that has prerequisites, automatically inject those prerequisites into the evaluation queue **as implied skills** marked with `is_implied: true`. This means:
- If user claims `react`, also queue `javascript` and `html` as implied prerequisites
- If user claims `state_management`, also queue `react`, `javascript`, `html`
- If user claims `cicd`, also queue `docker` and `git`
- Walk the full prerequisite closure (transitive) — not just direct parents

### Changes to `POST /api/skg/queue`:

Add a helper function `get_prereq_closure(skill_ids: set[str]) -> set[str]` that uses BFS/DFS over `_SKG_BY_ID` to find the full transitive prerequisite set.

Update `QueueSkill` model to add:
```python
is_implied: bool = False  # True = auto-added as a prerequisite, not explicitly claimed
```

In the endpoint logic:
1. Compute the prereq closure of all claimed skill IDs
2. For each implied prereq not already in the claimed set, add it to the queue with `is_implied=True` and `claimed_level="INTERMEDIATE"` (default)
3. Sort order: tier ascending → domain → implied skills last within same tier

---

## Step 7 — Run the seed script and verify

After all code changes are done:

```bash
cd backend
source venv/bin/activate

# Re-run the seed script to ingest all question banks
python scripts/seed_questions.py
```

Expected output should show:
- All 15 JSON files processed
- `javascript_core_question_bank.json` questions mapped to `skill_id: javascript`
- `mongodb.json` questions mapped to `skill_id: nosql`  
- All new skill questions (git, cicd, linux_basics, etc.) ingested correctly
- Zero validation failures after mapping is applied

Then verify via curl:
```bash
# Should return questions for javascript (from javascript_core_question_bank.json)
curl http://localhost:8000/api/evaluation/javascript/questions

# Should return questions for nosql (from mongodb.json)
curl http://localhost:8000/api/evaluation/nosql/questions

# Should return questions for git
curl http://localhost:8000/api/evaluation/git/questions

# SKG queue with react should auto-include javascript and html
curl -X POST http://localhost:8000/api/skg/queue \
  -H "Content-Type: application/json" \
  -d '{"claims": [{"skill_id": "react", "claimed_level": "EXPERT"}]}'
# Expected: queue contains react + javascript (implied) + html (implied)
```

---

## Step 8 — Update HANDOFF.md

After all steps are complete and verified, add a `## Prompt 07` section to `HANDOFF.md` documenting:
- What was done
- Files created and modified
- Curl verification results
- The full list of 26 canonical skill IDs now in the system

Set `Current Active Agent: Gemini (Planning/Review Mode)` and `Last Completed Prompt: prompts/07_json_integration_and_skg_expansion.md ✅` at the top.
