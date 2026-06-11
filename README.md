# SkillProof 

**Deterministic proof that a candidate actually knows what they claim to know.**

SkillProof replaces the trust in self-reported resume skills with a traceable, deterministic reasoning chain—resume claim goes in, structured verdict comes out, and every step is auditable._

SkillProof is built for the CodeWiser VJTI Hackathon ("AI Without the API: Deterministic Intelligence"). It addresses a fundamental hiring problem: candidates routinely overclaim their software skills, and existing systems lack a deterministic, structured way to verify those claims without relying on black-box heuristics or expensive human interviews. SkillProof is a career system (Domain 2) that fundamentally shifts skill verification from probabilistic guessing to deterministic proof.

The system guides skill claims through a rigorous evaluation pipeline. It combines a strict rules engine, a precise state machine, and a multi-dimensional weighted scoring model. It doesn't just grade candidates; it tags their specific misconceptions and generates a granular verdict of their capabilities.

AI models (specifically Claude and Gemini) were instrumental _during development_ to engineer the architecture and dynamically generate the high-density question bank. However, **AI is explicitly NOT used at runtime.** The runtime environment is a pure, deterministic rules engine operating on structured data. The intelligence lives entirely within the evaluation architecture, the strict rule definitions, and the profound situational design of the question bank.

---

## The Intelligence Stack

The intelligence of SkillProof is not buried in an API call to a large language model. It is systematically encoded into the following deterministic mechanisms. Every sub-system performs a verifiable function in the evaluation chain.

### Rules Engine

Verdict generation follows explicit conditional rules that guarantee standardisation and traceability. A candidate claiming "Expert" status is held to a deterministically higher standard than one claiming "Intermediate".

- If a Tier 1 candidate claims **Expert** but their composite score is below 60% (0.60), the system deterministically outputs an **OVERCLAIM** verdict.
- If a Tier 1 candidate claims **Intermediate** but scores below 45% (0.45), the system likewise outputs **OVERCLAIM**.
- Tier 1 validation explicitly requires a score of >= 70% to trigger a **VERIFIED** status, while 50–69% resolves to **PARTIAL**.
- Tier 2 foundational skills follow a strict binary: composites >= 60% become **BASIC_VERIFIED**, while lower scores are mapped to **BASIC_UNVERIFIED**.
- The system extracts every unique `misconception_tag` from the selected wrong answers and logs them integrally to the evaluation record. This drives the generation of granular, actionable roadmaps entirely independent of the generic score percentages.

### State Machine

Every skill session acts as an autonomous state machine, controlling progression without ambiguity. Transitions occur across defined states: `NOT_STARTED` → `IN_PROGRESS` → `VERIFIED` or `FLAGGED`.

When a candidate fails verification and enters the `FLAGGED` state, a roadmap is automatically compiled from the SKG. When they subsequently re-attempt the skill, they enter a new `IN_PROGRESS` session and receive an entirely fresh question set. The engine tracks the historical delta between attempts, firing a specific "Significant improvement detected" rule when closing a previously flagged knowledge gap crosses a defined threshold.

### Scoring System

Knowledge is fundamentally multi-dimensional, so the scoring model is structurally weighted. The system independently scores Theory (conceptual understanding), Practical (situational application), and Edge Case (production-readiness). The composite score is calculated using a strict weighted average. Because the dimensions are independent, a candidate cannot use memorised theory to mask weaknesses in situational debugging or edge case application.

### Misconception Taxonomy

The scoring engine does more than count incorrect inputs. Every wrong answer option in the question bank carries a specific `misconception_tag` defining the exact knowledge gap that led to the error. When a candidate completes a session, the scoring engine clusters these tags and surfaces the dominant pattern. The final verdict does not merely report a low score; it returns a named, actionable concept that the user demonstrably misunderstands.

### Question Router

Question selection at runtime is executed deterministically by querying exactly 3 THEORY, 4 PRACTICAL, and 3 EDGE_CASE question per assessment natively within the database layer. A newly `FLAGGED` candidate re-entering evaluation is dynamically routed a unique configuration to deliberately prevent answer-memorization. The deterministic router guarantees that consecutive testing reflects actual knowledge improvement rather than repeated exposure to the exact same scenarios.

---

## Question Bank Design

The question bank is the most intellectually dense component of the architecture. It is designed to expose the difference between rote memorization and true situational engineering.

**Scale:** 26 fully mapped skills deeply integrated into an interconnected Skill Knowledge Graph across Web Development, Machine Learning, Databases, and DevOps.

**Structure per skill:**
The system is built on an extensible question taxonomy. Rather than overwhelming candidates with raw volume, evaluation sessions are tightly structured. The backend statically queries exactly 10 targeted questions per attempt. This execution forces a strict 3-dimensional testing configuration per session, consisting of exactly 3 Theory, 4 Practical, and 3 Edge Case challenge constraint.

This is achieved via three rigidly designed question categories:

1. **THEORY:** Designed to test core concepts where distractors represent authentic engineering misunderstandings. A candidate who half-understands the concept will reliably be drawn to a specific wrong answer, providing deterministic proof of their misconception.
2. **PRACTICAL:** Always situation-trapped. The candidate is forced to operate within specific metrics, production symptoms, or architectural conditions. A prompt does not ask for a definition—it presents a scenario. _Example:_ "You trained a model. Training RMSE is 4.2, test RMSE is 4.5. Your colleague says add L2 regularization. You disagree. Who is right and why?" The correct choice requires situational diagnosis, which cannot be defeated by simple recall.
3. **EDGE CASE:** Solely interpretation-based. The candidate receives raw output, sudden system behavior, or a cascading failure scenario and must trace the source. Because the scenario data is unique, memorization is useless. _Example:_ Reviewing a React component lifecycle where stale closures cause phantom updates—the student must trace the timeline and correctly identify the specific React dependency rule violation.

### The Four Question Design Principles

Our test construction adheres to four absolute rules:

1. **Wrong answers must be believably wrong.** Every distractor represents a genuine, recurring misconception held by partially-informed practitioners.
2. **Situational context forces application.** Every practical question embeds specific symptomatic data. Diagnosis is tested, not vocabulary.
3. **Reverse the question direction.** Instead of asking "what does X cause?", the prompt demands: "you are observing Y—what caused it?"
4. **Every explanation teaches.** The reasoning attached to each option not only justifies the right answer but breaks down precisely why the other options represent a particular failure model.

**Misconception Tagging In Practice:**
Options acting as distractors are tracked with explicitly configured `misconception_tag` labels. Actual examples from our dataset include `usecallback_reads_latest_state`, `no_dep_array_runs_once`, and `zero_is_falsy_renders_nothing`. Rather than serving as cosmetic labels, these directly power the verdict engine's aggregation logic to extract deep diagnostic insight.

---

## Traceable Output Examples

The intelligence of the system culminates in the generated verdict. Instead of returning a raw numerical score, the engine computes a heavily contextualized outcome based on its distinct rules.

**Initial Attempt Verdict**

```text
Input: Candidate claims Expert in Random Forest
Composite Score: 38%
Theory: 52% | Practical: 28% | Edge Case: 41%
Prerequisite check: Decision Trees — NOT CLEARED


Verdict: OVERCLAIM
Reason: R05 rule fired (Expert tier 1 composite < 0.60)
Misconception Tags Logged: ["missing-regularization-intuition", "overfitting-vs-underfitting"]
```

When this candidate inevitably enters the `FLAGGED` state, follows the SKG roadmap, and returns for re-evaluation, the determinism tracks the transition.

**Re-evaluation Output**

```text
Session 1: Score 38% → State: FLAGGED → Roadmap: study Decision Trees, practice bagging
Session 2: Score 65% → State: VERIFIED
System output: "Skill verified. Gap closed from 22 points below threshold to 5 points above."
```

---

## Deterministic Execution: No LLM at Runtime

To be perfectly clear regarding system operations: Large Language Models (Claude, Gemini) were employed exclusively during the development phase to draft question data, formulate testing architecture, and construct the codebase framework. The deployed application makes zero generative AI API calls at runtime. Every single score, routing path, roadmap generation, and aggregated misconception tag is the pure consequence of hard-coded, deterministic logic evaluating engineered data. The intelligence is wholly encapsulated in the system design.

---

## Architecture Overview

The system processes validation through a cleanly separated, stateless pipeline. A raw resume string is ingested, enabling a regex and taxonomy lookup protocol to construct a base skill profile. The system initializes session states, allowing the deterministic router to fetch the specific questions corresponding to those skills.

When answers are submitted, the evaluation engine isolates Theory, Practical, and Edge Case dimensions, computing the composite score against the claimed level. The Rules Engine fires concurrently, checking the SKG prerequisites, dimension thresholds, and taxonomy tags. The system assembles the final, auditable verdict and resulting progression roadmap.

The technology stack is strictly divided into two distinct environments:

- **Backend**: Python, FastAPI, and PostgreSQL (via SQLModel) running a stateless JSON question engine.
- **Frontend**: Custom React 19 application built with Vite, styled with TailwindCSS, utilizing Zustand for reactivity and `localStorage` to securely anchor state transitions.

The system is fortified by an extensive test suite verifying the strict evaluation rule boundaries and state transitions.

---

## Active Skill Coverage

The SKG evaluates across four core domains containing interconnected logic trees and gating prerequisites. The skill graph scales precisely to these twenty-six core foundational pillars:

| Skill                      | Tier | Domain |
| :------------------------- | :--: | :----- |
| HTML                       |  2   | Web    |
| CSS                        |  2   | Web    |
| JavaScript                 |  1   | Web    |
| React                      |  1   | Web    |
| Python                     |  1   | Web    |
| Java                       |  1   | Web    |
| C++                        |  1   | Web    |
| Node.js                    |  1   | Web    |
| Express.js                 |  1   | Web    |
| FastAPI                    |  1   | Web    |
| SQL                        |  1   | DB     |
| NoSQL                      |  1   | DB     |
| REST API                   |  1   | Web    |
| Docker                     |  2   | DevOps |
| System Design              |  1   | Web    |
| Git                        |  2   | DevOps |
| CI/CD                      |  1   | DevOps |
| Linux Basics               |  2   | DevOps |
| DB Indexing & Optimisation |  1   | DB     |
| DB Transactions & ACID     |  1   | DB     |
| State Management           |  1   | Web    |
| Linear Regression          |  1   | ML     |
| Logistic Regression        |  1   | ML     |
| Decision Trees             |  1   | ML     |
| Random Forest              |  1   | ML     |
| ML Model Evaluation        |  1   | ML     |

_(Note: Prerequisite paths mapped internally via `backend/data/skill_graph.json` ensure foundational skills like SQL and JavaScript block assessments over dependent node targets)._

---

## Running the Architecture

To compile and review the architecture locally across the stateless backend and reactive frontend.

### Prerequisites

- **Python:** 3.10+
- **Node.js:** 20.x+ (Includes `npm`)
- **Git**

### Launching on macOS / Linux

**1. Initialize the FastAPI Backend**

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 scripts/seed_questions.py
uvicorn main:app --reload
```

**2. Initialize the React Frontend**

```bash
# Open a new terminal instance
cd SkillProof
npm install
npm run dev
```

### Launching on Windows

**1. Initialize the FastAPI Backend**

```cmd
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python scripts\seed_questions.py
uvicorn main:app --reload
```

**2. Initialize the React Frontend**

```cmd
:: Open a new Command Prompt or PowerShell
cd SkillProof
npm install
npm run dev
```
