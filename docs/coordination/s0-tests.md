# S0: перенос тестов по файлам

Было: 403 теста / 57 файлов. Исходные числа взяты из JSON-отчёта Vitest P-01. Все исходные проверки сохранены; смешанные файлы разделены по зависимости от сайта.

| Original tests/unit file          | Before | Root after | arduino-core after |
| --------------------------------- | -----: | ---------: | -----------------: |
| account-award-persistence.test.ts |      1 |          1 |                  0 |
| achievementQueue.test.ts          |      1 |          1 |                  0 |
| achievements.test.ts              |     17 |         17 |                  0 |
| arduino-interpreter.test.ts       |     13 |          0 |                 13 |
| auth-recovery.test.ts             |      1 |          1 |                  0 |
| cabinet-checker.test.ts           |      6 |          0 |                  6 |
| cabinet-progress.test.ts          |     13 |         13 |                  0 |
| cabinet-video.test.ts             |      1 |          1 |                  0 |
| compile-routing.test.ts           |      5 |          5 |                  0 |
| compiler-client-retry.test.ts     |      3 |          3 |                  0 |
| compiler-probe.test.ts            |      7 |          7 |                  0 |
| copy-policy.test.ts               |     14 |         14 |                  0 |
| course-state-review.test.ts       |      2 |          2 |                  0 |
| course-state.test.ts              |      7 |          7 |                  0 |
| dashboard-awards.test.ts          |      3 |          3 |                  0 |
| dashboard-sync.test.ts            |      3 |          3 |                  0 |
| dashboard.test.ts                 |     10 |         10 |                  0 |
| db.test.ts                        |      6 |          6 |                  0 |
| filterSchemes.test.ts             |      5 |          5 |                  0 |
| g3-streak-missions.test.ts        |      3 |          3 |                  0 |
| h-mentor.test.ts                  |      5 |          5 |                  0 |
| h-overlay-queue.test.ts           |      2 |          2 |                  0 |
| h-overlay-registry.test.ts        |     13 |         13 |                  0 |
| hex-cache.test.ts                 |      2 |          2 |                  0 |
| import-awards.test.ts             |      5 |          5 |                  0 |
| kids-pages.test.ts                |      7 |          7 |                  0 |
| kids-settings.test.ts             |      2 |          2 |                  0 |
| landing-product.test.ts           |      5 |          5 |                  0 |
| learning-compiler.test.ts         |      6 |          6 |                  0 |
| learning-contracts.test.ts        |      6 |          6 |                  0 |
| learning-course.test.ts           |     13 |          0 |                 13 |
| learning-hardware.test.ts         |     20 |          0 |                 20 |
| learning-logic.test.ts            |      8 |          1 |                  7 |
| learning-placement.test.ts        |      3 |          0 |                  3 |
| learning-stream.test.ts           |      9 |          9 |                  0 |
| learning-v2.test.ts               |     14 |          4 |                 10 |
| learning-video.test.ts            |      2 |          2 |                  0 |
| lesson-flow.test.ts               |      4 |          4 |                  0 |
| lesson-prefetch.test.ts           |      1 |          1 |                  0 |
| lesson-quiz.test.ts               |     16 |         16 |                  0 |
| map-nodes.test.ts                 |      4 |          4 |                  0 |
| mentor-nudge.test.ts              |      7 |          7 |                  0 |
| mentor.test.ts                    |      6 |          6 |                  0 |
| onboarding.test.ts                |      3 |          3 |                  0 |
| polish-compiler.test.ts           |      8 |          8 |                  0 |
| quiz-practice-transition.test.ts  |      2 |          2 |                  0 |
| rateLimit.test.ts                 |      2 |          2 |                  0 |
| sfx.test.ts                       |     20 |         20 |                  0 |
| streak-calendar.test.ts           |      4 |          4 |                  0 |
| streak-visual-state.test.ts       |      9 |          9 |                  0 |
| submitWaitlist.test.ts            |      5 |          5 |                  0 |
| supabase-fetch.test.ts            |      3 |          3 |                  0 |
| texture-button.test.ts            |     20 |         20 |                  0 |
| thematic-icons.test.ts            |      4 |          4 |                  0 |
| two-led-completion.test.ts        |      7 |          0 |                  7 |
| validators.test.ts                |     22 |         22 |                  0 |
| waitlist.test.ts                  |     13 |         13 |                  0 |

New: arduino-core/core-headless.test.ts (1), curriculum/materials.test.ts (1).
Total after: root 324 / 51 files, core 80 / 9 files, curriculum 1 / 1 file = 405 / 61 files.
Mixed storage, flow, quiz, compile API, progress and mentor tests stay in the site. Split logic and v2 assertions retain their original names.
