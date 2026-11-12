# G4 implementation ledger

Base: c26be2d. Branch: codex/g4-polish-and-qa. Requirements: docs/ArduHub_G4_polish_and_qa.md.

- G15: complete locally; twelve evidence-based achievements, profile collection, one-time notification and explicit one-time 5-spark reward. New migration verified locally, not applied to production.
- G16: complete; actual-product landing, free plan, newsletter copy and landing copy checks.
- G17: complete; 47 distinct browser scenarios including separate performance run, mobile/reduced motion, copy/mentor checks, screenshots, axe without serious/critical violations, Lighthouse accessibility 100/100 on /app. See G4_polish_progress.md.

## Rulings

- Both optional tasks are included under the user's instruction to execute this file.
- Achievement reward is five sparks per sticker. The notification is nonblocking; the learner explicitly collects its reward. This preserves attention and existing lesson/shop balances until collection. Uncollected rewards remain available from the profile.
- Evidence is recorded only from actual successful actions; no fabricated historical mentor questions, projects, speed streaks or rankings. Speed can span consecutive blitz runs (a run has six questions); a wrong answer resets the chain.
- Account rewards require a new checked/idempotent database migration, tested locally only. No production schema/deploy changes in this task.
- Existing untracked outputs/ and docs/assets/ remain outside this change.
- Requested model split: Sol6.1 for development, Luna for small checks and focused UI fixes.
