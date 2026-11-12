/** Presentation registry. Transient notices share the nonblocking popup layer. */
export const overlayRegistry = [
  {
    id: "completion",
    kind: "dialog",
    source: "src/components/lesson/CompletionModal.tsx",
  },
  { id: "level", kind: "dialog", source: "src/components/cabinet/LevelUp.tsx" },
  {
    id: "purchase",
    kind: "dialog",
    source: "src/components/shop/ShopPage.tsx",
  },
  { id: "chest", kind: "status", source: "src/components/feedback/Chest.tsx" },
  {
    id: "sticker",
    kind: "dialog",
    source: "src/components/profile/Stickers.tsx",
  },
  {
    id: "streak",
    kind: "status",
    source: "src/components/shell/DashboardShell.tsx",
  },
  {
    id: "freeze",
    kind: "status",
    source: "src/components/shell/DashboardShell.tsx",
  },
  {
    id: "save",
    kind: "dialog",
    source: "src/components/onboarding/SavePrompt.tsx",
  },
  {
    id: "name",
    kind: "dialog",
    source: "src/components/onboarding/NameDialog.tsx",
  },
  {
    id: "mentor",
    kind: "dialog",
    source: "src/components/mentor/MentorAssistant.tsx",
  },
  {
    id: "reward",
    kind: "status",
    source: "src/components/icons/RewardToast.tsx",
  },
] as const;
