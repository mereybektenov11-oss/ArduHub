import type { Config } from "tailwindcss";

// CSS variables are the only source of palette values.
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontSize: {
        "page-title": ["var(--type-page-title)", { lineHeight: "1.25" }],
        "section-title": ["var(--type-section-title)", { lineHeight: "1.36" }],
        "card-title": ["var(--type-card-title)", { lineHeight: "1.44" }],
        body: ["var(--type-body)", { lineHeight: "1.5" }],
        "body-small": ["var(--type-body-small)", { lineHeight: "1.43" }],
        caption: ["var(--type-caption)", { lineHeight: "1.38" }],
        "group-label": ["var(--type-group-label)", { lineHeight: "1.33" }],
        button: ["var(--type-button)", { lineHeight: "1.5" }],
        stat: ["var(--type-stat)", { lineHeight: "1.25" }],
      },
      colors: {
        ink: { 900: "var(--ink-900)", 800: "var(--ink-800)" },
        forest: { 700: "var(--forest-700)" },
        cream: { 50: "var(--cream-50)", 100: "var(--cream-100)" },
        amber: { 500: "var(--amber-500)", 600: "var(--amber-600)" },
        "text-dark": "var(--text-dark)",
        "text-light": "var(--text-light)",
        error: "var(--error)",
        success: "var(--success)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        display: ["var(--font-manrope)", "sans-serif"],
      },
      maxWidth: { content: "var(--content-width)" },
      borderRadius: {
        card: "var(--radius-card)",
        pill: "var(--radius-pill)",
      },
      spacing: { section: "var(--space-section)" },
    },
  },
} satisfies Config;
