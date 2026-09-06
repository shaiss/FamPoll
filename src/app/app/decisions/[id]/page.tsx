import { notFound } from "next/navigation";
import { LocalTime } from "@/components/time";
import { Avatar, AvatarStack, Button, Card, Field, Icon, inputClass, Pill, Screen, SectionLabel, TopBar } from "@/components/ui";
import { VoteForm } from "@/components/vote-form";
import { addOption, closeRoundNow, deleteDecision, editOption, extendRound, pickWinner, removeOption, renameDecision, reopenRound, revealVotes, skipDecision, tiebreak, unskipDecision } from "@/lib/actions/decisions";
import { CopyText } from "@/components/copy-text";
import { baseUrl } from "@/lib/url";
import { requireUser } from "@/lib/auth";
import type { Vote } from "@/lib/db/schema";
import { formatLabel, roundKindLabel, voteTypeLabel, effectivePicks, isTiebreak, peopleVoted, roundInstruction, roundLabel, roundSequence, tally, type Format, type RoundKind } from "@/lib/engine/rounds";
import { readError } from "@/lib/flash";
import { clipTitle, closesRelative, formatDate } from "@/lib/format";
import { decisionData, type OptionView, type RoundView } from "@/lib/queries";
import { getLocale, getMessages } from "@/lib/locale-server";
import { interpolate } from "@/lib/messages";

async function Stepper({ rounds, plan, decided }: { rounds: RoundView[]; plan: "quick" | "shortlist_final" | "ideas_shortlist_final"; decided: boolean }) {
  const t = await getMessages();
  const seq = roundSequence(plan);
  if (seq.length === 1 && rounds.length <= 1) return null;
  const done = rounds.map((r, i) => ({
    key: r.id,
    label: isTiebreak(r, rounds) ? t.decisionstepTiebreak : roundKindLabel(t, r.kind),
    number: r.number,
    state: (r.status === "closed" ? "done" : i === rounds.length - 1 ? "current" : "done") as "done" | "current" | "todo",
  }));
  const lastKind = rounds[rounds.length - 1]?.kind;
  const remaining: RoundKind[] = decided || lastKind === "final" ? [] : seq.slice(seq.indexOf(lastKind ?? seq[0]) + 1);
  const steps = [...done, ...remaining.map((kind, i) => ({ key: "todo-" + kind, label: roundKindLabel(t, kind), number: rounds.length + i + 1, state: "todo" as const }))];
  return (
    <div className="flex items-center">
      {steps.map((s, i) => (
        <div key={s.key} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex h-[22px] w-[22px] items-center justify-center rounded-full font-display text-[11px] font-extrabold ${
                s.state === "done" ? "bg-teal text-white" : s.state === "current" ? "bg-accent text-white shadow-[0_0_0_4px_#fbe6d9]" : "border-2 border-line-2 text-ink-3"
              }`}
            >
              {s.state === "done" ? <Icon name="check" size={12} stroke={3} /> : s.number}
            </span>
            <span className={`text-[13px] font-semibold ${s.state === "done" ? "text-teal-deep" : s.state === "current" ? "text-accent-deep" : "text-ink-3"}`}>{s.label}</span>
          </div>
          {i < steps.length - 1 ? <div className={`mx-2 h-0.5 flex-1 ${s.state === "done" ? "bg-teal" : "bg-line-2"}`} /> : null}
        </div>
      ))}
    </div>
  );
}

type Picked = Vote & { optionId: string };
const picks = (votes: Vote[]): Picked[] => votes.filter((v): v is Picked => v.optionId !== null);

async function ResultBars({ round, rounds, options, format, label, advancing, winnerId }: { round: RoundView; rounds: RoundView[]; options: OptionView[]; format: Format; label: (v: Vote) => string; advancing: Set<string>; winnerId: string | null }) {
  const t = await getMessages();
  const numberOf = (roundId: string) => rounds.find((r) => r.id === roundId)?.number ?? Infinity;
  // Everything that was on this round's ballot: still alive, or knocked out in this round or a later one.
  const inPlay = options.filter((o) => !o.eliminatedInRoundId || numberOf(o.eliminatedInRoundId) >= round.number);
  const chosen = picks(round.votes);
  const rows = tally(
    inPlay.map((o) => o.id),
    chosen.map((v) => ({ optionId: v.optionId })),
  );
  const max = Math.max(1, ...rows.map((r) => r.count));
  const voters = peopleVoted(round.votes);
  // One hidden ballot seals the whole round: names plus counts plus who voted would give it away by subtraction.
  const sealed = round.votes.some((v) => v.anonymous);
  const hiddenVoters = peopleVoted(round.votes.filter((v) => v.anonymous));
  const skippers = round.votes.filter((v) => v.optionId === null).map(label);
  const cap = effectivePicks(round.maxPicks, inPlay.length);
  const longText = format === "long_text";
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => {
        const o = options.find((x) => x.id === r.optionId);
        const out = o?.eliminatedInRoundId === round.id;
        const won = r.optionId === winnerId;
        const adv = advancing.has(r.optionId);
        const names = sealed ? [] : chosen.filter((v) => v.optionId === r.optionId).map(label);
        return (
          <Card key={r.optionId} className={`flex flex-col gap-2 p-3.5 ${out ? "opacity-70" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`${longText ? "whitespace-pre-line text-[15px] font-semibold leading-snug" : "font-bold"} ${out ? "text-ink-2" : ""}`}>{o?.title ?? "?"}</span>
                {won ? <Pill tone="teal">{t.decisionpillWinner}</Pill> : adv ? <Pill tone="accent">{t.decisionpillToFinal}</Pill> : null}
              </div>
              <span className="font-display text-xl font-extrabold">{r.count}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-sand">
              <div className={`h-2.5 rounded-full ${won ? "bg-teal" : out ? "bg-line-2" : "bg-accent"}`} style={{ width: `${(r.count / max) * 100}%` }} />
            </div>
            {names.length ? <div className="text-xs text-ink-3">{names.join(", ")}</div> : null}
          </Card>
        );
      })}
      <div className="text-center text-xs text-ink-3">
        {interpolate(t.decisionvotesFrom, { votes: interpolate(t.decisionvoteCount, { count: chosen.length }), people: interpolate(t.decisionpersonCount, { count: voters }) })}
        {cap > 1 ? ` · ${interpolate(t.decisionpicksUpToEach, { cap })}` : ""}
        {skippers.length ? (sealed ? ` · ${interpolate(t.decisionskippedCount, { count: skippers.length })}` : ` · ${interpolate(t.decisionskippedNames, { names: skippers.join(", ") })}`) : ""}
      </div>
      {sealed ? (
        <div className="text-center text-xs text-ink-3">
          {interpolate(t.decisionprivateVotesNote, { hidden: hiddenVoters, voters })}
        </div>
      ) : null}
    </div>
  );
}

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
  /** "Eli (via Shai)" when someone else cast the vote for that seat; a seat that has left keeps its ballot, not its name. */
  const label = (v: Vote) => {
    if (v.memberId === null) return t.decisionvoterLeft;
    const m = memberById.get(v.memberId);
    const name = m?.displayName ?? "?";
    if (!m || m.userId === v.castByUserId) return name;
    return interpolate(t.decisionviaCaster, { name, caster: casterName.get(v.castByUserId) ?? t.decisioncasterFallback });
  };
  const organizer = member.role === "organizer" || decision.createdByMemberId === member.id;
  const planning = event.status === "planning";
  const alive = options.filter((o) => !o.eliminatedInRoundId);
  const decided = decision.status === "decided";
  const outcome = decision.outcomeOptionId ? options.find((o) => o.id === decision.outcomeOptionId) : null;
  // For the "Decided: Taco Palace, 4-2" line the family pastes into the chat.
  const finalRound = [...rounds].reverse().find((r) => r.kind === "final" && r.status === "closed");
  const decidedCounts = finalRound ? tally(options.map((o) => o.id), picks(finalRound.votes).map((v) => ({ optionId: v.optionId }))) : [];
  const winnerCount = decidedCounts.find((r) => r.optionId === decision.outcomeOptionId)?.count;
  const runnerUpCount = decidedCounts.filter((r) => r.optionId !== decision.outcomeOptionId)[0]?.count ?? 0;
  const decidedTally = winnerCount != null && winnerCount > 0 ? `, ${winnerCount}–${runnerUpCount}` : "";
  const open = planning && currentRound && currentRound.status === "open" && decision.status === "open" ? currentRound : null;
  // The live pick cap: never everything on the ballot, so a pick-several final between two options is pick-one.
  const pickCap = open ? effectivePicks(open.maxPicks, alive.length) : 0;
  const closedRounds = rounds.filter((r) => r.status === "closed");
  const lastClosed = closedRounds[closedRounds.length - 1] ?? null;
  const tied = !open && !decided && decision.status === "open" && currentRound?.tied ? currentRound : null;
  const stalled = planning && !open && !decided && !tied && decision.status === "open";
  const lowTurnout = stalled && lastClosed?.closeReason === "no_quorum" ? lastClosed : null;
  const leader = lowTurnout
    ? (() => {
        const rows = tally(alive.map((o) => o.id), picks(lowTurnout.votes).map((v) => ({ optionId: v.optionId })));
        return rows.length && rows[0].count > 0 && (rows.length === 1 || rows[0].count > rows[1].count) ? (alive.find((o) => o.id === rows[0].optionId) ?? null) : null;
      })()
    : null;
  const turnout = lowTurnout ? peopleVoted(lowTurnout.votes) : 0;
  const firstRound = !!open && open.number === 1;
  const laterFinal = !!open && !firstRound && open.kind === "final";
  const laterShortlist = !!open && !firstRound && open.kind === "shortlist";
  // Anyone may add while the first round is open (a quick vote too); later rounds are the organizer's. A or B keeps its two.
  const canAddIdeas = !!open && decision.voteType !== "ab" && !laterFinal && (laterShortlist ? organizer : decision.anyoneCanAddOptions || organizer);
  // Participation is public; the open round's `votes` holds only the viewer's own seats' ballots.
  const votersInOpen = open ? new Set(open.voterMemberIds) : new Set<string>();
  const waitingOn = open ? members.filter((m) => !votersInOpen.has(m.id)).map((m) => m.displayName) : [];
  const tiedOptions = tied
    ? (() => {
        const rows = tally(
          alive.map((o) => o.id),
          picks(tied.votes).map((v) => ({ optionId: v.optionId })),
        );
        const top = rows[0]?.count ?? 0;
        return rows.filter((r) => r.count === top).map((r) => alive.find((o) => o.id === r.optionId)!).filter(Boolean);
      })()
    : [];

  // Which options advanced out of each closed shortlist round, for the history view.
  const numberOf = (roundId: string) => rounds.find((r) => r.id === roundId)?.number ?? Infinity;
  const advancedFrom = new Map<string, Set<string>>();
  for (const r of closedRounds) {
    if (r.kind !== "shortlist") continue;
    advancedFrom.set(r.id, new Set(options.filter((o) => !o.eliminatedInRoundId || numberOf(o.eliminatedInRoundId) > r.number).map((o) => o.id)));
  }

  return (
    <Screen>
      <TopBar back={`/app/events/${event.id}`} backLabel={event.title} />
      <div className="flex flex-col gap-3.5">
        <h1 className="font-display text-[30px] font-bold leading-[1.05] tracking-[-0.025em]">{decision.title}</h1>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
          <span>
            {voteTypeLabel(t, decision.voteType)} · {formatLabel(t, decision.format)}
          </span>
          {decision.anonymous ? <Pill>{t.decisionpillAskedAnonymously}</Pill> : null}
        </div>
        <Stepper rounds={rounds} plan={decision.plan} decided={decided} />
        {open ? (
          <div className="flex items-center justify-between gap-3 text-[13px] text-ink-2">
            <div>
              <span className="font-bold text-ink">{roundLabel(t, open, rounds, decision.plan)}.</span> {roundInstruction(t, open.kind, pickCap, decision.advanceCount)}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-accent-deep">
              <Icon name="clock" size={13} stroke={2.5} />
              <LocalTime iso={open.closesAt.toISOString()} mode="closes" fallback={closesRelative(open.closesAt, undefined, locale)} />
            </span>
          </div>
        ) : null}
      </div>

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
          <CopyText
            variant="ghost"
            label={t.decisioncopyForMessenger}
            lines={[
              { text: `${decision.title} (${event.title})` },
              { text: interpolate(t.decisioncopyDecidedLine, { outcome: clipTitle(outcome.title, decision.format), tally: decidedTally }) },
              { text: `${base}/app/decisions/${decision.id}` },
            ]}
          />
          {organizer && planning ? (
            <form action={reopenRound} className="pt-1">
              <input type="hidden" name="decisionId" value={decision.id} />
              <Button type="submit" variant="ghost" size="sm">
                {t.decisionreopenChangedMinds}
              </Button>
            </form>
          ) : null}
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
        <section className="flex flex-col gap-2.5">
          <SectionLabel right={interpolate(t.decisionideaCount, { count: alive.length })}>{t.decisionideasSoFar}</SectionLabel>
          {alive.length === 0 ? <Card className="p-4 text-sm text-ink-2">{t.decisionnoIdeasYet}</Card> : null}
          {alive.map((o) => {
            const who = o.anonymous ? null : (o.addedBy?.displayName ?? t.decisionsomeoneFallback);
            return (
              <Card key={o.id} className="flex items-center gap-3 p-3.5">
                <Avatar name={who ?? "?"} size={32} ring="#ffffff" />
                <div className="flex min-w-0 flex-col">
                  <div className={decision.format === "long_text" ? "whitespace-pre-line text-[15px] font-semibold leading-snug" : "font-bold"}>{o.title}</div>
                  <div className="text-[13px] text-ink-2">
                    {who ? interpolate(t.decisionpersonsIdea, { name: who }) : t.decisionanonymousIdea}
                    {o.note ? ` · ${o.note}` : ""}
                  </div>
                </div>
              </Card>
            );
          })}
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
        </section>
      ) : null}

      {canAddIdeas ? (
        <Card className="p-4">
          <form action={addOption} className="flex flex-col gap-3">
            <input type="hidden" name="decisionId" value={decision.id} />
            {decision.format === "date" ? (
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-ink-2">{open?.kind === "ideas" ? t.decisionsuggestDates : t.decisionaddDateRange}</span>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" name="dateStart" required aria-label={t.decisionariaStart} className={inputClass} />
                  <input type="date" name="dateEnd" aria-label={t.decisionariaEnd} className={inputClass} />
                </div>
              </div>
            ) : decision.format === "long_text" ? (
              <Field label={open?.kind === "ideas" ? t.decisionaddAnIdea : t.decisionaddAnOption}>
                <textarea
                  name="title"
                  required
                  maxLength={500}
                  rows={3}
                  placeholder={t.decisionlongTextPlaceholder}
                  className="w-full rounded-[14px] border border-line bg-card px-4 py-3 text-[15px] font-medium leading-snug text-ink outline-none placeholder:text-ink-3 focus:border-accent"
                />
              </Field>
            ) : (
              <Field label={open?.kind === "ideas" ? t.decisionaddAnIdea : t.decisionaddAnOption}>
                <input name="title" required maxLength={80} placeholder={t.decisiontitlePlaceholder} className={inputClass} />
              </Field>
            )}
            <input name="note" maxLength={140} placeholder={t.decisionwhyPlaceholder} className={`${inputClass} h-11 text-[15px] font-medium`} />
            <label className="flex items-center gap-2 text-sm text-ink-2">
              <input type="checkbox" name="anonymous" className="h-5 w-5 accent-accent" /> {t.decisionsuggestAnonymously}
            </label>
            <Button type="submit" variant="secondary">
              {t.decisionaddButton}
            </Button>
          </form>
        </Card>
      ) : open?.kind === "ideas" ? (
        <p className="text-xs text-ink-3">{t.decisionorganizerCollectingIdeas}</p>
      ) : null}

      {open && open.kind !== "ideas"
        ? seats.map((seat) => {
            const myVotes = open.votes.filter((v) => v.memberId === seat.id);
            const mine = myVotes.map((v) => v.optionId).filter((id): id is string => id !== null);
            const skipped = myVotes.some((v) => v.optionId === null);
            const hidden = myVotes.some((v) => v.anonymous);
            return (
              <section key={seat.id} className="flex flex-col gap-2.5">
                {seats.length > 1 ? (
                  <SectionLabel right={mine.length ? (hidden ? t.decisionstatusVotedHidden : t.decisionstatusVoted) : skipped ? t.decisionstatusSkipped : t.decisionstatusNotYet}>{seat.userId === user.id ? t.decisionyourVote : interpolate(t.decisionvotingFor, { name: seat.displayName })}</SectionLabel>
                ) : null}
                <VoteForm
                  key={`${open.id}:${seat.id}:${alive.map((o) => o.id).join(",")}`}
                  roundId={open.id}
                  memberId={seat.id}
                  maxPicks={pickCap}
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
            );
          })
        : null}

      {open ? (
        <div className="flex flex-col gap-2">
          {open.kind !== "ideas" ? (
            <div className="flex items-center justify-between">
              <AvatarStack names={members.map((m) => m.displayName)} size={28} max={8} />
              <div className="text-right text-xs text-ink-2">
                {interpolate(t.decisionvotedOfTotal, { voted: votersInOpen.size, total: members.length })}
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
            lines={[
              { text: `${decision.title} (${event.title})` },
              { text: open.kind === "ideas" ? t.decisioncopyAddIdeas : interpolate(t.decisioncopyVote, { round: roundLabel(t, open, rounds, decision.plan) }), closesAtIso: open.closesAt.toISOString() },
              { text: `${base}/app/decisions/${decision.id}` },
              ...(open.kind !== "ideas" && waitingOn.length ? [{ text: interpolate(t.decisioncopyStillWaiting, { names: waitingOn.join(", ") }) }] : []),
            ]}
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
                <ResultBars round={r} rounds={rounds} options={options} format={decision.format} label={label} advancing={advancedFrom.get(r.id) ?? new Set()} winnerId={r.kind === "final" ? (decision.outcomeOptionId ?? null) : null} />
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
