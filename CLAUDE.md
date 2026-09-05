# FamPoll

Family voting app: decisions grouped under events, settled in rounds. Next.js 16 App Router, Clerk, Drizzle + Postgres, Tailwind 4. Deployed on Vercel (project `fam-poll`).

## Commands

- `npm run dev` / `npm run build` / `npm start`
- `npm test` runs the rounds engine tests (`src/lib/engine/rounds.test.ts`)
- `npm run typecheck`, `npm run lint`
- `npm run db:push` applies the schema to `DATABASE_URL`; `npm run db:generate` writes SQL to `drizzle/` after a schema change

## Where things live

- `src/lib/engine/rounds.ts` is the only place that knows the voting rules. Keep it pure and tested.
- `src/lib/lifecycle.ts` closes rounds and applies what follows. Deadlines are settled lazily on page load (`settleDueRounds`); there is no cron.
- Server actions in `src/lib/actions/`. User-facing validation errors go through `fail()` in `src/lib/flash.ts` (a redirect with `?error=`), because production hides thrown error text.
- Read models in `src/lib/queries.ts`; pages under `src/app/` are server components with plain HTML forms.
- `src/proxy.ts` is the Next 16 replacement for middleware. It redirects protected routes to `/setup` when Clerk keys are missing so the app deploys green without secrets.
- `design/` holds the `.dc.html` artboards for the design canvas; `docs/BRAINSTORM.md` is the product brief.

## Conventions

- Mobile-first, one column, max width `max-w-md`. Palette and fonts are Tailwind theme tokens in `src/app/globals.css` (paper, ink, accent, teal). Orange means "needs you", teal means "decided".
- Every seat in a family can vote, including proxy seats (`members.userId` null, `managedByUserId` set). Eligibility for early close counts all seats.
- Never expose env values; `/setup` shows presence only.
