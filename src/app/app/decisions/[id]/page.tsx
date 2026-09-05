import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, AvatarStack, Button, Card, Field, Icon, inputClass, Pill, Screen, SectionLabel, TopBar } from "@/components/ui";
import { addOption, castVote, closeRoundNow, pickWinner, reopenRound, skipDecision, tiebreak } from "@/lib/actions/decisions";
import { requireMembership } from "@/lib/auth";
import type { Member, Option, Round, Vote } from "@/lib/db/schema";
import { ROUND_LABEL, roundInstruction, roundSequence, roundTitle, tally, type RoundKind } from "@/lib/engine/rounds";
import { readError } from "@/lib/flash";
import { closesLabel, formatDate, plural } from "@/lib/format";
import { decisionData } from "@/lib/queries";

type RoundWithVotes = Round & { votes: Vote[] };
type OptionWithAdder = Option & { addedBy: Member | null };

function Stepper({ rounds, plan, decided }: { rounds: RoundWithVotes[]; plan: "quick" | "shortlist_final" | "ideas_shortlist_final"; decided: boolean }) {
  const seq = roundSequence(plan);
  if (seq.length === 1 && rounds.length === 1) return null;
  const done: { kind: RoundKind; number: number; state: "done" | "current" | "todo" }[] = rounds.map((r, i) => ({
    kind: r.kind,
    number: r.number,
    state: r.status === "closed" ? "done" : i === rounds.length - 1 ? "current" : "done",
  }));
  const lastKind = rounds[rounds.length - 1]?.kind;
  const remaining = decided || lastKind === "final" ? [] : seq.slice(seq.indexOf(lastKind ?? seq[0]) + 1);
  const steps = [...done, ...remaining.map((kind, i) => ({ kind, number: rounds.length + i + 1, state: "todo" as const }))];
  return (
    <div className="flex items-center">
      {steps.map((s, i) => (
        <div key={s.number} className={`flex items-center ${i < steps.length - 1 ? "flex-1" : ""}`}>
          <div className="flex items-center gap-1.5">
            <span
              className={`inline-flex h-[22px] w-[22px] items-center justify-center rounded-full font-display text-[11px] font-extrabold ${
                s.state === "done"
                  ? "bg-teal text-white"
                  : s.state === "current"
                    ? "bg-accent text-white shadow-[0_0_0_4px_#fbe6d9]"
                    : "border-2 border-line-2 text-ink-3"
              }`}
            >
              {s.state === "done" ? <Icon name="check" size={12} stroke={3} /> : s.number}
            </span>
            <span className={`text-[13px] font-semibold ${s.state === "done" ? "text-teal-deep" : s.state === "current" ? "text-accent-deep" : "text-ink-3"}`}>
              {ROUND_LABEL[s.kind]}
            </span>
          </div>
          {i < steps.length - 1 ? <div className={`mx-2 h-0.5 flex-1 ${s.state === "done" ? "bg-teal" : "bg-line-2"}`} /> : null}
        </div>
      ))}
    </div>
  );
}

function ResultBars({ round, options, memberName, advancing, winnerId }: { round: RoundWithVotes; options: OptionWithAdder[]; memberName: Map<string, string>; advancing: Set<string>; winnerId: string | null }) {
  const inPlay = options.filter((o) => !o.eliminatedInRoundId || o.eliminatedInRoundId === round.id || advancing.has(o.id) || o.id === winnerId);
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
            {round.votes.filter((v) => v.optionId === r.optionId).length ? (
              <div className="text-xs text-ink-3">{round.votes.filter((v) => v.optionId === r.optionId).map((v) => memberName.get(v.memberId) ?? "?").join(", ")}</div>
            ) : null}
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
  const memberName = new Map(members.map((m) => [m.id, m.displayName]));
  const organizer = member.role === "organizer" || decision.createdByMemberId === member.id;
  const alive = options.filter((o) => !o.eliminatedInRoundId);
  const decided = decision.status === "decided";
  const outcome = decision.outcomeOptionId ? options.find((o) => o.id === decision.outcomeOptionId) : null;
  const open = currentRound && currentRound.status === "open" && decision.status === "open" ? currentRound : null;
  const closedRounds = rounds.filter((r) => r.status === "closed");
  const tied = !open && !decided && currentRound?.tied ? currentRound : null;
  const stalled = !open && !decided && !tied && decision.status === "open";
  const canAddIdeas =
    open && open.kind !== "final" && (open.kind === "ideas" ? decision.anyoneCanAddOptions || organizer : organizer);
  const votersInOpen = open ? new Set(open.votes.map((v) => v.memberId)) : new Set<string>();
  const waitingOn = open ? members.filter((m) => !votersInOpen.has(m.id)).map((m) => m.displayName) : [];

  // Which options advanced out of each closed shortlist round (for the history view).
  const advancedFrom = new Map<string, Set<string>>();
  for (const r of closedRounds) {
    if (r.kind !== "shortlist") continue;
    const survivors = options.filter((o) => !o.eliminatedInRoundId || rounds.find((x) => x.id === o.eliminatedInRoundId)!.number > r.number).map((o) => o.id);
    advancedFrom.set(r.id, new Set(survivors));
  }

  return (
    <Screen>
      <TopBar back={`/app/events/${event.id}`} backLabel={event.title} />
      <div className="flex flex-col gap-3.5">
        <h1 className="font-display text-[30px] font-bold leading-[1.05] tracking-[-0.025em]">{decision.title}</h1>
        <Stepper rounds={rounds} plan={decision.plan} decided={decided} />
        {open ? (
          <div className="flex items-center justify-between text-[13px] text-ink-2">
            <div>
              <span className="font-bold text-ink">{roundTitle(open.kind, open.number, decision.plan)}.</span> {roundInstruction(open.kind, open.maxPicks, decision.advanceCount)}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-accent-deep">
              <Icon name="clock" size={13} stroke={2.5} />
              {closesLabel(open.closesAt).replace("closes ", "")}
            </span>
          </div>
        ) : null}
      </div>

      {error ? <p className="rounded-[12px] bg-accent-tint px-3 py-2 text-sm font-semibold text-accent-deep">{error}</p> : null}

      {decided && outcome ? (
        <div className="flex flex-col gap-1 rounded-card bg-teal-tint p-4">
          <SectionLabel tone="teal">Decided {decision.decidedAt ? formatDate(decision.decidedAt) : ""}</SectionLabel>
          <div className="font-display text-[26px] font-extrabold tracking-[-0.02em] text-teal-ink">{outcome.title}</div>
          {outcome.note ? <div className="text-sm text-teal-deep">{outcome.note}</div> : null}
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
          {canAddIdeas ? (
            <Card className="p-4">
              <form action={addOption} className="flex flex-col gap-3">
                <input type="hidden" name="decisionId" value={decision.id} />
                <Field label="Add an idea">
                  <input name="title" required maxLength={80} placeholder="Beach house in Cascais" className={inputClass} />
                </Field>
                <input name="note" maxLength={140} placeholder="Why? (optional)" className={`${inputClass} h-11 text-[15px] font-medium`} />
                <Button type="submit" variant="secondary">
                  Add idea
                </Button>
              </form>
            </Card>
          ) : (
            <p className="text-xs text-ink-3">The organizer is collecting ideas for this one.</p>
          )}
        </section>
      ) : null}

      {open && open.kind !== "ideas"
        ? seats.map((seat) => {
            const mine = open.votes.filter((v) => v.memberId === seat.id).map((v) => v.optionId);
            const single = open.maxPicks === 1;
            return (
              <section key={seat.id} className="flex flex-col gap-2.5">
                {seats.length > 1 ? (
                  <SectionLabel right={mine.length ? "voted" : "not yet"}>
                    {seat.userId === user.id ? "Your vote" : `Voting for ${seat.displayName}`}
                  </SectionLabel>
                ) : null}
                <form action={castVote} className="flex flex-col gap-2.5">
                  <input type="hidden" name="roundId" value={open.id} />
                  <input type="hidden" name="memberId" value={seat.id} />
                  {alive.map((o) => {
                    const voters = open.votes.filter((v) => v.optionId === o.id).map((v) => memberName.get(v.memberId) ?? "?");
                    return (
                      <label key={o.id} className="block cursor-pointer">
                        <input type={single ? "radio" : "checkbox"} name="optionId" value={o.id} defaultChecked={mine.includes(o.id)} className="peer sr-only" />
                        <Card className="flex items-center gap-3 p-3 peer-checked:border-2 peer-checked:border-accent peer-checked:shadow-accent">
                          <div className="flex min-w-0 flex-1 flex-col gap-1">
                            <div className="font-bold">{o.title}</div>
                            <div className="text-[13px] text-ink-2">
                              {o.addedBy?.displayName ?? "Someone"}’s idea{o.note ? ` · ${o.note}` : ""}
                            </div>
                            {voters.length ? <AvatarStack names={voters} size={20} max={6} ring="#ffffff" /> : <div className="text-xs text-ink-3">No votes yet</div>}
                          </div>
                          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-line-2 text-transparent peer-checked:border-accent">
                            <Icon name="check" size={16} stroke={3} />
                          </span>
                        </Card>
                      </label>
                    );
                  })}
                  <Button type="submit">{mine.length ? "Change my vote" : single ? "Cast my vote" : `Cast my vote · up to ${open.maxPicks}`}</Button>
                </form>
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
            {open.kind === "ideas" ? "Ideas close " : "You can change your mind until the round closes. It closes "}
            {closesLabel(open.closesAt).replace("closes ", "")}
            {open.kind !== "ideas" ? ", or as soon as everyone has voted." : "."}
          </p>
        </div>
      ) : null}

      {tied ? (
        <div className="flex flex-col gap-3 rounded-card bg-ink p-[18px] text-white">
          <div className="flex flex-col gap-1">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-accent-line">It’s a tie</div>
            <div className="font-display text-xl font-bold tracking-[-0.01em]">The final ended level.</div>
            <div className="text-[13px] leading-snug text-line">{organizer ? "Run one more round between the tied options, or just call it." : "The organizer will break the tie."}</div>
          </div>
          {organizer ? (
            <form action={tiebreak}>
              <input type="hidden" name="decisionId" value={decision.id} />
              <Button type="submit" className="w-full">
                Tiebreak round
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {stalled && organizer ? (
        <Card className="flex flex-col gap-2 p-4">
          <div className="font-bold">Nothing to vote on.</div>
          <p className="text-sm text-ink-2">Reopen the last round to add ideas, or set this decision aside.</p>
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
                  {roundTitle(r.kind, r.number, decision.plan)} closed
                </Pill>
                <span className="text-[13px] text-ink-2">
                  {r.closeReason === "everyone_voted" ? "everyone voted, so it closed early" : r.closeReason === "deadline" ? "time was up" : "closed by the organizer"}
                </span>
              </div>
              {r.kind === "ideas" ? (
                <Card className="p-3.5 text-sm text-ink-2">{plural(options.filter((o) => o.addedInRoundId === r.id).length, "idea")} came in.</Card>
              ) : (
                <ResultBars round={r} options={options} memberName={memberName} advancing={advancedFrom.get(r.id) ?? new Set()} winnerId={r.kind === "final" ? (decision.outcomeOptionId ?? null) : null} />
              )}
            </div>
          ))}
        </section>
      ) : null}

      {organizer && decision.status !== "skipped" ? (
        <details className="group rounded-card border border-line bg-card">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-ink-2 [&::-webkit-details-marker]:hidden">
            Organizer controls
          </summary>
          <div className="flex flex-col gap-3 border-t border-line p-4">
            {open ? (
              <form action={closeRoundNow}>
                <input type="hidden" name="decisionId" value={decision.id} />
                <Button type="submit" variant="secondary" size="sm">
                  Close this round now
                </Button>
              </form>
            ) : null}
            <form action={reopenRound}>
              <input type="hidden" name="decisionId" value={decision.id} />
              <Button type="submit" variant="secondary" size="sm">
                {open ? "Give it more time" : "Reopen the last round"}
              </Button>
            </form>
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
          </div>
        </details>
      ) : null}
      <Link href={`/app/events/${event.id}`} className="sr-only">
        Back to {event.title}
      </Link>
    </Screen>
  );
}
