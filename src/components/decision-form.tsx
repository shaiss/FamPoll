"use client";

import { useState, type ReactNode } from "react";
import { DeadlinePicker } from "./deadline-picker";
import { SubmitButton } from "./submit-button";
import { Card, Field, inputClass } from "./ui";
import { createDecision } from "@/lib/actions/decisions";
import {
  effectivePicks,
  FORMAT_LABEL,
  FORMATS,
  optionCountRule,
  optionTitleLimit,
  PLAN_LABEL,
  plansFor,
  VOTE_TYPE_LABEL,
  VOTE_TYPES,
  type Format,
  type Plan,
  type VoteType,
} from "@/lib/engine/rounds";

const textareaClass =
  "w-full rounded-[14px] border border-line bg-card px-4 py-3 text-[16px] font-medium text-ink outline-none placeholder:text-ink-3 focus:border-accent";
const dateClass = `${inputClass} h-11 text-[15px]`;

const FORMAT_HINT: Record<Format, string> = {
  text: "A short line each.",
  long_text: "A paragraph each: a plan, a place, the why.",
  date: "Date ranges. The winner can set the event’s dates.",
};

const PLAN_BODY: Record<Plan, string> = {
  quick: "One round. Tonight’s dinner.",
  shortlist_final: "Two rounds. Narrow it down, then pick.",
  ideas_shortlist_final: "Three rounds. Gather ideas first.",
};

const PICK_CHOICES = [2, 3, 4];
const OPTION_SLOTS = [0, 1, 2, 3];

type DateRow = { start: string; end: string };
const emptyDates = (): DateRow[] => OPTION_SLOTS.map(() => ({ start: "", end: "" }));

/** A single-row segmented control of real radio inputs, in the DeadlinePicker style. */
function Segmented<T extends string>({ name, value, items, onChange }: { name: string; value: T; items: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-[12px] bg-sand-2 p-1">
      {items.map((it) => (
        <label key={it.value} className="flex-1 cursor-pointer">
          <input type="radio" name={name} value={it.value} checked={value === it.value} onChange={() => onChange(it.value)} className="sr-only" />
          <span className={`flex h-[38px] items-center justify-center rounded-[9px] text-sm ${value === it.value ? "bg-card font-bold text-ink shadow-sm" : "font-semibold text-ink-2"}`}>{it.label}</span>
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
  const [format, setFormat] = useState<Format>("text");
  const [voteType, setVoteType] = useState<VoteType>("single");
  const [picks, setPicks] = useState(2);
  const [plan, setPlan] = useState<Plan>("quick");
  // Option values, one bucket per format, so switching back does not lose what was typed.
  const [abText, setAbText] = useState<[string, string]>(["", ""]);
  const [textLines, setTextLines] = useState("");
  const [longs, setLongs] = useState<string[]>(OPTION_SLOTS.map(() => ""));
  const [dates, setDates] = useState<DateRow[]>(emptyDates);

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
    rule.min === 0 ? "Starting with ideas? Leave these empty and everyone adds their own." : rule.max === rule.min ? `Exactly ${rule.min}.` : `At least ${rule.min}.`;
  if (voteType === "multi" && filled >= 2) countHint += ` With ${filled} options everyone picks up to ${effectivePicks(picks, filled)}.`;

  const setLong = (i: number, v: string) => setLongs((prev) => prev.map((x, j) => (j === i ? v : x)));
  const setDate = (i: number, key: keyof DateRow, v: string) => setDates((prev) => prev.map((x, j) => (j === i ? { ...x, [key]: v } : x)));

  const dateRow = (i: number, label: string) => (
    <div key={i} className="grid grid-cols-2 gap-2">
      <input type="date" name="dateStart" aria-label={`${label} start`} value={dates[i].start} onChange={(e) => setDate(i, "start", e.target.value)} className={dateClass} />
      <input type="date" name="dateEnd" aria-label={`${label} end`} value={dates[i].end} onChange={(e) => setDate(i, "end", e.target.value)} className={dateClass} />
    </div>
  );

  let options: ReactNode;
  let optionsLabel: string;
  if (ab) {
    optionsLabel = "The two options";
    if (format === "text") {
      options = (
        <>
          {(["A", "B"] as const).map((letter, i) => (
            <input
              key={letter}
              name="options"
              maxLength={optionTitleLimit("text")}
              aria-label={letter}
              placeholder={i === 0 ? "Yes" : "No"}
              value={abText[i]}
              onChange={(e) => setAbText((prev) => (i === 0 ? [e.target.value, prev[1]] : [prev[0], e.target.value]))}
              className={inputClass}
            />
          ))}
          <div>
            <button type="button" onClick={() => setAbText(["Yes", "No"])} className="rounded-full bg-sand px-3 py-1.5 text-xs font-bold text-ink-2 hover:bg-sand-2">
              Yes / No
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
    optionsLabel = "Options, one per line";
    options = (
      <textarea
        name="options"
        rows={5}
        placeholder={"Apartment in Alfama\nBeach house in Cascais\nHotel near Belém"}
        value={textLines}
        onChange={(e) => setTextLines(e.target.value)}
        className={textareaClass}
      />
    );
  } else if (format === "long_text") {
    optionsLabel = "Options, a paragraph each";
    options = OPTION_SLOTS.map((i) => (
      <textarea
        key={i}
        name="options"
        rows={3}
        maxLength={optionTitleLimit("long_text")}
        aria-label={`Option ${i + 1}`}
        placeholder={i === 0 ? "Apartment in Alfama. Walkable, near the tram, and the terrace fits all of us for dinner." : undefined}
        value={longs[i]}
        onChange={(e) => setLong(i, e.target.value)}
        className={textareaClass}
      />
    ));
  } else {
    optionsLabel = "Date ranges to choose from";
    options = OPTION_SLOTS.map((i) => dateRow(i, `Option ${i + 1}`));
  }

  return (
    <form action={createDecision} className="flex flex-col gap-6">
      <input type="hidden" name="eventId" value={eventId} />
      <Field label="What are we deciding?">
        <input name="title" required maxLength={100} placeholder="Where do we stay?" className={inputClass} autoFocus />
      </Field>

      <Section label="Format">
        <Segmented name="format" value={format} items={FORMATS.map((f) => ({ value: f, label: FORMAT_LABEL[f] }))} onChange={setFormat} />
        <span className="text-xs text-ink-3">{FORMAT_HINT[format]}</span>
      </Section>

      <Section label="Type">
        <Segmented name="voteType" value={voteType} items={VOTE_TYPES.map((t) => ({ value: t, label: VOTE_TYPE_LABEL[t] }))} onChange={chooseType} />
        <span className="text-xs text-ink-3">
          {voteType === "ab" ? "Two options, pick one. Settled in one round." : voteType === "single" ? "Pick one of several." : `Everyone picks up to ${picks}; the most picks wins.`}
        </span>
        {voteType === "multi" ? (
          <label className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink-2">Each person picks up to</span>
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
          <span className="text-xs text-ink-3">One round: A or B is settled in one vote.</span>
        </>
      ) : (
        <Section label="Rounds">
          <div className="flex flex-col gap-2">
            {plans.map((p) => (
              <label key={p} className="group block cursor-pointer">
                <input type="radio" name="plan" value={p} checked={plan === p} onChange={() => setPlan(p)} className="sr-only" />
                <Card as="span" className="flex items-center gap-3 px-3.5 py-3 group-has-checked:border-2 group-has-checked:border-accent group-has-checked:shadow-accent">
                  <span className="inline-flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 border-line-2 group-has-checked:border-accent group-has-checked:bg-accent">
                    <span className="h-2 w-2 rounded-full bg-transparent group-has-checked:bg-white" />
                  </span>
                  <span className="flex flex-col">
                    <span className="text-[15px] font-bold">{PLAN_LABEL[p]}</span>
                    <span className="text-[13px] text-ink-2">{PLAN_BODY[p]}</span>
                  </span>
                </Card>
              </label>
            ))}
          </div>
        </Section>
      )}

      <DeadlinePicker defaultChoice={defaultDeadline} />

      {ab ? null : <Toggle name="anyoneCanAddOptions" title="Anyone can add ideas" body="Turn off to keep it to you" defaultChecked />}
      {format === "date" ? <Toggle name="setsEventDates" title="Winner sets the event’s dates" body="The winning range becomes the event’s dates" defaultChecked /> : null}
      <Toggle name="anonymous" title="Ask anonymously" body="Your name stays off the question and its options. It’s still recorded." />

      <SubmitButton pendingLabel="Starting…">{plan === "ideas_shortlist_final" ? "Start round 1 · gather ideas" : "Start round 1"}</SubmitButton>
    </form>
  );
}
