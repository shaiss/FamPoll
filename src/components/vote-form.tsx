"use client";

import { useState } from "react";
import { castVote } from "@/lib/actions/decisions";
import { Button, Icon } from "./ui";

export type VoteOption = { id: string; title: string; byline: string; longText: boolean };

/** A paragraph long enough to clamp on the ballot: over three lines or roughly 160 characters. */
const needsClamp = (title: string) => title.length > 160 || title.split(/\r?\n/).length > 3;

/**
 * One ballot for one seat. Options are toggle buttons; the picks travel as
 * hidden inputs, so the pick limit is enforced before the form ever submits.
 * Ballots are sealed while the round is open: nobody's picks show here.
 */
export function VoteForm({
  roundId,
  memberId,
  maxPicks,
  options,
  initial,
  changed,
  skipped,
  hiddenDefault,
}: {
  roundId: string;
  memberId: string;
  /** The effective cap for this ballot. */
  maxPicks: number;
  options: VoteOption[];
  initial: string[];
  changed: boolean;
  skipped: boolean;
  hiddenDefault: boolean;
}) {
  // An option removed mid-round can leave a ballot over the cap; start clean rather than stuck.
  const [picked, setPicked] = useState<string[]>(initial.length > maxPicks ? [] : initial);
  const [hidden, setHidden] = useState(hiddenDefault);
  const [expanded, setExpanded] = useState<string[]>([]);
  const single = maxPicks === 1;
  const toggle = (id: string) =>
    setPicked((p) => {
      if (single) return [id];
      if (p.includes(id)) return p.filter((x) => x !== id);
      return p.length >= maxPicks ? p : [...p, id];
    });
  const expand = (id: string) => setExpanded((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));
  const label = picked.length === 0 ? (single ? "Pick one" : `Pick up to ${maxPicks}`) : changed ? `Change my vote · ${picked.length} picked` : `Cast my vote · ${picked.length} picked`;

  return (
    <div className="flex flex-col gap-2">
    <form action={castVote} className="flex flex-col gap-2.5">
      <input type="hidden" name="roundId" value={roundId} />
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="hidden" value={hidden ? "1" : "0"} />
      {picked.map((id) => (
        <input key={id} type="hidden" name="optionId" value={id} />
      ))}
      {options.map((o) => {
        const on = picked.includes(o.id);
        const full = !single && !on && picked.length >= maxPicks;
        const clampable = o.longText && needsClamp(o.title);
        const isExpanded = expanded.includes(o.id);
        return (
          <div key={o.id} className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => toggle(o.id)}
              aria-pressed={on}
              disabled={full}
              className={`flex w-full items-center gap-3 rounded-card border bg-card p-3 text-left transition ${on ? "border-2 border-accent shadow-accent" : "border-line"} ${full ? "opacity-50" : "hover:border-line-2"}`}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className={o.longText ? `whitespace-pre-line text-[15px] font-semibold leading-snug ${clampable && !isExpanded ? "line-clamp-4" : ""}` : "font-bold"}>{o.title}</span>
                {o.byline ? <span className="text-[13px] text-ink-2">{o.byline}</span> : null}
              </span>
              <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-accent bg-accent text-white" : "border-line-2 text-transparent"}`}>
                <Icon name="check" size={16} stroke={3} />
              </span>
            </button>
            {clampable ? (
              <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => expand(o.id)} aria-expanded={isExpanded}>
                {isExpanded ? "Show less" : "Show more"}
              </Button>
            ) : null}
          </div>
        );
      })}
      <label className="flex items-start gap-3 rounded-card border border-line bg-card p-3">
        <input type="checkbox" checked={hidden} onChange={(e) => setHidden(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-accent" />
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-bold">Hide my vote</span>
          <span className="text-[13px] text-ink-2">Still recorded under your name, just not shown to the family. If anyone hides, this round shows counts only.</span>
        </span>
      </label>
      <Button type="submit" disabled={picked.length === 0}>
        {label}
      </Button>
    </form>
    <form action={castVote} className="flex justify-center">
      <input type="hidden" name="roundId" value={roundId} />
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="skip" value="1" />
      <input type="hidden" name="hidden" value={hidden ? "1" : "0"} />
      <button type="submit" className="h-9 rounded-[10px] px-3 text-sm font-semibold text-ink-2 hover:bg-sand">
        {skipped ? "Skipped · whatever you all pick" : "Skip this one · whatever you all pick"}
      </button>
    </form>
    </div>
  );
}
