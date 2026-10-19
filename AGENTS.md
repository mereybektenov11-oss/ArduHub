# ArduHub project instructions

- Follow `docs/ArduHub_landing_spec.md`. The user has now requested all remaining tasks in this session; this overrides the original session split.
- Current stack: Next.js App Router, React, TypeScript, Tailwind CSS, motion, pnpm.
- The supplied ArduHub specification overrides inherited instructions for other projects (Ocean Rings, GSAP, medical copy).
- Before a numbered task, review the specification's design system, content deck and images in `reference/`.
- Keep Russian visible copy in `src/content/ru.ts`, colors and spacing in tokens.
- Keep demonstration data explicit. Counts, pricing, working editor, AI and access must not be presented as available without evidence.
- Run build and lint after each task. Keep progress in `docs/progress.md`.
- Local code compilation is enabled via the authenticated loopback gateway in `compiler-service/server.mjs` with `LOCAL_COMPILER=true` in ignored local env. It uses the installed Arduino CLI for trusted local development. Keep Docker as the default for public/untrusted compilation; never describe native mode as isolated. See `compiler-service/README.md`.
- Supabase project ArduHub (`wjdxephhhedxertzgjnu`) was created and connected on 17.10.2026 with the user's approval. Email confirmation is disabled for this prototype with explicit approval; custom SMTP is not configured. Production is https://arduhub.vercel.app in Vercel scope merey4/project arduhub. See `docs/vercel-deployment.md` for current cloud verification and compiler limitations.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
