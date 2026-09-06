<!-- Generated 2026-09-06 from a brainstorm pass over the SHIPPED app (schema, engine, all
server actions, read models, screens) rather than the original brief. Every idea below is
incremental on what exists today and is judged against the product's stated guardrails. Effort
is rough: S = a sitting, M = a weekend, L = multiple weekends or an architectural change. Where
an idea leans on a schema change, the note says how to keep the migration backward-compatible,
because migrations run at build time (see CLAUDE.md). This is a menu to choose from, not a plan. -->

# FamPoll — new feature ideas

The core loop works: groups of seats, events holding ordered decisions, decisions settled in
rounds by a pure engine, sealed ballots, an append-only log, and one link back into the family
chat. This document is about what to build **next**, layered on that, without turning FamPoll into
something it deliberately isn't.

## Where the app is today (the baseline these ideas build on)

Already shipped and working:

- **Identity & groups** — Clerk sign-in; a person belongs to many **groups**, one active at a
  time (cookie + switcher); proxy seats for people without accounts; organizer/member roles;
  add-someone-you-share-a-group-with; invite-link rotation; per-seat "hide my votes".
- **Events & decisions** — events (trip/outing/meal/party/other, optional dates, status); decisions
  with three independent choices (format: text / long text / dates; vote type: A-or-B / pick one /
  pick several; plan: quick / shortlist→final / ideas→shortlist→final); a date winner can set the
  event's dates.
- **The engine** — stages (ideas, shortlist, final), pick caps, quorum, auto-close on
  everyone-voted, cut-with-ties, tiebreak, plain-words round labels. Pure and unit-tested.
- **Voting & privacy** — cast / change / skip; hidden ballots (counts-only results when any ballot
  in a round is hidden); "show your hand" after close; anonymous asks and ideas; proxy voting with
  "(via Shai)" attribution.
- **Organizer powers** — close now, extend, reopen, decide by hand, tiebreak, remove/edit option,
  set aside / bring back, reorder, delete. Every one writes a log line.
- **The record & sharing** — home "Needs your vote" inbox; the event page as a receipt; a public
  `/s/<token>` summary; **text-only** OG cards on `/join` and `/s`; Copy-for-Messenger components.
- **Plumbing** — lazy deadline settlement (no cron), i18n message catalog, refetch-on-focus (no
  polling, no realtime), deploys green with no secrets.

What is **deliberately not** built (from the brief, still the right calls): notifications to family
members, realtime/cron, ranked choice, comments/threads, trip itineraries/budgets/packing, a
voting-method zoo, templates, streaks, anonymous-by-default. New ideas are measured against these.

## Principles every idea here is held to

1. **The chat stays the chat.** FamPoll never messages family members. The organizer is the
   courier; our job is to hand them copy-ready text and a link.
2. **Family scale, not sixty.** Six people who mostly trust each other. No feature should cost the
   organizer a config screen for the common case.
3. **Decide, record, hand off.** We are the tally and the record. We do not become a travel app; we
   link out to the tools that are.
4. **Sealed while open.** Nothing reveals picks (or lets anyone infer them) before a round closes.
5. **Backward-compatible always.** Add columns nullable/with defaults; never drop or rename in the
   same release. A rollback or an in-flight request must keep working.

---

## Recommended shortlist (highest value for the least risk)

These four are the strongest first bets: each is squarely on-philosophy, each is small, and each
attacks a stated failure mode (rounds dying at the deadline; the app being forgotten between trips;
the record never reaching the people who don't sign in).

1. **Nudge text for an open round** (§B1) — the sanctioned nag, built from data we already compute.
2. **The family's decision history** (§A1) — the retention hook the brief called out and no rival has.
3. **Vote for the whole household in one pass** (§B3) — kills the real friction a parent hits every round.
4. **Ask again / duplicate a decision** (§C1) — makes "Friday dinner, every week" work with no cron.

---

## A. The record & sharing (our reason to exist)

### A1. The family's decision history — a "Decided" view across all events · **M**
**What.** A screen (a tab on Home, or `/app/decided`) listing every settled decision across the
active group's events, newest first: "Fall break · Where? → **Lisbon** (final, 5–1) · Jun 2". Filter
by event, search by title. Later: across all your groups.
**Why it fits.** Requirement 2 of the whole product is "keep track along the way," and the landscape
scan found *no competitor* does a cross-event decision log — it's the retention hook. Today the log
is per-event; the moment a family runs two trips, "what did we decide about the hotel last year?"
has no home.
**Build.** New read model over `decisions` where `status = 'decided'` joined to their events and
outcome options, ordered by `decidedAt`. No schema change (`decidedAt`, `outcomeOptionId` already
exist; `decisions_event_idx` is there). One new page. Reuses existing card styling.

### A2. One-tap result share on every decided card · **S**
**What.** Next to each decided decision, a Copy button that yields "**Friday dinner: Taco Palace**
(round 2, 4–2)" — the single-line receipt, ready to paste back into Messenger.
**Why it fits.** Closing the loop is the point; the arguing happened in chat, the result should go
back to chat as text. We already have the Copy-for-Messenger component and the tally data.
**Build.** A small text builder from the decision + its final round's `result`/votes + outcome, wired
to the existing copy component. No schema change.

### A3. OG **image** cards with an "as-of" stamp · **M**
**What.** Replace the text-only unfurl on `/s/<token>` (and `/join`) with a rendered card:
"Fall break 2026 — 3 of 5 decided, 1 open · as of Sat 4pm". Append `?v=<n>` so a fresh paste never
shows Messenger's stale cache.
**Why it fits.** The Messenger paste is the product's front door; a real card earns the tap. This was
an explicit *time* cut in the MVP ("text-only OG"), not a cut on principle — so it's a legitimate
"now."
**Build.** A `next/og` `ImageResponse` route reading `summaryByToken` (works on Vercel). For `?v=`,
either derive a version from the event's latest activity row, or add `events.ledgerSeq int default 0`
(backward-compatible: old builds ignore it). **Note:** keep the image *derived from data we already
show publicly* — no names beyond what `/s` shows.

### A4. Hand-off links from an outcome — calendar & maps · **S–M**
**What.** On a decided **dates** decision, an "Add to calendar" (`.ics`) link. On a decided text
decision that reads like a place ("Taco Palace"), an "Open in Maps" search link.
**Why it fits.** This is "decide, record, **hand off**" done literally — the brief's answer to scope
creep. We stay a decision tool and let Calendar/Maps be themselves.
**Build.** `.ics` is a tiny generated text route from the event/outcome dates; the maps link is a
URL template. No schema change. (Keep it opt-in and unobtrusive — a small link, not a banner.)

---

## B. Getting rounds to close (the #1 failure mode)

### B1. Nudge text for an open round · **S** ⭐
**What.** On any open round, a Copy button for the organizer: "**Still waiting on Nana and Eli** —
vote by 8pm: `<link>`". On the Home inbox and the decision page.
**Why it fits.** Rounds die at the deadline with no quorum; the brief's fix everywhere is a one-tap
nag the organizer sends *by hand* in Messenger. We already compute `pendingSeats` and `votedNames`
in `homeData`/`decisionData` and the deadline is on the round — this is surfacing what we have.
**Build.** A text builder + the existing copy component. No schema change, no engine change. This is
the cheapest high-value thing on the list.

### B2. Vote-for-the-household in one pass · **M** ⭐
**What.** When you manage proxy seats, one screen votes for all of them (and you) together —
"You: Alfama · Noa: Alfama · Eli: Cascais" — instead of switching seats one at a time.
**Why it fits.** A parent of two currently casts three separate ballots per round; that friction is
exactly why kids' votes get faked or skipped. The appendix flagged the "household ballot" as a
must-fix.
**Build.** A new action that accepts `{memberId: optionIds}` for the seats the caller manages and
loops the existing single-seat vote logic inside one transaction (same locks, same cap checks, same
`castByUserId`). New UI on the vote form. Engine unchanged.

### B3. Organizer-only reminders (opt-in) · **L**
**What.** The organizer alone can opt a round into "remind me": a web-push or email ping —
"2 hours left on 'Where to eat', 3 people missing." Never to family members.
**Why it fits.** Respects "the app never messages family" — this is the organizer nudging
themselves, and organizer email was already a v1 line item.
**Build & tension.** This is the biggest infra step and pushes on two guardrails (no notifications,
no cron): a reminder needs *something* to fire, and we run no scheduler. Cleanest path that stays
honest: an external pinger (a GitHub Actions cron or cron-job.org hitting a secured `/api/tick`)
that sends organizer-only reminders and does nothing else; deadlines still settle lazily. Needs a
`reminders` table (or `rounds.remindAt`), a mail/push provider, and a service worker for push.
Treat as a deliberate step-up, not a quick win — and only if B1 proves the nag isn't enough.

---

## C. Between trips (seasonal usage is a real retention risk)

### C1. "Ask again" — duplicate a decision · **S–M** ⭐
**What.** On a decided (or any) decision, "Ask again" clones its title and options into a fresh
decision with a new round open. The weekly "Friday dinner" becomes one tap, not a re-type.
**Why it fits.** Open question 6 was "is Friday dinner one standing event or fresh each time?" This
answers it *without cron*: the family re-asks on demand. It's the recurring use case that keeps the
app open between trips, and it's lighter than templates (which were rightly cut).
**Build.** A new action mirroring `createDecision` but seeding title/options/settings from an
existing decision. No schema change. Votes are **not** copied (that would re-decide instantly — the
same trap the brief caught with Reopen).

### C2. Start an event from a past one · **M**
**What.** "New event → from a past trip" clones an old event's decision *definitions* (titles,
formats, plans, options) as a starting checklist. Last year's trip seeds this year's.
**Why it fits.** Households plan the same shapes repeatedly; this is the "household template" idea
without a template builder. Purely a convenience over duplication.
**Build.** An action that copies the event row + its decisions/options (no rounds, no votes), opening
round 1 on each — or leaving them for the organizer to open. No schema change. Larger than C1 only
because it spans many decisions.

### C3. A gentle "still open?" prompt on stale events · **S**
**What.** An event in `planning` with nothing touched for N weeks shows the organizer a quiet
"Wrap up or set aside?" — surfaced only in the app, never pushed.
**Why it fits.** Keeps the record honest (no zombie "open" events) and gives a soft reason to return,
without messaging anyone.
**Build.** A read-time check on `createdAt`/last activity; a one-tap "mark done". No schema change.

---

## D. Voting & results depth (careful — the method zoo is off-limits)

### D1. A people × dates availability grid (results view) · **M**
**What.** For a **dates** decision voted "pick several" (already expressible: each person ticks every
range they can make), show the classic Doodle grid after close — people down the side, ranges across
the top, ticks in the cells — so "the weekend that works for the most people" is obvious.
**Why it fits.** Date questions are common and the grid is the clearest consensus view ever shipped
(landscape scan). It **adds no voting method** — it visualizes ballots we already collect. Shown
only after close (sealed while open).
**Build.** A results component keyed off date-format + multi votes. No schema/engine change.

### D2. "How we got here" trail on a decided decision · **S–M**
**What.** An expandable one-liner under each decided card: "6 ideas → shortlist cut sushi, Thai →
Lisbon beat Porto 5–1." Reopens read as "was Taco Palace, reopened by Shai."
**Why it fits.** The brief's "How we got here" explainer; makes the record legible, not just final.
**Build.** Compose from the decision's `rounds` (+ `result` snapshots) and the existing activity log
lines. No schema change.

### D3. 10-minute Undo on a fresh decision · **S**
**What.** Right after a decision settles (auto or by hand), a "**Undo** (9:58)" affordance that
reverses it cleanly within the window — distinct from the organizer's heavier Reopen.
**Why it fits.** The brief promised "Undo for ten minutes"; auto-decide can surprise, and a mis-tap
on "Decide it" shouldn't need the reopen ceremony.
**Build.** UI gate on `decidedAt` within 10 minutes calling the existing `reopenRound`. No schema
change; reopen already handles the cleanup correctly.

### D4. Ranked-choice final round · **L**
**What.** An organizer toggle: the final round is ranked (instant-runoff) instead of pick-one.
**Why it fits / tension.** On the brief's **"later"** list and flirts with the method-zoo guardrail.
Include only if real finals keep tying and the family can stomach ranking. If built, it's a new pure
engine function (well-tested, spoiler invariants) plus a tap-in-order ballot — the engine's purity
makes it self-contained, but it's genuinely more concept for Nana. Lowest priority here on purpose.

---

## E. Trust, privacy & safety

### E1. Rotate an event's public summary link · **S**
**What.** "New summary link" on an event, mirroring the family invite-code rotation, so a leaked
`/s/<token>` can be killed.
**Why it fits.** Link-leak is a listed risk; we rotate the invite code but not the share token.
**Build.** Regenerate `events.shareToken`; the old `/s` 404s. No schema change (unique already).

### E2. Adults-only / "kids advisory" decisions · **M–L**
**What.** A per-decision toggle: kid seats' votes are shown but don't count toward the tally,
quorum, or early close — for money questions.
**Why it fits / tension.** Open question 7 asked exactly this. It leans toward vote-weighting, which
the brief avoids, so keep it binary (count / advisory), never numeric weights.
**Build.** `decisions.eligibilityScope` (default 'all', backward-compatible) and the engine's
`eligibleSeats` filtered by it in `hasQuorum`/`shouldAutoClose`/tally. Touches the engine and
lifecycle, so it earns real tests. Medium-to-large and worth a founder yes first.

### E3. Guest seats for the occasional relative · **L**
**What.** A relative joins one event, votes, and doesn't linger on the roster forever — persona 6.
**Why it fits / tension.** Membership today is **group-level** (there is no `event_members` table),
so true event-scoping is architectural. A lighter interim: a `members.isGuest` flag + a one-tap
"remove guests" after an event. Flagging honestly as the biggest structural item; probably not worth
it until the family actually hits the pain.

---

## F. Accessibility & polish

### F1. Big-type ballot audit + PWA install · **S–M**
**What.** Verify the vote screen at 200% OS font scaling (a design constraint from the brief for
grandparents), and lean on the existing `manifest.ts` with an add-to-home hint.
**Why it fits.** The persona most likely to quietly stop voting is the grandparent; this is cheap
insurance. Not a "feature" so much as a quality gate — pair it with a Playwright check.

---

## Still deliberately not building (and which ideas flirt with the line)

- **Messaging family members / realtime / cron** — B3 (organizer reminders) is the one idea that
  pushes here; it's kept organizer-only and behind an external pinger precisely to stay on the right
  side of "the app never messages family."
- **Comments / discussion threads** — still Messenger's job. (Rallly-style per-decision comments are
  tempting but re-import the chat we intentionally left outside.)
- **Trip itineraries, budgets, packing, bookings** — A4 hands *off* to Calendar/Maps rather than
  becoming them.
- **A voting-method zoo** — D1 adds a *view*, not a method; D4 (ranked) is the only new method and is
  intentionally last and optional.
- **Anonymous-by-default, streaks, recap photos, template builders** — unchanged.

## Open questions for the founder

1. Which failure hurts more today: rounds that stall (→ B1, B2, B3) or the app being forgotten
   between trips (→ A1, C1, C2)? That orders the roadmap.
2. Is a rendered image card (A3) worth the effort over the text unfurl, given Messenger is the front
   door?
3. Do you want organizer reminders (B3) at all, or is the hand-sent nudge (B1) enough — keeping the
   "no notifications" promise fully intact?
4. Money questions (E2): should kids' votes ever not count, or does equal-vote stay sacred?
5. Is "Friday dinner" a recurring **ask** inside a standing event (C1), or its own tiny event each
   week? Your answer picks between C1 and C2.
