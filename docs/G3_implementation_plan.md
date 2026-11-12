# G3 implementation ledger

Plan: docs/ArduHub_G3_motion_sound_icons.md. Base: b84174b. Branch: codex/g3-motion-sound-icons.

User choice: development agents GPT-6.1 Sol; small auxiliary tasks GPT-6 Luna. Additional Luna dispatch hit the thread limit; no repeated attempts or model substitution.

## Sequence

1. G8 original thematic SVG family, streak state, icon gallery and replacement of counters/path icons. Sol implementer; parent reviews and verifies build/lint/tests.
2. G9 shared Web Audio engine, settings and gesture activation; parent implements. Event wiring completed alongside the respective UI task.
3. G10 bounded event feedback, quiz/practice/workspace/rewards and path transitions.
4. G11 natural-size map overlay, landmarks, touch zoom/pan and developer editor.
5. G12 confirmed purchases, inventory/equip, animated balances and denial.
6. G14 actual activity calendar, once-per-day mission reward and streak transitions.
7. Integrated browser checks, reduced motion, final review, documentation and local checkpoint.

## Rulings

- The supplied plan already selects the design and default sound behavior; implementation proceeds without another design approval.
- Use existing palette and primitives. 21st catalog search requires login; use local project components and original SVG work. No external generation dependency.
- Public deployment and production database changes are outside this local implementation.
- Preserve untracked outputs/ and docs/assets/ (cover image from a separate request).
- G12 confirmation threshold is >=60 sparks, following the implementation paragraph; this also covers the acceptance case >60.

## Status

- G8: implemented and checked (icons/streak tests, gallery browser state checks, build/lint).
- G9: implemented and checked (all 16 scores, gesture gate, throttle/concurrency, browser settings).
- G10: implemented and checked (full lesson, particle cleanup, reduced motion).
- G11: implemented and checked (natural dimensions, geometry, touch/editor, three widths and axe).
- G12: implemented and checked (confirmation, balance animation, double-click protection, equip, denial).
- G14: implemented and checked (idempotent reward, freeze/loss, known activity history).
- Final report: docs/G3_motion_progress.md. Final mobile/shop/home recheck: 14/14 passed; all 45 distinct browser scenarios covered. Local checkpoint ready.
