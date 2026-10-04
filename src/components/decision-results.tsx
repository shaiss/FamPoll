import { Avatar, Button, Card, Field, Icon, inputClass, Pill, SectionLabel } from "@/components/ui";
import { addOption } from "@/lib/actions/decisions";
import type { Vote } from "@/lib/db/schema";
import { effectivePicks, formatLabel, isTiebreak, peopleVoted, roundKindLabel, roundSequence, tally, voteTypeLabel, type Format, type RoundKind } from "@/lib/engine/rounds";
import type { OptionView, RoundView } from "@/lib/queries";
import { interpolate, type Messages } from "@/lib/messages";
import { getMessages } from "@/lib/locale-server";

type Picked = Vote & { optionId: string };
export const pickedVotes = (votes: Vote[]): Picked[] => votes.filter((v): v is Picked => v.optionId !== null);

export async function DecisionMeta({
  voteType,
  format,
  anonymous,
  adultsOnly,
}: {
  voteType: "ab" | "single" | "multi";
  format: Format;
  anonymous: boolean;
  adultsOnly: boolean;
}) {
  const t = await getMessages();
  return (
    <div className="flex flex-wrap items-center gap-2 text-[13px] text-ink-3">
      <span>
        {voteTypeLabel(t, voteType)} · {formatLabel(t, format)}
      </span>
      {anonymous ? <Pill>{t.decisionpillAskedAnonymously}</Pill> : null}
      {adultsOnly ? <Pill tone="teal">{t.decisionAdultsPill}</Pill> : null}
    </div>
  );
}

export async function Stepper({ rounds, plan, decided }: { rounds: RoundView[]; plan: "quick" | "shortlist_final" | "ideas_shortlist_final"; decided: boolean }) {
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

export async function ResultBars({ round, rounds, options, format, label, advancing, winnerId, ranked = false }: { round: RoundView; rounds: RoundView[]; options: OptionView[]; format: Format; label: (v: Vote) => string; advancing: Set<string>; winnerId: string | null; ranked?: boolean }) {
  const t = await getMessages();
  const numberOf = (roundId: string) => rounds.find((r) => r.id === roundId)?.number ?? Infinity;
  const inPlay = options.filter((o) => !o.eliminatedInRoundId || numberOf(o.eliminatedInRoundId) >= round.number);
  const chosen = pickedVotes(round.votes);
  const counted = ranked ? chosen.filter((v) => v.rank === 1) : chosen;
  const rows = tally(
    inPlay.map((o) => o.id),
    counted.map((v) => ({ optionId: v.optionId })),
  );
  const max = Math.max(1, ...rows.map((r) => r.count));
  const voters = peopleVoted(round.votes);
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
        const names = sealed ? [] : counted.filter((v) => v.optionId === r.optionId).map(label);
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
        {interpolate(t.decisionvotesFrom, { votes: interpolate(t.decisionvoteCount, { count: counted.length }), people: interpolate(t.decisionpersonCount, { count: voters }) })}
        {!ranked && cap > 1 ? ` · ${interpolate(t.decisionpicksUpToEach, { cap })}` : ""}
        {skippers.length ? (sealed ? ` · ${interpolate(t.decisionskippedCount, { count: skippers.length })}` : ` · ${interpolate(t.decisionskippedNames, { names: skippers.join(", ") })}`) : ""}
      </div>
      {sealed ? (
        <div className="text-center text-xs text-ink-3">
          {interpolate(t.decisionprivateVotesNote, { hidden: hiddenVoters, voters })}
        </div>
      ) : null}
      {ranked ? <div className="text-center text-xs text-ink-3">{t.decisionRankedNote}</div> : null}
    </div>
  );
}

export async function DatesGrid({ round, rounds, options, label }: { round: RoundView; rounds: RoundView[]; options: OptionView[]; label: (v: Vote) => string }) {
  const t = await getMessages();
  const numberOf = (rid: string) => rounds.find((r) => r.id === rid)?.number ?? Infinity;
  const cols = options.filter((o) => !o.eliminatedInRoundId || numberOf(o.eliminatedInRoundId) >= round.number);
  const chosen = round.votes.filter((v): v is Vote & { optionId: string } => v.optionId !== null);
  const named = chosen.filter((v): v is Vote & { optionId: string; memberId: string } => v.memberId !== null);
  const seatIds = [...new Set(named.map((v) => v.memberId))];
  if (cols.length === 0 || seatIds.length === 0) return null;
  const nameOf = (sid: string) => label(named.find((v) => v.memberId === sid)!);
  const countFor = (oid: string) => chosen.filter((v) => v.optionId === oid).length;
  const best = Math.max(...cols.map((c) => countFor(c.id)));
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>{t.decisionGridTitle}</SectionLabel>
      <Card className="overflow-x-auto p-2">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="p-2" />
              {cols.map((c) => (
                <th key={c.id} className={`p-2 text-center align-bottom text-xs font-bold ${countFor(c.id) === best && best > 0 ? "text-teal-deep" : "text-ink-2"}`}>
                  <span className="inline-block max-w-[88px] leading-tight">{c.title}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {seatIds.map((sid) => (
              <tr key={sid} className="border-t border-line">
                <td className="whitespace-nowrap p-2 pr-3 text-left font-semibold">{nameOf(sid)}</td>
                {cols.map((c) => (
                  <td key={c.id} className="p-2 text-center">
                    {named.some((v) => v.memberId === sid && v.optionId === c.id) ? (
                      <Icon name="check" size={16} stroke={3} className="mx-auto text-teal-deep" />
                    ) : (
                      <span className="text-ink-3">·</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr className="border-t-2 border-line-2">
              <td className="p-2" />
              {cols.map((c) => (
                <td key={c.id} className={`p-2 text-center font-display font-extrabold ${countFor(c.id) === best && best > 0 ? "text-teal-deep" : "text-ink-2"}`}>{countFor(c.id)}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </Card>
    </section>
  );
}

export async function IdeasSoFar({ options, format }: { options: OptionView[]; format: Format }) {
  const t = await getMessages();
  const longText = format === "long_text";
  return (
    <section className="flex flex-col gap-2.5">
      <SectionLabel right={interpolate(t.decisionideaCount, { count: options.length })}>{t.decisionideasSoFar}</SectionLabel>
      {options.length === 0 ? <Card className="p-4 text-sm text-ink-2">{t.decisionnoIdeasYet}</Card> : null}
      {options.map((o) => {
        const who = o.anonymous ? null : (o.addedBy?.displayName ?? t.decisionsomeoneFallback);
        return (
          <Card key={o.id} className="flex items-center gap-3 p-3.5">
            <Avatar name={who ?? "?"} size={32} ring="#ffffff" />
            <div className="flex min-w-0 flex-col">
              <div className={longText ? "whitespace-pre-line text-[15px] font-semibold leading-snug" : "font-bold"}>{o.title}</div>
              <div className="text-[13px] text-ink-2">
                {who ? interpolate(t.decisionpersonsIdea, { name: who }) : t.decisionanonymousIdea}
                {o.note ? ` · ${o.note}` : ""}
              </div>
            </div>
          </Card>
        );
      })}
    </section>
  );
}

export function AddOptionForm({
  decisionId,
  memberId,
  format,
  ideasRound,
  t,
}: {
  decisionId: string;
  memberId: string;
  format: Format;
  ideasRound: boolean;
  t: Messages;
}) {
  return (
    <Card className="p-4">
      <form action={addOption} className="flex flex-col gap-3">
        <input type="hidden" name="decisionId" value={decisionId} />
        <input type="hidden" name="memberId" value={memberId} />
        {format === "date" ? (
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-ink-2">{ideasRound ? t.decisionsuggestDates : t.decisionaddDateRange}</span>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" name="dateStart" required aria-label={t.decisionariaStart} className={inputClass} />
              <input type="date" name="dateEnd" aria-label={t.decisionariaEnd} className={inputClass} />
            </div>
          </div>
        ) : format === "long_text" ? (
          <Field label={ideasRound ? t.decisionaddAnIdea : t.decisionaddAnOption}>
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
          <Field label={ideasRound ? t.decisionaddAnIdea : t.decisionaddAnOption}>
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
  );
}
