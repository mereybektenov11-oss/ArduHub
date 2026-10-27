import { execFileSync } from "node:child_process";
const base = "b8befe9";
const git = (...args) =>
  execFileSync("git", args, { encoding: "utf8" })
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((s) => s.replace(/\\/g, "/"));
const exact = new Set([
  "scripts/check-scope.mjs",
  "docs/ArduHub_H_small_fixes.md",
  "docs/H_NOTES.md",
  "docs/progress.md",
  // User-authorized production release and authentication verification.
  ".vercelignore",
  "docs/vercel-deployment.md",
  "src/components/Header.tsx",
  "src/content/ru.ts",
  "src/components/auth/AuthCard.tsx",
  "src/domain/auth.ts",
  "src/lib/supabase/client.ts",
  // User-requested follow-up: correct two-LED lesson completion.
  "src/domain/checker/check.ts",
  "src/domain/scene/check.ts",
  "src/domain/lessons/content/index.ts",
  // Existing presentation call sites; behavior/content changes remain subject to review.
  "src/components/cabinet/ui/index.tsx",
  "src/components/cabinet/LevelUp.tsx",
  "src/components/feedback/Chest.tsx",
  "src/components/icons/RewardToast.tsx",
  "src/components/onboarding/NameDialog.tsx",
  "src/components/shop/ShopPage.tsx",
  "src/components/profile/Stickers.tsx",
  "src/components/cabinet/MentorChat.tsx",
  "src/components/mentor/MentorAssistant.tsx",
  "src/components/shell/RightRail.tsx",
  "src/components/shell/DashboardShell.tsx",
  "src/components/lesson/CompletionModal.tsx",
  "src/services/mentor/prompts.ts",
]);
const allowed = (p) =>
  exact.has(p) ||
  /^(src\/components\/(overlay|mentor)\/|src\/lib\/mentor[^/]*|src\/components\/shell\/StatBar[^/]*|src\/styles\/|tests\/)/.test(
    p,
  ) ||
  /^docs\/H_SCREENSHOTS\/(lesson-complete|mentor-long-history|home-counters)-(360|768|1440)\.png$/.test(
    p,
  );
// These directories were untracked before H began. Tracked modifications are never excluded.
const preexistingUntracked = (p) => /^(outputs\/|docs\/assets\/)/.test(p);
const tracked = git("diff", "--name-only", base, "--");
const untracked = git("ls-files", "--others", "--exclude-standard").filter(
  (p) => !preexistingUntracked(p),
);
const files = [...new Set([...tracked, ...untracked])].sort();
const rejected = files.filter((p) => !allowed(p));
if (rejected.length) {
  console.error("Out-of-scope changes:\n" + rejected.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    `H scope OK: ${files.length} changed files compared with ${base} (including working tree and new files).`,
  );
