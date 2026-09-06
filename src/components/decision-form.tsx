"use client";

import { useState, type ReactNode } from "react";
import { DeadlinePicker } from "./deadline-picker";
import { SubmitButton } from "./submit-button";
import { Card, Field, inputClass } from "./ui";
import { createDecision } from "@/lib/actions/decisions";
import { useMessages } from "@/components/locale-provider";
import { interpolate } from "@/lib/messages";
import {
  effectivePicks,
  formatLabel,
  FORMATS,
  optionCountRule,
  optionTitleLimit,
  planLabel,
  plansFor,
  voteTypeLabel,
  VOTE_TYPES,
  type Format,
  type Plan,
  type VoteType,
} from "@/lib/engine/rounds";

const textareaClass =
  "w-full rounded-[14px] border border-line bg-card px-4 py-3 text-[16px] font-medium text-ink outline-none placeholder:text-ink-3 focus:border-accent";
const dateClass = `${inputClass} h-11 text-[15px]`;

const PICK_CHOICES = [2, 3, 4];
const OPTION_SLOTS = [0, 1, 2, 3];

type DateRow = { start: string; end: string };
const emptyDates = (): DateRow[] => OPTION_SLOTS.map(() => ({ start: "", end: "" }));

/** A single-row segmented control of real radio inputs, in the DeadlinePicker style. */
function Segmented<T extends string>({ name, label, value, items, onChange }: { name: string; label: string; value: T; items: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-[12px] bg-sand-2 p-1">
      {items.map((it) => (
        <label key={it.value} className="flex-1 cursor-pointer">
          <input type="radio" name={name} value={it.value} checked={value === it.value} onChange={() => onChange(it.value)} className="peer sr-only" />
          <span
            className={`flex h-[38px] items-center justify-center rounded-[9px] text-sm peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${value === it.value ? "bg-card font-bold text-ink shadow-sm" : "font-semibold text-ink-2"}`}
          >
            {it.label}
          </span>
        </label>
      ))}
    </div>
  );
}

function Toggle({ name, title, body, defaultChecked }: { name: string; title: string; body: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-card border border-line bg-card px-3.5 py-3">
      <span className="flex flex-col">
        <span className="text-[15px] font-bold">{title}</span>
        <span className="text-[13px] text-ink-2">{body}</span>
      </span>
      <input type="checkbox" name={name} value="on" defaultChecked={defaultChecked} className="h-6 w-6 shrink-0 accent-teal" />
    </label>
  );
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-ink-2">{label}</span>
      {children}
    </div>
  );
}

/**
 * The new-decision form: title, then the format (what an option is), the type
 * (how a round is voted), the options themselves, the round plan, the deadline
 * and the toggles. Everything the server reads keeps its field name; the state
 * here only drives which fields show and the live hints.
 */
export function DecisionForm({ eventId, defaultDeadline }: { eventId: string; defaultDeadline: "tonight" | "72" }) {
  const t = useMessages();
  const [format, setFormat] = useState<Format>("text");
  const [voteType, setVoteType] = useState<VoteType>("single");
  const [picks, setPicks] = useState(2);
  const [plan, setPlan] = useState<Plan>("quick");
  // Option values, one bucket per format, so switching back does not lose what was typed.
  const [abText, setAbText] = useState<[string, string]>(["", ""]);
  const [textLines, setTextLines] = useState("");
  const [longs, setLongs] = useState<string[]>(OPTION_SLOTS.map(() => ""));
  const [dates, setDates] = useState<DateRow[]>(emptyDates);

  const FORMAT_HINT: Record<Format, string> = {
    text: t.cmpformatHintText,
    long_text: t.cmpformatHintLongText,
    date: t.cmpformatHintDate,
  };

  const PLAN_BODY: Record<Plan, string> = {
    quick: t.cmpplanBodyQuick,
    shortlist_final: t.cmpplanBodyShortlist,
    ideas_shortlist_final: t.cmpplanBodyIdeas,
  };

  const ab = voteType === "ab";
  const plans = plansFor(voteType);
  const rule = optionCountRule(voteType, plan);

  function chooseType(next: VoteType) {
    setVoteType(next);
    if (!plansFor(next).includes(plan)) setPlan("quick");
  }

  // How many options are filled in, for the pick-several hint. Text counts non-empty lines.
  const filled =
    format === "text"
      ? textLines.split(/\r?\n/).filter((l) => l.trim()).length
      : format === "long_text"
        ? longs.filter((l) => l.trim()).length
        : dates.filter((d) => d.start.trim() || d.end.trim()).length;

  let countHint =
    rule.min === 0 ? t.cmpcountHintIdeas : rule.max === rule.min ? interpolate(t.cmpcountHintExactly, { min: rule.min }) : interpolate(t.cmpcountHintAtLeast, { min: rule.min });
  if (voteType === "multi" && filled >= 2) countHint += interpolate(t.cmpcountHintPicks, { count: filled, picks: effectivePicks(picks, filled) });

  const setLong = (i: number, v: string) => setLongs((prev) => prev.map((x, j) => (j === i ? v : x)));
  const setDate = (i: number, key: keyof DateRow, v: string) => setDates((prev) => prev.map((x, j) => (j === i ? { ...x, [key]: v } : x)));

  const dateRow = (i: number, label: string) => (
    <div key={i} className="grid grid-cols-2 gap-2">
      <input type="date" name="dateStart" aria-label={interpolate(t.cmpdateRangeStart, { label })} value={dates[i].start} onChange={(e) => setDate(i, "start", e.target.value)} className={dateClass} />
      <input type="date" name="dateEnd" aria-label={interpolate(t.cmpdateRangeEnd, { label })} value={dates[i].end} onChange={(e) => setDate(i, "end", e.target.value)} className={dateClass} />
    </div>
  );

  let options: ReactNode;
  let optionsLabel: string;
  if (ab) {
    optionsLabel = t.cmptwoOptions;
    if (format === "text") {
      options = (
        <>
          {(["A", "B"] as const).map((letter, i) => (
            <input
              key={letter}
              name="options"
              maxLength={optionTitleLimit("text")}
              aria-label={letter}
              placeholder={i === 0 ? t.cmpoptionYes : t.cmpoptionNo}
              value={abText[i]}
              onChange={(e) => setAbText((prev) => (i === 0 ? [e.target.value, prev[1]] : [prev[0], e.target.value]))}
              className={inputClass}
            />
          ))}
          <div>
            <button type="button" onClick={() => setAbText([t.cmpoptionYes, t.cmpoptionNo])} className="rounded-full bg-sand px-3 py-1.5 text-xs font-bold text-ink-2 hover:bg-sand-2">
              {t.cmpyesNo}
            </button>
          </div>
        </>
      );
    } else if (format === "long_text") {
      options = (["A", "B"] as const).map((letter, i) => (
        <textarea key={letter} name="options" rows={3} maxLength={optionTitleLimit("long_text")} aria-label={letter} value={longs[i]} onChange={(e) => setLong(i, e.target.value)} className={textareaClass} />
      ));
    } else {
      options = (["A", "B"] as const).map((letter, i) => dateRow(i, letter));
    }
  } else if (format === "text") {
    optionsLabel = t.cmpoptionsOnePerLine;
    options = (
      <textarea
        name="options"
        rows={5}
        aria-label={t.cmpoptionsOnePerLine}
        placeholder={t.cmpoptionsPlaceholderText}
        value={textLines}
        onChange={(e) => setTextLines(e.target.value)}
        className={textareaClass}
      />
    );
  } else if (format === "long_text") {
    optionsLabel = t.cmpoptionsAParagraphEach;
    options = OPTION_SLOTS.map((i) => (
      <textarea
        key={i}
        name="options"
        rows={3}
        maxLength={optionTitleLimit("long_text")}
        aria-label={interpolate(t.cmpoptionN, { n: i + 1 })}
        placeholder={i === 0 ? t.cmpoptionPlaceholderLong : undefined}
        value={longs[i]}
        onChange={(e) => setLong(i, e.target.value)}
        className={textareaClass}
      />
    ));
  } else {
    optionsLabel = t.cmpdateRangesToChoose;
    options = OPTION_SLOTS.map((i) => dateRow(i, interpolate(t.cmpoptionN, { n: i + 1 })));
  }

  return (
    <form action={createDecision} className="flex flex-col gap-6">
      <input type="hidden" name="eventId" value={eventId} />
      <Field label={t.cmpwhatDeciding}>
        <input name="title" required maxLength={100} placeholder={t.cmptitlePlaceholder} className={inputClass} autoFocus />
      </Field>

      <Section label={t.cmpsectionFormat}>
        <Segmented name="format" label={t.cmpsectionFormat} value={format} items={FORMATS.map((f) => ({ value: f, label: formatLabel(t, f) }))} onChange={setFormat} />
        <span className="text-xs text-ink-3">{FORMAT_HINT[format]}</span>
      </Section>

      <Section label={t.cmpsectionType}>
        <Segmented name="voteType" label={t.cmpsectionType} value={voteType} items={VOTE_TYPES.map((vt) => ({ value: vt, label: voteTypeLabel(t, vt) }))} onChange={chooseType} />
        <span className="text-xs text-ink-3">
          {voteType === "ab" ? t.cmptypeHintAb : voteType === "single" ? t.cmptypeHintSingle : interpolate(t.cmptypeHintMulti, { picks })}
        </span>
        {voteType === "multi" ? (
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink-2">{t.cmpeachPersonPicks}</span>
            <span className="w-20 shrink-0">
              <select name="picks" value={picks} onChange={(e) => setPicks(Number(e.target.value))} className={`${inputClass} h-11 px-3 text-[15px]`}>
                {PICK_CHOICES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </span>
          </label>
        ) : null}
      </Section>

      <Section label={optionsLabel}>
        {options}
        <span className="text-xs text-ink-3">{countHint}</span>
      </Section>

      {ab ? (
        <>
          <input type="hidden" name="plan" value="quick" />
          <span className="text-xs text-ink-3">{t.cmponeRoundAb}</span>
        </>
      ) : (
        <Section label={t.cmpsectionRounds}>
          <div role="radiogroup" aria-label={t.cmpsectionRounds} className="flex flex-col gap-2">
            {plans.map((p) => (
              <label key={p} className="group block cursor-pointer">
                <input type="radio" name="plan" value={p} checked={plan === p} onChange={() => setPlan(p)} className="sr-only" />
                <Card as="span" className="flex items-center gap-3 px-3.5 py-3 group-has-checked:border-2 group-has-checked:border-accent group-has-checked:shadow-accent group-has-focus-visible:ring-2 group-has-focus-visible:ring-accent">
                  <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-line-2 group-has-checked:border-accent group-has-checked:bg-accent">
                    <span className="h-2 w-2 rounded-full bg-transparent group-has-checked:bg-white" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[15px] font-bold">{planLabel(t, p)}</span>
                    <span className="text-[13px] text-ink-2">{PLAN_BODY[p]}</span>
                  </span>
                </Card>
              </label>
            ))}
          </div>
        </Section>
      )}

      <DeadlinePicker defaultChoice={defaultDeadline} />

      {ab ? null : <Toggle name="anyoneCanAddOptions" title={t.cmptoggleAddIdeasTitle} body={t.cmptoggleAddIdeasBody} defaultChecked />}
      {format === "date" ? <Toggle name="setsEventDates" title={t.cmptoggleWinnerDatesTitle} body={t.cmptoggleWinnerDatesBody} defaultChecked /> : null}
      <Toggle name="anonymous" title={t.cmptoggleAnonTitle} body={t.cmptoggleAnonBody} />

      <SubmitButton pendingLabel={t.cmpstartingPending}>{plan === "ideas_shortlist_final" ? t.cmpstartRound1Ideas : t.cmpstartRound1}</SubmitButton>
    </form>
  );
}
