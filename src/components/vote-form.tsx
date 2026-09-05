"use client";

import { useState } from "react";
import { castVote } from "@/lib/actions/decisions";
import { AvatarStack, Button, Icon } from "./ui";

export type VoteOption = { id: string; title: string; byline: string; voters: string[] };

/**
 * One ballot for one seat. Options are toggle buttons; the picks travel as
 * hidden inputs, so the pick limit is enforced before the form ever submits.
 */
export function VoteForm({ roundId, memberId, maxPicks, options, initial, changed }: { roundId: string; memberId: string; maxPicks: number; options: VoteOption[]; initial: string[]; changed: boolean }) {
  const [picked, setPicked] = useState<string[]>(initial);
  const single = maxPicks === 1;
  const toggle = (id: string) =>
    setPicked((p) => {
      if (single) return [id];
      if (p.includes(id)) return p.filter((x) => x !== id);
      return p.length >= maxPicks ? p : [...p, id];
    });
  const label = picked.length === 0 ? (single ? "Pick one" : `Pick up to ${maxPicks}`) : changed ? `Change my vote · ${picked.length} picked` : `Cast my vote · ${picked.length} picked`;

  return (
    <form action={castVote} className="flex flex-col gap-2.5">
      <input type="hidden" name="roundId" value={roundId} />
      <input type="hidden" name="memberId" value={memberId} />
      {picked.map((id) => (
        <input key={id} type="hidden" name="optionId" value={id} />
      ))}
      {options.map((o) => {
        const on = picked.includes(o.id);
        const full = !single && !on && picked.length >= maxPicks;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => toggle(o.id)}
            aria-pressed={on}
            disabled={full}
            className={`flex w-full items-center gap-3 rounded-card border bg-card p-3 text-left transition ${on ? "border-2 border-accent shadow-accent" : "border-line"} ${full ? "opacity-50" : "hover:border-line-2"}`}
          >
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="font-bold">{o.title}</span>
              <span className="text-[13px] text-ink-2">{o.byline}</span>
              {o.voters.length ? <AvatarStack names={o.voters} size={20} max={6} ring="#ffffff" /> : <span className="text-xs text-ink-3">No votes yet</span>}
            </span>
            <span className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-accent bg-accent text-white" : "border-line-2 text-transparent"}`}>
              <Icon name="check" size={16} stroke={3} />
            </span>
          </button>
        );
      })}
      <Button type="submit" disabled={picked.length === 0}>
        {label}
      </Button>
    </form>
  );
}
