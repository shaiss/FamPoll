import { notFound } from "next/navigation";
import { LocalTime } from "@/components/time";
import { AvatarStack, Button, Card, Field, Icon, inputClass, Pill, Screen, SectionLabel, TopBar } from "@/components/ui";
import { VoteForm } from "@/components/vote-form";
import { AddOptionForm, DatesGrid, DecisionMeta, IdeasSoFar, ResultBars, Stepper, pickedVotes } from "@/components/decision-results";
import { closeRoundNow, deleteDecision, duplicateDecision, editOption, extendRound, pickWinner, removeOption, renameDecision, reopenRound, revealVotes, setDecisionReminder, skipDecision, tiebreak, unskipDecision } from "@/lib/actions/decisions";
import { hasMailer } from "@/lib/env";
import { CopyText } from "@/components/copy-text";
import { InAppBrowserNotice } from "@/components/in-app-browser-notice";
import { baseUrl } from "@/lib/url";
import { isLinkSeat, isOrganizer, requireUser } from "@/lib/auth";
import type { Vote } from "@/lib/db/schema";
import { canAddIdeas, effectivePicks, peopleVoted, roundInstruction, roundLabel, roundTrail, tally } from "@/lib/engine/rounds";
import { advancedFromShortlists, voterDisplayName } from "@/lib/decision-view";
import { readError } from "@/lib/flash";
import { clipTitle, closesRelative, formatDate } from "@/lib/format";
import { nudgePeople, pasteNudgeLines, storedPersonalLinkToken } from "@/lib/nudge";
import { decisionData, type OptionView, type RoundView } from "@/lib/queries";
import { getLocale, getMessages } from "@/lib/locale-server";
import { interpolate } from "@/lib/messages";

export default async function DecisionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const error = readError(await searchParams);
  const user = await requireUser();
  const data = await decisionData(id, user.id);
  if (!data) notFound();
  const { decision, event, rounds, currentRound, options, members, seats, casterName, hiddenDefault, member } = data;
  const base = await baseUrl();
  const t = await getMessages();
  const locale = await getLocale();
  const memberById = new Map(members.map((m) => [m.id, m]));
  // Adults-only: proxy (kid) seats follow along but don't vote or count toward participation.
  const adultsOnly = decision.eligibilityScope === "adults";
  const eligibleMembers = adultsOnly ? members.filter((m) => m.userId !== null) : members;
  const label = (v: Vote) => voterDisplayName(v, memberById, casterName, t);
  const organizer = member.role === "organizer" || decision.createdByMemberId === member.id;
  const planning = event.status === "planning";
  const alive = options.filter((o) => !o.eliminatedInRoundId);
  const decided = decision.status === "decided";
  const outcome = decision.outcomeOptionId ? options.find((o) => o.id === decision.outcomeOptionId) : null;
  // For the "Decided: Taco Palace, 4-2" line the family pastes into the chat.
  const finalRound = [...rounds].reverse().find((r) => r.kind === "final" && r.status === "closed");
  const decidedCounts = finalRound ? tally(options.map((o) => o.id), pickedVotes(finalRound.votes).map((v) => ({ optionId: v.optionId }))) : [];
  const winnerCount = decidedCounts.find((r) => r.optionId === decision.outcomeOptionId)?.count;
  const runnerUpCount = decidedCounts.filter((r) => r.optionId !== decision.outcomeOptionId)[0]?.count ?? 0;
  const decidedTally = !decision.rankedFinal && winnerCount != null && winnerCount > 0 ? `, ${winnerCount}–${runnerUpCount}` : "";
  // The plain-words trail for the decided card. A ranked final has no single pair of counts, so its margin is left off.
  const decidedTrail = decided ? roundTrail(t, rounds, decision.plan) : "";
  const marginLabel = decided && !decision.rankedFinal && winnerCount != null && winnerCount > 0 ? interpolate(t.trailWon, { winner: winnerCount, runnerUp: runnerUpCount }) : "";
  // A fresh outcome (under ten minutes) offers a prominent one-tap Undo; later it is the plain "reopen".
  const justDecided = decided && !!decision.decidedAt && new Date().getTime() - decision.decidedAt.getTime() < 10 * 60 * 1000;
  // Hand-off links: a decided text pick opens in Maps; a decided date range downloads to the calendar.
  const mapsUrl = outcome && decision.format === "text" ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(outcome.title)}` : null;
  const open = planning && currentRound && currentRound.status === "open" && decision.status === "open" ? currentRound : null;
  // The live pick cap: never everything on the ballot, so a pick-several final between two options is pick-one.
  const pickCap = open ? effectivePicks(open.maxPicks, alive.length) : 0;
  const rankedFinalOpen = !!open && open.kind === "final" && decision.rankedFinal;
  const closedRounds = rounds.filter((r) => r.status === "closed");
  const lastClosed = closedRounds[closedRounds.length - 1] ?? null;
  // The dates availability grid: the last closed voting round of a dates + pick-several decision, unless a hidden ballot sealed it.
  const gridRound =
    decision.format === "date" && decision.voteType === "multi"
      ? ([...closedRounds].reverse().find((r) => r.kind !== "ideas" && r.votes.length > 0 && !r.votes.some((v) => v.anonymous)) ?? null)
      : null;
  const tied = !open && !decided && decision.status === "open" && currentRound?.tied ? currentRound : null;
  const stalled = planning && !open && !decided && !tied && decision.status === "open";
  const lowTurnout = stalled && lastClosed?.closeReason === "no_quorum" ? lastClosed : null;
  const leader = lowTurnout
    ? (() => {
        const rows = tally(alive.map((o) => o.id), pickedVotes(lowTurnout.votes).map((v) => ({ optionId: v.optionId })));
        return rows.length && rows[0].count > 0 && (rows.length === 1 || rows[0].count > rows[1].count) ? (alive.find((o) => o.id === rows[0].optionId) ?? null) : null;
      })()
    : null;
  const turnout = lowTurnout ? peopleVoted(lowTurnout.votes) : 0;
  const firstRound = !!open && open.number === 1;
  const allowAddIdeas = canAddIdeas({ open, voteType: decision.voteType, anyoneCanAddOptions: decision.anyoneCanAddOptions, organizer });
  // Participation is public; the open round's `votes` holds only the viewer's own seats' ballots.
  const votersInOpen = open ? new Set(open.voterMemberIds) : new Set<string>();
  const waitingSeats = open ? eligibleMembers.filter((m) => !votersInOpen.has(m.id)) : [];
  const waitingOn = waitingSeats.map((m) => m.displayName);
  const waitingVoters = waitingSeats.map((m) => ({
    displayName: m.displayName,
    personalLinkToken: storedPersonalLinkToken(m.personalLinkToken, {
      includePersonalLinks: isOrganizer(member),
      namedSeatsEnabled: data.family.namedSeatsEnabled,
      isLiveLinkSeat: isLinkSeat(m),
    }),
  }));
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

  return (
    <Screen>
      <TopBar back={`/app/events/${event.id}`} backLabel={event.title} />
      <div className="flex flex-col gap-3.5">
        <h1 className="font-display text-[30px] font-bold leading-[1.05] tracking-[-0.025em]">{decision.title}</h1>
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

      {error ? <p className="rounded-[12px] bg-accent-tint px-3 py-2 text-sm font-semibold text-accent-deep">{error}</p> : null}
      <InAppBrowserNotice />
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
          <CopyText
            variant="ghost"
            label={t.decisioncopyForMessenger}
            lines={[
              { text: `${decision.title} (${event.title})` },
              { text: interpolate(t.decisioncopyDecidedLine, { outcome: clipTitle(outcome.title, decision.format), tally: decidedTally }) },
              { text: `${base}/app/decisions/${decision.id}` },
            ]}
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
            {mapsUrl ? (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-deep hover:underline">
                <Icon name="pin" size={16} stroke={2.25} />
                {t.decisionOpenInMaps}
              </a>
            ) : null}
            {decision.format === "date" && outcome?.startsOn ? (
              <a href={`/app/decisions/${decision.id}/calendar`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-deep hover:underline">
                <Icon name="calendar" size={16} stroke={2.25} />
                {t.decisionAddToCalendar}
              </a>
            ) : null}
            {planning ? (
              <form action={duplicateDecision}>
                <input type="hidden" name="decisionId" value={decision.id} />
                <Button type="submit" variant="ghost" size="sm">
                  {t.decisionAskAgain}
                </Button>
              </form>
            ) : null}
            {organizer && planning ? (
              <form action={reopenRound}>
                <input type="hidden" name="decisionId" value={decision.id} />
                <Button type="submit" variant={justDecided ? "secondary" : "ghost"} size="sm">
                  {justDecided ? t.decisionUndo : t.decisionreopenChangedMinds}
                </Button>
              </form>
            ) : null}
          </div>
        </div>
      ) : null}

      {decision.status === "skipped" ? (
        <Card className="flex flex-col gap-3 p-4">
          <div className="text-sm text-ink-2">{t.decisionsetAsideNote}</div>
          {organizer && planning ? (
            <div className="flex flex-wrap items-center gap-2">
              <form action={unskipDecision}>
                <input type="hidden" name="decisionId" value={decision.id} />
                <Button type="submit" variant="secondary" size="sm">
                  {t.decisionbringItBack}
                </Button>
              </form>
              <details>
                <summary className="cursor-pointer list-none text-xs font-semibold text-ink-3 [&::-webkit-details-marker]:hidden">{t.decisiondeleteForGood}</summary>
                <form action={deleteDecision} className="mt-2 flex flex-col gap-2">
                  <input type="hidden" name="decisionId" value={decision.id} />
                  <label className="flex items-center gap-2 text-sm text-ink-2">
                    <input type="checkbox" name="confirm" /> {t.decisiondeleteConfirmVotes}
                  </label>
                  <Button type="submit" variant="danger" size="sm">
                    {t.decisiondeleteDecision}
                  </Button>
                </form>
              </details>
            </div>
          ) : null}
        </Card>
      ) : null}

      {open && open.kind === "ideas" ? (
        <>
          <IdeasSoFar options={alive} format={decision.format} />
          {organizer && alive.length >= 2 ? (
            <div className="flex flex-col gap-2 rounded-card bg-ink p-4 text-white">
              <div className="font-display text-lg font-bold">{t.decisiongotAllIdeas}</div>
              <p className="text-[13px] text-line">{t.decisionideasCloseHint}</p>
              <form action={closeRoundNow}>
                <input type="hidden" name="decisionId" value={decision.id} />
                <Button type="submit" size="sm" className="w-full">
                  {alive.length <= decision.advanceCount ? t.decisionstartTheFinal : t.decisionstartTheShortlist}
                </Button>
              </form>
            </div>
          ) : null}
        </>
      ) : null}

      {allowAddIdeas ? (
        <AddOptionForm decisionId={decision.id} memberId={member.id} format={decision.format} ideasRound={open?.kind === "ideas"} t={t} />
      ) : open?.kind === "ideas" ? (
        <p className="text-xs text-ink-3">{t.decisionorganizerCollectingIdeas}</p>
      ) : null}

      {open && open.kind !== "ideas"
        ? seats.map((seat) => {
            const advisory = adultsOnly && seat.userId === null;
            const myVotes = open.votes.filter((v) => v.memberId === seat.id);
            // A ranked ballot is seeded in the seat's own preference order.
            const mine = rankedFinalOpen
              ? [...myVotes].filter((v) => v.optionId !== null).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)).map((v) => v.optionId as string)
              : myVotes.map((v) => v.optionId).filter((id): id is string => id !== null);
            const skipped = myVotes.some((v) => v.optionId === null);
            const hidden = myVotes.some((v) => v.anonymous);
            const statusRight = advisory ? undefined : mine.length ? (hidden ? t.decisionstatusVotedHidden : t.decisionstatusVoted) : skipped ? t.decisionstatusSkipped : t.decisionstatusNotYet;
            return (
              <section key={seat.id} className="flex flex-col gap-2.5">
                {seats.length > 1 ? (
                  <SectionLabel right={statusRight}>{seat.userId === user.id ? t.decisionyourVote : interpolate(t.decisionvotingFor, { name: seat.displayName })}</SectionLabel>
                ) : null}
                {advisory ? (
                  <Card className="p-4 text-sm text-ink-2">{interpolate(t.decisionAdvisorySeat, { name: seat.displayName })}</Card>
                ) : (
                  <VoteForm
                    key={`${open.id}:${seat.id}:${alive.map((o) => o.id).join(",")}`}
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
                )}
              </section>
            );
          })
        : null}

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
          <CopyText
            lines={
              open.kind !== "ideas" && waitingOn.length
                ? pasteNudgeLines(t, {
                    pending: nudgePeople(waitingVoters, base),
                    link: `${base}/app/decisions/${decision.id}`,
                    closesAt: open.closesAt,
                  })
                : [
                    { text: `${decision.title} (${event.title})` },
                    {
                      text: open.kind === "ideas" ? t.decisioncopyAddIdeas : interpolate(t.decisioncopyVote, { round: roundLabel(t, open, rounds, decision.plan) }),
                      closesAtIso: open.closesAt.toISOString(),
                    },
                    { text: `${base}/app/decisions/${decision.id}` },
                    { text: t.nudgeOpenInBrowser },
                  ]
            }
          />
        </div>
      ) : null}

      {tied ? (
        <div className="flex flex-col gap-3 rounded-card bg-ink p-[18px] text-white">
          <div className="flex flex-col gap-1">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-accent-line">{t.decisiontieHeading}</div>
            <div className="font-display text-xl font-bold tracking-[-0.01em]">{interpolate(t.decisiontieEndedLevel, { options: tiedOptions.map((o) => clipTitle(o.title, decision.format)).join(` ${t.decisiontiedJoinAnd} `) })}</div>
            <div className="text-[13px] leading-snug text-line">{organizer ? t.decisiontieOrganizerHint : t.decisiontieMemberHint}</div>
          </div>
          {organizer ? (
            <div className="flex flex-col gap-2">
              <form action={tiebreak}>
                <input type="hidden" name="decisionId" value={decision.id} />
                <Button type="submit" className="w-full">
                  {t.decisiontiebreakRound}
                </Button>
              </form>
              <div className="grid grid-cols-2 gap-2">
                {tiedOptions.map((o) => (
                  <form key={o.id} action={pickWinner}>
                    <input type="hidden" name="decisionId" value={decision.id} />
                    <input type="hidden" name="optionId" value={o.id} />
                    <button type="submit" className="h-11 w-full rounded-[12px] border border-[#4a423a] px-3 text-sm font-semibold text-white hover:bg-[#2c2622]">
                      {interpolate(t.decisionjustTake, { option: clipTitle(o.title, decision.format) })}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {lowTurnout ? (
        <div className="flex flex-col gap-3 rounded-card bg-ink p-[18px] text-white">
          <div className="flex flex-col gap-1">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-accent-line">{t.decisionnotEnoughVotes}</div>
            <div className="font-display text-xl font-bold tracking-[-0.01em]">
              {interpolate(t.decisiontimeRanOut, { turnout, members: members.length })}
            </div>
            <div className="text-[13px] leading-snug text-line">{organizer ? t.decisionnoQuorumOrganizerHint : t.decisionnoQuorumMemberHint}</div>
          </div>
          {organizer ? (
            <div className="flex flex-col gap-2">
              <form action={reopenRound}>
                <input type="hidden" name="decisionId" value={decision.id} />
                <Button type="submit" className="w-full">
                  {t.decisiongiveMoreTime}
                </Button>
              </form>
              <div className="grid grid-cols-2 gap-2">
                {leader ? (
                  <form action={pickWinner}>
                    <input type="hidden" name="decisionId" value={decision.id} />
                    <input type="hidden" name="optionId" value={leader.id} />
                    <button type="submit" className="h-11 w-full rounded-[12px] border border-[#4a423a] px-3 text-sm font-semibold text-white hover:bg-[#2c2622]">
                      {interpolate(t.decisiongoWith, { option: clipTitle(leader.title, decision.format) })}
                    </button>
                  </form>
                ) : null}
                <form action={skipDecision}>
                  <input type="hidden" name="decisionId" value={decision.id} />
                  <button type="submit" className="h-11 w-full rounded-[12px] border border-[#4a423a] px-3 text-sm font-semibold text-white hover:bg-[#2c2622]">
                    {t.decisionsetAside}
                  </button>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      ) : stalled ? (
        <Card className="flex flex-col gap-2 p-4">
          <div className="font-bold">{t.decisionnothingToVote}</div>
          <p className="text-sm text-ink-2">
            {alive.length === 0 ? t.decisionnoIdeasCameIn : t.decisionclosedNoResult}{" "}
            {organizer ? t.decisionreopenOrSetAsideHint : t.decisionorganizerCanReopen}
          </p>
          {organizer ? (
            <div className="flex gap-2">
              <form action={reopenRound}>
                <input type="hidden" name="decisionId" value={decision.id} />
                <Button type="submit" variant="secondary" size="sm">
                  {t.decisionreopenLastRound}
                </Button>
              </form>
              <form action={skipDecision}>
                <input type="hidden" name="decisionId" value={decision.id} />
                <Button type="submit" variant="danger" size="sm">
                  {t.decisionsetAside}
                </Button>
              </form>
            </div>
          ) : null}
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
              {r.kind !== "ideas" && seats.some((seat) => r.votes.some((v) => v.memberId === seat.id && v.anonymous)) ? (
                <div className="flex flex-wrap gap-2">
                  {seats
                    .filter((seat) => r.votes.some((v) => v.memberId === seat.id && v.anonymous))
                    .map((seat) => (
                      <form key={seat.id} action={revealVotes}>
                        <input type="hidden" name="roundId" value={r.id} />
                        <input type="hidden" name="memberId" value={seat.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          {seat.userId === user.id ? t.decisionshowMyHand : interpolate(t.decisionshowHand, { name: seat.displayName })}
                        </Button>
                      </form>
                    ))}
                </div>
              ) : null}
            </div>
          ))}
        </section>
      ) : null}

      {organizer && planning && decision.status !== "skipped" ? (
        <Card className="flex flex-col gap-3 p-4">
          <SectionLabel>{t.decisionorganizerLabel}</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {open ? (
              <>
                <form action={closeRoundNow}>
                  <input type="hidden" name="decisionId" value={decision.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    {t.decisioncloseRoundNow}
                  </Button>
                </form>
                <form action={extendRound}>
                  <input type="hidden" name="decisionId" value={decision.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    {t.decisiongiveMoreTime}
                  </Button>
                </form>
              </>
            ) : null}
            {lastClosed && !decided ? (
              <form action={reopenRound}>
                <input type="hidden" name="decisionId" value={decision.id} />
                <Button type="submit" variant="secondary" size="sm">
                  {interpolate(t.decisionreopenRoundN, { number: lastClosed.number })}
                </Button>
              </form>
            ) : null}
          </div>
          <form action={renameDecision} className="flex flex-col gap-2">
            <input type="hidden" name="decisionId" value={decision.id} />
            <Field label={t.decisionrenameLabel}>
              <input name="title" defaultValue={decision.title} required maxLength={100} className={`${inputClass} h-11 text-[15px]`} />
            </Field>
            <Button type="submit" variant="ghost" size="sm">
              {t.decisionsaveTitle}
            </Button>
          </form>
          {hasMailer ? (
            <details>
              <summary className="cursor-pointer list-none text-xs font-semibold text-ink-3 [&::-webkit-details-marker]:hidden">{t.decisionRemindLabel}</summary>
              <div className="mt-2 flex flex-col gap-2">
                <p className="text-sm text-ink-2">{decision.remindOrganizer ? t.decisionRemindOnNote : t.decisionRemindOffNote}</p>
                <form action={setDecisionReminder}>
                  <input type="hidden" name="decisionId" value={decision.id} />
                  <input type="hidden" name="remind" value={decision.remindOrganizer ? "0" : "1"} />
                  <Button type="submit" variant="ghost" size="sm">
                    {decision.remindOrganizer ? t.decisionRemindTurnOff : t.decisionRemindTurnOn}
                  </Button>
                </form>
              </div>
            </details>
          ) : null}
          {open && decision.voteType !== "ab" && (open.kind !== "final" || firstRound) && alive.length ? (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-ink-2">{t.decisionremoveOptionLabel}</span>
              <div className="flex flex-col gap-1.5">
                {alive.map((o) => (
                  <form key={o.id} action={removeOption} className="flex items-center justify-between gap-2 rounded-[10px] bg-sand px-3 py-1.5">
                    <input type="hidden" name="decisionId" value={decision.id} />
                    <input type="hidden" name="optionId" value={o.id} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{clipTitle(o.title, decision.format)}</span>
                    <Button type="submit" variant="ghost" size="sm">
                      {t.decisionremove}
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          ) : null}
          {options.length ? (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-ink-2">{t.decisionfixOptionLabel}</span>
              <div className="flex flex-col gap-1.5">
                {options.map((o) => (
                  <details key={o.id} className="rounded-[10px] bg-sand px-3 py-2">
                    <summary className="cursor-pointer list-none text-sm font-semibold [&::-webkit-details-marker]:hidden">{clipTitle(o.title, decision.format)}</summary>
                    <form action={editOption} className="mt-2 flex flex-col gap-2">
                      <input type="hidden" name="decisionId" value={decision.id} />
                      <input type="hidden" name="optionId" value={o.id} />
                      {decision.format === "date" ? (
                        <div className="grid grid-cols-2 gap-2">
                          <input type="date" name="dateStart" defaultValue={o.startsOn ?? ""} required aria-label={t.decisionariaStart} className={`${inputClass} h-10 text-[15px]`} />
                          <input type="date" name="dateEnd" defaultValue={o.endsOn ?? ""} aria-label={t.decisionariaEnd} className={`${inputClass} h-10 text-[15px]`} />
                        </div>
                      ) : decision.format === "long_text" ? (
                        <textarea
                          name="title"
                          defaultValue={o.title}
                          required
                          maxLength={500}
                          rows={3}
                          aria-label={t.decisionariaTitle}
                          className="w-full rounded-[14px] border border-line bg-card px-4 py-2.5 text-[15px] font-medium leading-snug text-ink outline-none focus:border-accent"
                        />
                      ) : (
                        <input name="title" defaultValue={o.title} required maxLength={80} aria-label={t.decisionariaTitle} className={`${inputClass} h-10 text-[15px]`} />
                      )}
                      <input name="note" defaultValue={o.note ?? ""} maxLength={140} placeholder={t.decisionnotePlaceholder} className={`${inputClass} h-10 text-[15px] font-medium`} />
                      <Button type="submit" variant="ghost" size="sm">
                        {t.decisionsaveOption}
                      </Button>
                    </form>
                  </details>
                ))}
              </div>
            </div>
          ) : null}
          {!decided && alive.length ? (
            <form action={pickWinner} className="flex flex-col gap-2">
              <input type="hidden" name="decisionId" value={decision.id} />
              <Field label={t.decisionjustCallIt}>
                <select name="optionId" className={`${inputClass} h-11 text-[15px]`}>
                  {alive.map((o) => (
                    <option key={o.id} value={o.id}>
                      {clipTitle(o.title, decision.format)}
                    </option>
                  ))}
                </select>
              </Field>
              <Button type="submit" variant="dark" size="sm">
                {t.decisiondecide}
              </Button>
            </form>
          ) : null}
          {!decided ? (
            <form action={skipDecision}>
              <input type="hidden" name="decisionId" value={decision.id} />
              <Button type="submit" variant="danger" size="sm">
                {t.decisionsetThisAside}
              </Button>
            </form>
          ) : null}
          <details>
            <summary className="cursor-pointer list-none text-xs font-semibold text-ink-3 [&::-webkit-details-marker]:hidden">{t.decisiondeleteThisDots}</summary>
            <form action={deleteDecision} className="mt-2 flex flex-col gap-2">
              <input type="hidden" name="decisionId" value={decision.id} />
              <label className="flex items-center gap-2 text-sm text-ink-2">
                <input type="checkbox" name="confirm" /> {t.decisiondeleteConfirmAll}
              </label>
              <Button type="submit" variant="danger" size="sm">
                {t.decisiondeleteDecision}
              </Button>
            </form>
          </details>
          <p className="text-xs text-ink-3">{t.decisionorganizerFooter}</p>
        </Card>
      ) : null}
    </Screen>
  );
}
