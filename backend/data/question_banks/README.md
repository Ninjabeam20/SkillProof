# Question Banks Directory

Place your `.json` question bank files here. Each file should contain an array of questions following the SkillProof question schema.

## File Format

Each `.json` file must be an array of question objects:

```json
[
  {
    "question_id": "unique_id_here",
    "skill_id": "one_of_15_canonical_ids",
    "question_type": "THEORY | PRACTICAL | EDGE_CASE",
    "question_text": "The question text",
    "options": [
      { "id": "A", "text": "Option A" },
      { "id": "B", "text": "Option B", "misconception_tag": "some-tag" },
      { "id": "C", "text": "Option C", "misconception_tag": "some-tag" },
      { "id": "D", "text": "Option D", "misconception_tag": "some-tag" }
    ],
    "correct_option_id": "A",
    "explanation": "Why A is correct"
  }
]
```

## Canonical Skill IDs (15 total)

`javascript`, `python`, `java`, `system_design`, `cpp`, `html`, `css`, `nodejs`, `expressjs`, `fastapi`, `sql`, `nosql`, `rest_api`, `docker`, `react`

## Ingestion

Run the seed script to bulk-load all files:

```bash
cd backend
source venv/bin/activate
python scripts/seed_questions.py
```
