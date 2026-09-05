# FamPoll

Family decisions, one round at a time. Polls grouped around an event (a trip, a birthday, Friday dinner), narrowed down in rounds, with a running record of what was decided and one link to share back into the family chat.

- Product brief: [`docs/BRAINSTORM.md`](docs/BRAINSTORM.md) (concepts, critiques and landscape scan in [`docs/BRAINSTORM-APPENDIX.md`](docs/BRAINSTORM-APPENDIX.md))
- Screen designs (source for the design canvas): [`design/`](design/)

## Stack

| Piece | Choice |
| --- | --- |
| App | Next.js 16 (App Router, server actions), React 19, TypeScript |
| Styling | Tailwind CSS 4 with the palette in `src/app/globals.css` |
| Auth | Clerk (Google, Apple, Facebook sign-in; prebuilt components) |
| Data | Postgres via Drizzle ORM (`postgres` driver, works with Neon, Supabase, Railway, local) |
| Hosting | Vercel, linked to this repo |

The app deploys green with **no secrets set**: every protected route redirects to `/setup`, which shows which environment variables are still missing (presence only, never values). Once the variables exist and the schema is pushed, the same deployment comes alive.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in Clerk keys and a DATABASE_URL
npm run db:migrate           # creates the tables (the build does this too)
npm run dev                  # http://localhost:3000
```

Other scripts: `npm test` (rounds engine), `npm run typecheck`, `npm run lint`, `npm run db:generate` (writes SQL to `drizzle/` after a schema change; the next build applies it), `npm run db:studio`.

## Connect the integrations (once)

1. **Clerk** (sign-in): in the Vercel project, *Integrations → Browse Marketplace → Clerk → Install*, which creates the Clerk application and adds `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` for you. (Without the marketplace: create an app at dashboard.clerk.com and paste those two keys under *Settings → Environment Variables*.) Then in the Clerk dashboard, *SSO connections → Add connection*, pick Google, Apple and Facebook. In a development instance all three work immediately on Clerk's shared credentials; nobody needs a Google Cloud, Apple Developer or Meta account to try the app. Going to production later means a `pk_live_` / `sk_live_` instance with your own provider credentials (Apple needs an Apple Developer membership, Facebook needs a Meta app switched to Live).
2. **Database**: in the Vercel project, *Storage → Create → Neon Postgres*. Vercel adds `DATABASE_URL` for you. The build runs pending migrations itself (`scripts/migrate.mjs`), so there is nothing to run by hand.
3. **App URL** (optional): `NEXT_PUBLIC_APP_URL=https://your-domain` so share links are stable.
4. **Brand name** (optional): `NEXT_PUBLIC_BRAND_NAME` and `NEXT_PUBLIC_BRAND_TAGLINE` rename the product everywhere it shows (`src/lib/brand.ts` holds the defaults). "FamPoll" is a working name.
5. Redeploy. `/setup` should show every step ticked.

## How the app is organised

```
src/app/                 routes (mobile-first, server components + server actions)
  page.tsx               landing and sign-in
  app/                   the signed-in app: home, family, events, decisions
  join/[code]            invite link
  s/[token]              public read-only "what we've decided" summary
  setup                  integration checklist
src/lib/engine/rounds.ts the rounds engine: pure functions, unit-tested
src/lib/lifecycle.ts     closing a round and what follows (advance, decide, tie)
src/lib/actions/         server actions (family, events, decisions and votes)
src/lib/queries.ts       read models for each screen
src/lib/db/schema.ts     Drizzle schema
src/proxy.ts             Clerk route protection (Next 16 proxy, was middleware)
design/                  .dc.html artboards for the design canvas
docs/                    product brief
```

## The rounds model in one paragraph

A **decision** belongs to an **event** and has a plan: a quick vote (one final round), a shortlist then a final, or ideas then shortlist then final. In an **ideas** round people add options and nobody votes. In a **shortlist** round each person picks up to two, and the top two advance (everyone tied at the cut line advances; options with zero votes drop). In a **final** everyone picks one. A round closes when its deadline passes or as soon as every seat in the family has voted, and the next round opens by itself. A tied final asks the organizer to run a tiebreak between the tied options or just call it. The organizer can always close a round early, give it more time, reopen the last round, decide by hand, or set a decision aside. Kids and relatives without a phone get a **proxy seat** that an adult votes from.
