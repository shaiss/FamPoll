import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LocalTime } from "@/components/time";
import { AvatarStack, Button, Card, Icon, Pill, Screen, SectionLabel, TopBar } from "@/components/ui";
import { VoteForm } from "@/components/vote-form";
import { SeatIdentityBar } from "@/components/seat-identity-bar";
import { AddOptionForm, DatesGrid, DecisionMeta, IdeasSoFar, ResultBars, Stepper, pickedVotes } from "@/components/decision-results";
import { revealVotes } from "@/lib/actions/decisions";
import { requireLinkSeat } from "@/lib/auth";
import type { Vote } from "@/lib/db/schema";
import { canAddIdeas, effectivePicks, peopleVoted, roundInstruction, roundLabel, roundTrail, tally } from "@/lib/engine/rounds";
import { advancedFromShortlists, voterDisplayName } from "@/lib/decision-view";
import { readError } from "@/lib/flash";
import { clipTitle, closesRelative, formatDate } from "@/lib/format";
import { decisionDataForLinkSeat } from "@/lib/queries";
import { getLocale, getMessages } from "@/lib/locale-server";
import { interpolate } from "@/lib/messages";
import { hasClerk, hasDatabase } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function SeatDecisionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  if (!hasClerk || !hasDatabase) redirect("/setup");
  const { id } = await params;
  const error = readError(await searchParams);
  const seat = await requireLinkSeat();
  const data = await decisionDataForLinkSeat(id, seat);
  if (!data) notFound();
  const { decision, event, rounds, currentRound, options, members, hiddenDefault, casterName } = data;
  const t = await getMessages();
  const locale = await getLocale();
  const memberById = new Map(members.map((m) => [m.id, m]));
  const adultsOnly = decision.eligibilityScope === "adults";
  const eligibleMembers = adultsOnly ? members.filter((m) => m.userId !== null) : members;
  const label = (v: Vote) => voterDisplayName(v, memberById, casterName, t);
  const planning = event.status === "planning";
  const alive = options.filter((o) => !o.eliminatedInRoundId);
  const decided = decision.status === "decided";
  const outcome = decision.outcomeOptionId ? options.find((o) => o.id === decision.outcomeOptionId) : null;
  const finalRound = [...rounds].reverse().find((r) => r.kind === "final" && r.status === "closed");
  const decidedCounts = finalRound ? tally(options.map((o) => o.id), pickedVotes(finalRound.votes).map((v) => ({ optionId: v.optionId }))) : [];
  const winnerCount = decidedCounts.find((r) => r.optionId === decision.outcomeOptionId)?.count;
  const runnerUpCount = decidedCounts.filter((r) => r.optionId !== decision.outcomeOptionId)[0]?.count ?? 0;
  const decidedTrail = decided ? roundTrail(t, rounds, decision.plan) : "";
  const marginLabel = decided && !decision.rankedFinal && winnerCount != null && winnerCount > 0 ? interpolate(t.trailWon, { winner: winnerCount, runnerUp: runnerUpCount }) : "";
  const mapsUrl = outcome && decision.format === "text" ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(outcome.title)}` : null;
  const open = planning && currentRound && currentRound.status === "open" && decision.status === "open" ? currentRound : null;
  const pickCap = open ? effectivePicks(open.maxPicks, alive.length) : 0;
  const rankedFinalOpen = !!open && open.kind === "final" && decision.rankedFinal;
  const closedRounds = rounds.filter((r) => r.status === "closed");
  const lastClosed = closedRounds[closedRounds.length - 1] ?? null;
  const gridRound =
    decision.format === "date" && decision.voteType === "multi"
      ? ([...closedRounds].reverse().find((r) => r.kind !== "ideas" && r.votes.length > 0 && !r.votes.some((v) => v.anonymous)) ?? null)
      : null;
  const tied = !open && !decided && decision.status === "open" && currentRound?.tied ? currentRound : null;
  const stalled = planning && !open && !decided && !tied && decision.status === "open";
  const lowTurnout = stalled && lastClosed?.closeReason === "no_quorum" ? lastClosed : null;
  const turnout = lowTurnout ? peopleVoted(lowTurnout.votes) : 0;
  const allowAddIdeas = canAddIdeas({ open, voteType: decision.voteType, anyoneCanAddOptions: decision.anyoneCanAddOptions, organizer: false });
  const advisory = adultsOnly && seat.userId === null;
  const votersInOpen = open ? new Set(open.voterMemberIds) : new Set<string>();
  const waitingOn = open ? eligibleMembers.filter((m) => !votersInOpen.has(m.id)).map((m) => m.displayName) : [];
  const tiedOptions = tied
    ? (() => {
        const rows = tally(
          alive.map((o) => o.id),
          pickedVotes(tied.votes).map((v) => ({ optionId: v.optionId })),
        );
        const top = rows[0]?.count ?? 0;
        return rows.filter((r) => r.count === top).map((r) => alive.find((o) => o.id === r.optionId)!).filter(Boolean);
      })()
    : [];
  const advancedFrom = advancedFromShortlists(rounds, options);
  const myVotes = open ? open.votes.filter((v) => v.memberId === seat.id) : [];
  const mine = rankedFinalOpen
    ? [...myVotes].filter((v) => v.optionId !== null).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)).map((v) => v.optionId as string)
    : myVotes.map((v) => v.optionId).filter((id): id is string => id !== null);
  const skipped = myVotes.some((v) => v.optionId === null);

  return (
    <Screen>
      <TopBar back="/seat" backLabel={t.seatHomeTitle} />
      <div className="flex flex-col gap-3.5">
        <h1 className="font-display text-[26px] font-bold leading-tight">{decision.title}</h1>
        <p className="text-sm text-ink-2">{event.title}</p>
        <DecisionMeta voteType={decision.voteType} format={decision.format} anonymous={decision.anonymous} adultsOnly={adultsOnly} />
        <Stepper rounds={rounds} plan={decision.plan} decided={decided} />
        {open ? (
          <div className="flex items-center justify-between gap-3 text-[13px] text-ink-2">
            <div>
              <span className="font-bold text-ink">{roundLabel(t, open, rounds, decision.plan)}.</span> {roundInstruction(t, open.kind, pickCap, decision.advanceCount, decision.rankedFinal)}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-accent-deep">
              <Icon name="clock" size={13} stroke={2.5} />
              <LocalTime iso={open.closesAt.toISOString()} mode="closes" fallback={closesRelative(open.closesAt, undefined, locale)} />
            </span>
          </div>
        ) : null}
      </div>
      <SeatIdentityBar name={seat.displayName} />
      {error ? <p className="rounded-[12px] bg-accent-tint px-3 py-2 text-sm font-semibold text-accent-deep">{error}</p> : null}
      {!planning ? <Card className="p-4 text-sm text-ink-2">{interpolate(t.decisioneventClosedNote, { status: event.status })}</Card> : null}

      {decided && outcome ? (
        <div className="flex flex-col gap-2 rounded-card bg-teal-tint p-4">
          <SectionLabel tone="teal">
            {t.decisiondecidedOn.split("{date}")[0]}
            <LocalTime iso={(decision.decidedAt ?? decision.createdAt).toISOString()} mode="date" fallback={formatDate(decision.decidedAt ?? decision.createdAt, undefined, locale)} />
            {t.decisiondecidedOn.split("{date}")[1]}
          </SectionLabel>
          {decision.format === "long_text" ? (
            <div className="whitespace-pre-line text-[17px] font-semibold leading-snug text-teal-ink">{outcome.title}</div>
          ) : (
            <div className="font-display text-[26px] font-extrabold tracking-[-0.02em] text-teal-ink">{outcome.title}</div>
          )}
          {outcome.note ? <div className="text-sm text-teal-deep">{outcome.note}</div> : null}
          {decision.setsEventDates ? <div className="text-sm text-teal-deep">{t.decisioneventDatesSet}</div> : null}
          {decidedTrail ? (
            <div className="text-sm text-teal-deep">
              {decidedTrail}
              {marginLabel ? ` · ${marginLabel}` : ""}
            </div>
          ) : null}
          {mapsUrl ? (
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-deep hover:underline">
              <Icon name="pin" size={16} stroke={2.25} />
              {t.decisionOpenInMaps}
            </a>
          ) : null}
          <Link href="/seat" className="text-sm font-semibold text-teal-deep">{t.seatHomeTitle}</Link>
        </div>
      ) : null}

      {decision.status === "skipped" ? (
        <Card className="p-4 text-sm text-ink-2">{t.decisionsetAsideNote}</Card>
      ) : null}

      {open && open.kind === "ideas" ? <IdeasSoFar options={alive} format={decision.format} /> : null}

      {allowAddIdeas && !advisory ? (
        <AddOptionForm decisionId={decision.id} memberId={seat.id} format={decision.format} ideasRound={open?.kind === "ideas"} t={t} />
      ) : advisory && open?.kind === "ideas" ? (
        <Card className="p-4 text-sm text-ink-2">{interpolate(t.decisionAdvisorySeat, { name: seat.displayName })}</Card>
      ) : open?.kind === "ideas" ? (
        <p className="text-xs text-ink-3">{t.decisionorganizerCollectingIdeas}</p>
      ) : null}

      {open && open.kind !== "ideas" ? (
        advisory ? (
          <Card className="p-4 text-sm text-ink-2">{interpolate(t.decisionAdvisorySeat, { name: seat.displayName })}</Card>
        ) : (
          <section className="flex flex-col gap-2.5">
            <VoteForm
              key={`${open.id}:${seat.id}`}
              roundId={open.id}
              memberId={seat.id}
              maxPicks={pickCap}
              ranked={rankedFinalOpen}
              initial={mine}
              changed={mine.length > 0}
              skipped={skipped}
              hiddenDefault={hiddenDefault.get(seat.id) ?? false}
              options={alive.map((o) => ({
                id: o.id,
                title: o.title,
                byline: [o.addedBy ? interpolate(t.decisionpersonsIdea, { name: o.addedBy.displayName }) : null, o.note].filter(Boolean).join(" · "),
                longText: decision.format === "long_text",
              }))}
            />
          </section>
        )
      ) : null}

      {open ? (
        <div className="flex flex-col gap-2">
          {open.kind !== "ideas" ? (
            <div className="flex items-center justify-between">
              <AvatarStack names={eligibleMembers.map((m) => m.displayName)} size={28} max={8} />
              <div className="text-right text-xs text-ink-2">
                {interpolate(t.decisionvotedOfTotal, { voted: eligibleMembers.filter((m) => votersInOpen.has(m.id)).length, total: eligibleMembers.length })}
                {waitingOn.length ? (
                  <>
                    <br />
                    {interpolate(t.decisionwaitingOn, { names: waitingOn.slice(0, 3).join(", ") + (waitingOn.length > 3 ? ` +${waitingOn.length - 3}` : "") })}
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
          <p className="text-center text-xs text-ink-3">
            {(open.kind === "ideas" ? t.decisionideasCloseNote : t.decisionchangeMindNote).split("{closes}")[0]}
            <LocalTime iso={open.closesAt.toISOString()} mode="closes" fallback={closesRelative(open.closesAt, undefined, locale)} />
            {(open.kind === "ideas" ? t.decisionideasCloseNote : t.decisionchangeMindNote).split("{closes}")[1]}
          </p>
        </div>
      ) : null}

      {tied ? (
        <div className="flex flex-col gap-3 rounded-card bg-ink p-[18px] text-white">
          <div className="flex flex-col gap-1">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-accent-line">{t.decisiontieHeading}</div>
            <div className="font-display text-xl font-bold tracking-[-0.01em]">{interpolate(t.decisiontieEndedLevel, { options: tiedOptions.map((o) => clipTitle(o.title, decision.format)).join(` ${t.decisiontiedJoinAnd} `) })}</div>
            <div className="text-[13px] leading-snug text-line">{t.decisiontieMemberHint}</div>
          </div>
        </div>
      ) : null}

      {lowTurnout ? (
        <div className="flex flex-col gap-3 rounded-card bg-ink p-[18px] text-white">
          <div className="flex flex-col gap-1">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-accent-line">{t.decisionnotEnoughVotes}</div>
            <div className="font-display text-xl font-bold tracking-[-0.01em]">
              {interpolate(t.decisiontimeRanOut, { turnout, members: members.length })}
            </div>
            <div className="text-[13px] leading-snug text-line">{t.decisionnoQuorumMemberHint}</div>
          </div>
        </div>
      ) : stalled ? (
        <Card className="flex flex-col gap-2 p-4">
          <div className="font-bold">{t.decisionnothingToVote}</div>
          <p className="text-sm text-ink-2">
            {alive.length === 0 ? t.decisionnoIdeasCameIn : t.decisionclosedNoResult} {t.decisionorganizerCanReopen}
          </p>
        </Card>
      ) : null}

      {gridRound ? <DatesGrid round={gridRound} rounds={rounds} options={options} label={label} /> : null}

      {closedRounds.length ? (
        <section className="flex flex-col gap-3">
          <SectionLabel>{decided ? t.decisionhowItWent : t.decisionearlierRounds}</SectionLabel>
          {[...closedRounds].reverse().map((r) => (
            <div key={r.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="teal">
                  <Icon name="check" size={12} stroke={3} />
                  {interpolate(t.decisionroundClosed, { round: roundLabel(t, r, rounds, decision.plan) })}
                </Pill>
                <span className="text-[13px] text-ink-2">
                  {r.closeReason === "everyone_voted" ? t.decisioncloseEveryoneVoted : r.closeReason === "deadline" ? t.decisioncloseDeadline : r.closeReason === "no_quorum" ? t.decisioncloseNoQuorum : t.decisioncloseByOrganizer}
                </span>
              </div>
              {r.kind === "ideas" ? (
                <Card className="p-3.5 text-sm text-ink-2">{interpolate(t.decisionideasCameIn, { ideas: interpolate(t.decisionideaCount, { count: options.filter((o) => o.addedInRoundId === r.id).length }) })}</Card>
              ) : (
                <ResultBars round={r} rounds={rounds} options={options} format={decision.format} label={label} advancing={advancedFrom.get(r.id) ?? new Set()} winnerId={r.kind === "final" ? (decision.outcomeOptionId ?? null) : null} ranked={decision.rankedFinal && r.kind === "final"} />
              )}
              {r.kind !== "ideas" && r.votes.some((v) => v.memberId === seat.id && v.anonymous) ? (
                <form action={revealVotes}>
                  <input type="hidden" name="roundId" value={r.id} />
                  <input type="hidden" name="memberId" value={seat.id} />
                  <Button type="submit" variant="ghost" size="sm">
                    {t.decisionshowMyHand}
                  </Button>
                </form>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}
    </Screen>
  );
}
