import { notFound } from "next/navigation";
import { LocalTime } from "@/components/time";
import { Avatar, AvatarStack, Button, Card, Field, Icon, inputClass, Pill, Screen, SectionLabel, TopBar } from "@/components/ui";
import { VoteForm } from "@/components/vote-form";
import { addOption, closeRoundNow, extendRound, pickWinner, removeOption, renameDecision, reopenRound, skipDecision, tiebreak } from "@/lib/actions/decisions";
import { CopyText } from "@/components/copy-text";
import { baseUrl } from "@/lib/url";
import { requireMembership } from "@/lib/auth";
import type { Member, Option, Round, Vote } from "@/lib/db/schema";
import { ROUND_LABEL, isTiebreak, roundInstruction, roundLabel, roundSequence, tally, type RoundKind } from "@/lib/engine/rounds";
import { readError } from "@/lib/flash";
import { closesRelative, formatDate, plural } from "@/lib/format";
import { decisionData } from "@/lib/queries";

type RoundWithVotes = Round & { votes: Vote[] };
type OptionWithAdder = Option & { addedBy: Member | null };

function Stepper({ rounds, plan, decided }: { rounds: RoundWithVotes[]; plan: "quick" | "shortlist_final" | "ideas_shortlist_final"; decided: boolean }) {
  const seq = roundSequence(plan);
  if (seq.length === 1 && rounds.length <= 1) return null;
  const done = rounds.map((r, i) => ({
    key: r.id,
    label: isTiebreak(r, rounds) ? "Tiebreak" : ROUND_LABEL[r.kind],
    number: r.number,
    state: (r.status === "closed" ? "done" : i === rounds.length - 1 ? "current" : "done") as "done" | "current" | "todo",
  }));
  const lastKind = rounds[rounds.length - 1]?.kind;
  const remaining: RoundKind[] = decided || lastKind === "final" ? [] : seq.slice(seq.indexOf(lastKind ?? seq[0]) + 1);
  const steps = [...done, ...remaining.map((kind, i) => ({ key: "todo-" + kind, label: ROUND_LABEL[kind], number: rounds.length + i + 1, state: "todo" as const }))];
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

function ResultBars({ round, rounds, options, memberName, advancing, winnerId }: { round: RoundWithVotes; rounds: RoundWithVotes[]; options: OptionWithAdder[]; memberName: Map<string, string>; advancing: Set<string>; winnerId: string | null }) {
  const numberOf = (roundId: string) => rounds.find((r) => r.id === roundId)?.number ?? Infinity;
  // Everything that was on this round's ballot: still alive, or knocked out in this round or a later one.
  const inPlay = options.filter((o) => !o.eliminatedInRoundId || numberOf(o.eliminatedInRoundId) >= round.number);
  const rows = tally(
    inPlay.map((o) => o.id),
    round.votes.map((v) => ({ optionId: v.optionId })),
  );
  const max = Math.max(1, ...rows.map((r) => r.count));
  const voters = new Set(round.votes.map((v) => v.memberId)).size;
  return (
    <div className="flex flex-col gap-2">
      {rows.map((r) => {
        const o = options.find((x) => x.id === r.optionId);
        const out = o?.eliminatedInRoundId === round.id;
        const won = r.optionId === winnerId;
        const adv = advancing.has(r.optionId);
        const names = round.votes.filter((v) => v.optionId === r.optionId).map((v) => memberName.get(v.memberId) ?? "?");
        return (
          <Card key={r.optionId} className={`flex flex-col gap-2 p-3.5 ${out ? "opacity-70" : ""}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`font-bold ${out ? "text-ink-2" : ""}`}>{o?.title ?? "?"}</span>
                {won ? <Pill tone="teal">Winner</Pill> : adv ? <Pill tone="accent">To the final</Pill> : null}
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
        {plural(round.votes.length, "vote")} from {plural(voters, "person", "people")}
        {round.maxPicks > 1 ? ` · up to ${round.maxPicks} each` : ""}
      </div>
    </div>
  );
}

export default async function DecisionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const { id } = await params;
  const error = readError(await searchParams);
  const { user, family, member } = await requireMembership();
  const data = await decisionData(id, family.id, user.id);
  if (!data) notFound();
  const { decision, event, rounds, currentRound, options, members, seats } = data;
  const base = await baseUrl();
  const memberName = new Map(members.map((m) => [m.id, m.displayName]));
  const organizer = member.role === "organizer" || decision.createdByMemberId === member.id;
  const planning = event.status === "planning";
  const alive = options.filter((o) => !o.eliminatedInRoundId);
  const decided = decision.status === "decided";
  const outcome = decision.outcomeOptionId ? options.find((o) => o.id === decision.outcomeOptionId) : null;
  const open = planning && currentRound && currentRound.status === "open" && decision.status === "open" ? currentRound : null;
  const closedRounds = rounds.filter((r) => r.status === "closed");
  const lastClosed = closedRounds[closedRounds.length - 1] ?? null;
  const tied = !open && !decided && decision.status === "open" && currentRound?.tied ? currentRound : null;
  const stalled = planning && !open && !decided && !tied && decision.status === "open";
  const canAddIdeas = open && open.kind !== "final" && (open.kind === "ideas" ? decision.anyoneCanAddOptions || organizer : organizer);
  const votersInOpen = open ? new Set(open.votes.map((v) => v.memberId)) : new Set<string>();
  const waitingOn = open ? members.filter((m) => !votersInOpen.has(m.id)).map((m) => m.displayName) : [];
  const tiedOptions = tied
    ? (() => {
        const rows = tally(
          alive.map((o) => o.id),
          tied.votes.map((v) => ({ optionId: v.optionId })),
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
        <Stepper rounds={rounds} plan={decision.plan} decided={decided} />
        {open ? (
          <div className="flex items-center justify-between gap-3 text-[13px] text-ink-2">
            <div>
              <span className="font-bold text-ink">{roundLabel(open, rounds, decision.plan)}.</span> {roundInstruction(open.kind, open.maxPicks, decision.advanceCount)}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-accent-deep">
              <Icon name="clock" size={13} stroke={2.5} />
              <LocalTime iso={open.closesAt.toISOString()} mode="closes" fallback={closesRelative(open.closesAt)} />
            </span>
          </div>
        ) : null}
      </div>

      {error ? <p className="rounded-[12px] bg-accent-tint px-3 py-2 text-sm font-semibold text-accent-deep">{error}</p> : null}
      {!planning ? <Card className="p-4 text-sm text-ink-2">This event is {event.status}, so voting is closed here.</Card> : null}

      {decided && outcome ? (
        <div className="flex flex-col gap-2 rounded-card bg-teal-tint p-4">
          <SectionLabel tone="teal">
            Decided <LocalTime iso={(decision.decidedAt ?? decision.createdAt).toISOString()} mode="date" fallback={formatDate(decision.decidedAt ?? decision.createdAt)} />
          </SectionLabel>
          <div className="font-display text-[26px] font-extrabold tracking-[-0.02em] text-teal-ink">{outcome.title}</div>
          {outcome.note ? <div className="text-sm text-teal-deep">{outcome.note}</div> : null}
          {decision.setsEventDates ? <div className="text-sm text-teal-deep">These are now the event’s dates.</div> : null}
          {organizer && planning ? (
            <form action={reopenRound} className="pt-1">
              <input type="hidden" name="decisionId" value={decision.id} />
              <Button type="submit" variant="ghost" size="sm">
                Changed your minds? Reopen the last round
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {decision.status === "skipped" ? <Card className="p-4 text-sm text-ink-2">This decision was set aside.</Card> : null}

      {open && open.kind === "ideas" ? (
        <section className="flex flex-col gap-2.5">
          <SectionLabel right={plural(alive.length, "idea")}>Ideas so far</SectionLabel>
          {alive.length === 0 ? <Card className="p-4 text-sm text-ink-2">No ideas yet. Be the first.</Card> : null}
          {alive.map((o) => (
            <Card key={o.id} className="flex items-center gap-3 p-3.5">
              <Avatar name={o.addedBy?.displayName ?? "?"} size={32} ring="#ffffff" />
              <div className="flex min-w-0 flex-col">
                <div className="font-bold">{o.title}</div>
                <div className="text-[13px] text-ink-2">
                  {o.addedBy?.displayName ?? "Someone"}’s idea{o.note ? ` · ${o.note}` : ""}
                </div>
              </div>
            </Card>
          ))}
          {organizer && alive.length >= 2 ? (
            <div className="flex flex-col gap-2 rounded-card bg-ink p-4 text-white">
              <div className="font-display text-lg font-bold">Got all the ideas?</div>
              <p className="text-[13px] text-line">Ideas rounds only close on their deadline. Start the next round whenever the list looks complete.</p>
              <form action={closeRoundNow}>
                <input type="hidden" name="decisionId" value={decision.id} />
                <Button type="submit" size="sm" className="w-full">
                  {alive.length <= decision.advanceCount ? "Start the final" : "Start the shortlist"}
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
            {decision.setsEventDates ? (
              <div className="flex flex-col gap-2">
                <span className="text-[13px] font-semibold text-ink-2">{open?.kind === "ideas" ? "Suggest dates" : "Add a date range (organizer)"}</span>
                <div className="grid grid-cols-2 gap-2">
                  <input type="date" name="dateStart" required aria-label="Start" className={inputClass} />
                  <input type="date" name="dateEnd" aria-label="End" className={inputClass} />
                </div>
              </div>
            ) : (
              <Field label={open?.kind === "ideas" ? "Add an idea" : "Add an option (organizer)"}>
                <input name="title" required maxLength={80} placeholder="Beach house in Cascais" className={inputClass} />
              </Field>
            )}
            <input name="note" maxLength={140} placeholder="Why? (optional)" className={`${inputClass} h-11 text-[15px] font-medium`} />
            <Button type="submit" variant="secondary">
              Add
            </Button>
          </form>
        </Card>
      ) : open?.kind === "ideas" ? (
        <p className="text-xs text-ink-3">The organizer is collecting ideas for this one.</p>
      ) : null}

      {open && open.kind !== "ideas"
        ? seats.map((seat) => {
            const mine = open.votes.filter((v) => v.memberId === seat.id).map((v) => v.optionId);
            return (
              <section key={seat.id} className="flex flex-col gap-2.5">
                {seats.length > 1 ? (
                  <SectionLabel right={mine.length ? "voted" : "not yet"}>{seat.userId === user.id ? "Your vote" : `Voting for ${seat.displayName}`}</SectionLabel>
                ) : null}
                <VoteForm
                  roundId={open.id}
                  memberId={seat.id}
                  maxPicks={open.maxPicks}
                  initial={mine}
                  changed={mine.length > 0}
                  options={alive.map((o) => ({
                    id: o.id,
                    title: o.title,
                    byline: `${o.addedBy?.displayName ?? "Someone"}’s idea${o.note ? ` · ${o.note}` : ""}`,
                    voters: open.votes.filter((v) => v.optionId === o.id).map((v) => memberName.get(v.memberId) ?? "?"),
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
                {votersInOpen.size} of {members.length} voted
                {waitingOn.length ? (
                  <>
                    <br />
                    waiting on {waitingOn.slice(0, 3).join(", ")}
                    {waitingOn.length > 3 ? ` +${waitingOn.length - 3}` : ""}
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
          <p className="text-center text-xs text-ink-3">
            {open.kind === "ideas" ? "Ideas " : "You can change your mind until the round closes. It "}
            <LocalTime iso={open.closesAt.toISOString()} mode="closes" fallback={closesRelative(open.closesAt)} />
            {open.kind !== "ideas" ? ", or as soon as everyone has voted." : "."}
          </p>
          <CopyText
            lines={[
              { text: `${decision.title} (${event.title})` },
              { text: open.kind === "ideas" ? "Add your ideas, {closes}:" : `${roundLabel(open, rounds, decision.plan)}. Vote, {closes}:`, closesAtIso: open.closesAt.toISOString() },
              { text: `${base}/app/decisions/${decision.id}` },
            ]}
          />
        </div>
      ) : null}

      {tied ? (
        <div className="flex flex-col gap-3 rounded-card bg-ink p-[18px] text-white">
          <div className="flex flex-col gap-1">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-accent-line">It’s a tie</div>
            <div className="font-display text-xl font-bold tracking-[-0.01em]">{tiedOptions.map((o) => o.title).join(" and ")} ended level.</div>
            <div className="text-[13px] leading-snug text-line">{organizer ? "Run one more round between them, or just call it." : "The organizer will break the tie."}</div>
          </div>
          {organizer ? (
            <div className="flex flex-col gap-2">
              <form action={tiebreak}>
                <input type="hidden" name="decisionId" value={decision.id} />
                <Button type="submit" className="w-full">
                  Tiebreak round
                </Button>
              </form>
              <div className="grid grid-cols-2 gap-2">
                {tiedOptions.map((o) => (
                  <form key={o.id} action={pickWinner}>
                    <input type="hidden" name="decisionId" value={decision.id} />
                    <input type="hidden" name="optionId" value={o.id} />
                    <button type="submit" className="h-11 w-full rounded-[12px] border border-[#4a423a] px-3 text-sm font-semibold text-white hover:bg-[#2c2622]">
                      Just take {o.title}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {stalled ? (
        <Card className="flex flex-col gap-2 p-4">
          <div className="font-bold">Nothing to vote on.</div>
          <p className="text-sm text-ink-2">
            {alive.length === 0 ? "No ideas came in before the round closed." : "The round closed without a result."}{" "}
            {organizer ? "Reopen the last round, or set this decision aside." : "The organizer can reopen it."}
          </p>
          {organizer ? (
            <div className="flex gap-2">
              <form action={reopenRound}>
                <input type="hidden" name="decisionId" value={decision.id} />
                <Button type="submit" variant="secondary" size="sm">
                  Reopen the last round
                </Button>
              </form>
              <form action={skipDecision}>
                <input type="hidden" name="decisionId" value={decision.id} />
                <Button type="submit" variant="danger" size="sm">
                  Set aside
                </Button>
              </form>
            </div>
          ) : null}
        </Card>
      ) : null}

      {closedRounds.length ? (
        <section className="flex flex-col gap-3">
          <SectionLabel>{decided ? "How it went" : "Earlier rounds"}</SectionLabel>
          {[...closedRounds].reverse().map((r) => (
            <div key={r.id} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Pill tone="teal">
                  <Icon name="check" size={12} stroke={3} />
                  {roundLabel(r, rounds, decision.plan)} closed
                </Pill>
                <span className="text-[13px] text-ink-2">
                  {r.closeReason === "everyone_voted" ? "everyone voted, so it closed early" : r.closeReason === "deadline" ? "time was up" : "closed by the organizer"}
                </span>
              </div>
              {r.kind === "ideas" ? (
                <Card className="p-3.5 text-sm text-ink-2">{plural(options.filter((o) => o.addedInRoundId === r.id).length, "idea")} came in.</Card>
              ) : (
                <ResultBars round={r} rounds={rounds} options={options} memberName={memberName} advancing={advancedFrom.get(r.id) ?? new Set()} winnerId={r.kind === "final" ? (decision.outcomeOptionId ?? null) : null} />
              )}
            </div>
          ))}
        </section>
      ) : null}

      {organizer && planning && decision.status !== "skipped" ? (
        <Card className="flex flex-col gap-3 p-4">
          <SectionLabel>Organizer</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {open ? (
              <>
                <form action={closeRoundNow}>
                  <input type="hidden" name="decisionId" value={decision.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    Close this round now
                  </Button>
                </form>
                <form action={extendRound}>
                  <input type="hidden" name="decisionId" value={decision.id} />
                  <Button type="submit" variant="secondary" size="sm">
                    Give it more time
                  </Button>
                </form>
              </>
            ) : null}
            {lastClosed && !decided ? (
              <form action={reopenRound}>
                <input type="hidden" name="decisionId" value={decision.id} />
                <Button type="submit" variant="secondary" size="sm">
                  Reopen round {lastClosed.number}
                </Button>
              </form>
            ) : null}
          </div>
          <form action={renameDecision} className="flex flex-col gap-2">
            <input type="hidden" name="decisionId" value={decision.id} />
            <Field label="Rename">
              <input name="title" defaultValue={decision.title} required maxLength={100} className={`${inputClass} h-11 text-[15px]`} />
            </Field>
            <Button type="submit" variant="ghost" size="sm">
              Save title
            </Button>
          </form>
          {open && open.kind !== "final" && alive.length ? (
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-semibold text-ink-2">Remove an option</span>
              <div className="flex flex-col gap-1.5">
                {alive.map((o) => (
                  <form key={o.id} action={removeOption} className="flex items-center justify-between gap-2 rounded-[10px] bg-sand px-3 py-1.5">
                    <input type="hidden" name="decisionId" value={decision.id} />
                    <input type="hidden" name="optionId" value={o.id} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{o.title}</span>
                    <Button type="submit" variant="ghost" size="sm">
                      Remove
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          ) : null}
          {!decided && alive.length ? (
            <form action={pickWinner} className="flex flex-col gap-2">
              <input type="hidden" name="decisionId" value={decision.id} />
              <Field label="Just call it">
                <select name="optionId" className={`${inputClass} h-11 text-[15px]`}>
                  {alive.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.title}
                    </option>
                  ))}
                </select>
              </Field>
              <Button type="submit" variant="dark" size="sm">
                Decide
              </Button>
            </form>
          ) : null}
          {!decided ? (
            <form action={skipDecision}>
              <input type="hidden" name="decisionId" value={decision.id} />
              <Button type="submit" variant="danger" size="sm">
                Set this decision aside
              </Button>
            </form>
          ) : null}
          <p className="text-xs text-ink-3">These are for you and whoever asked the question. Everything here is written to the event’s log.</p>
        </Card>
      ) : null}
    </Screen>
  );
}
