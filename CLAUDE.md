# FamPoll

Family voting app: decisions grouped under events, settled in rounds. Next.js 16 App Router, Clerk, Drizzle + Postgres, Tailwind 4. Deployed on Vercel (project `fam-poll`).

## Commands

- `npm run dev` / `npm run build` / `npm start`
- `npm test` runs the unit tests (`src/**/*.test.ts`: the rounds engine and the format helpers)
- `npm run typecheck`, `npm run lint`
- `npm run db:generate` writes SQL to `drizzle/` after a schema change; `npm run build` (and Vercel) applies pending migrations first via `scripts/migrate.mjs`, skipping when `DATABASE_URL` is unset. Because migrations run at build time, every migration must be backward-compatible with the previous deployment (add columns as nullable or with defaults, never drop or rename in the same release), so a rollback or an in-flight request keeps working. The runner holds a Postgres advisory lock, so concurrent builds serialize. Exception: a release that adds a privacy flag the previous build ignores (`votes.anonymous` in 0003) is roll-forward only, because rolling back would show hidden ballots by name; fix forward instead of using Vercel's Instant Rollback past it.

## Where things live

- `src/lib/engine/rounds.ts` is the only place that knows the voting rules. Keep it pure and tested.
- `src/lib/lifecycle.ts` closes rounds and applies what follows. Deadlines are settled lazily on page load (`settleDueRounds`); there is no cron.
- Server actions in `src/lib/actions/`. User-facing validation errors go through `fail()` in `src/lib/flash.ts` (a redirect with `?error=`), because production hides thrown error text.
- Read models in `src/lib/queries.ts`; pages under `src/app/` are server components with plain HTML forms.
- `src/proxy.ts` is the Next 16 replacement for middleware. It redirects protected routes to `/setup` when Clerk keys are missing so the app deploys green without secrets.
- `design/` holds the `.dc.html` artboards for the design canvas; `docs/BRAINSTORM.md` is the product brief.

## Conventions

- Mobile-first, one column, max width `max-w-md`. Palette and fonts are Tailwind theme tokens in `src/app/globals.css` (paper, ink, accent, teal). Orange means "needs you", teal means "decided".
- A person belongs to many **groups** (the `families` table; "group" is the user-facing word, "family" the internal one). `members` holds one seat per person per group (`members_family_user_unique`); the old one-group-per-person index was dropped in 0005. One group is **active** at a time, held in the `fp_group` cookie (`src/lib/group.ts`), resolved with a fall-back to the person's first group when the cookie is missing or stale. Home, the People page and new events use the active group; event and decision pages/actions resolve the viewer's seat from the entity's own group (`membershipFor`, `eventData`/`decisionData` take a `userId`), so an item in any group opens whichever group is active. The group switcher and People-page forms carry an explicit `familyId`. Organizers can add someone straight into a group when they already share another group (`addExistingUserToGroup`), the same trust that mints a proxy seat.
- Every seat in a family can vote, including proxy seats (`members.userId` null, `managedByUserId` set). Only organizers create proxy seats; organizer is the app's adult role. Eligibility for early close counts all seats.
- A decision has three choices (A or B fixes the plan to a quick vote and freezes its two options): format (what an option is: text, long text, dates; exactly one), vote type (how each voting round is voted: A or B, multiple choice, pick several) and plan (the rounds: quick, shortlist then final, ideas then shortlist then final). Round kinds are stages and never imply how you vote; the engine's `nominalPicks` / `effectivePicks` are the only source of the pick cap, and the cap is checked inside the round lock.
- Ballots are sealed while a round is open: `decisionData` returns other seats' participation but not their picks, and nothing renders live tallies, organizers included. Results show after the round closes.
- Hidden votes (`votes.anonymous`, pre-set by `members.votesHidden`) are counted and recorded under the seat, never attributed. If any ballot in a round is hidden, that round renders counts only, because names plus counts plus public participation would identify it by subtraction. After close a seat can "show its hand" (one way). A seat that leaves the family keeps its closed-round ballots (`votes.memberId` set null, migration 0004) so settled counts never shift; only its open-round ballots go.
- Anonymous questions and ideas (`decisions.anonymous`, `options.anonymous`) keep their author in `createdByMemberId` / `addedByMemberId` for rights, but never in the UI, the log text, or `activity.actorMemberId`; organizer actions on an anonymous decision are logged as "Someone", because naming organizers while veiling the asker would reveal the asker is not one.
- Never expose env values; `/setup` shows presence only.
- The product name is a working name. Read it from `brand` in `src/lib/brand.ts` (env `NEXT_PUBLIC_BRAND_NAME`); never type it into UI copy or metadata.
