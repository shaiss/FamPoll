"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

type Choice = "tonight" | "24" | "72" | "168";

/** "Tonight" is 8pm in the viewer's own time zone (or three hours from now if it's already evening). */
function tonightIso(): string {
  const d = new Date();
  const target = new Date(d);
  target.setHours(20, 0, 0, 0);
  if (target.getTime() - d.getTime() < 60 * 60 * 1000) target.setTime(d.getTime() + 3 * 60 * 60 * 1000);
  return target.toISOString();
}

const subscribeNever = () => () => {};

export function DeadlinePicker({ defaultChoice = "72" }: { defaultChoice?: Choice }) {
  const [choice, setChoice] = useState<Choice>(defaultChoice);
  // The absolute time depends on the viewer's clock, so it only exists after hydration (the server renders "").
  const hydrated = useSyncExternalStore(subscribeNever, () => true, () => false);
  const iso = useMemo(() => (hydrated && choice === "tonight" ? tonightIso() : ""), [hydrated, choice]);
  const items: { value: Choice; label: string }[] = [
    { value: "tonight", label: "Tonight" },
    { value: "24", label: "1 day" },
    { value: "72", label: "3 days" },
    { value: "168", label: "1 week" },
  ];
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[13px] font-semibold text-ink-2">Round 1 closes</span>
      <div className="flex gap-1 rounded-[12px] bg-sand-2 p-1">
        {items.map((it) => (
          <label key={it.value} className="flex-1 cursor-pointer">
            <input type="radio" name="deadline" value={it.value} checked={choice === it.value} onChange={() => setChoice(it.value)} className="sr-only" />
            <span className={`flex h-[38px] items-center justify-center rounded-[9px] text-sm ${choice === it.value ? "bg-card font-bold text-ink shadow-sm" : "font-semibold text-ink-2"}`}>{it.label}</span>
          </label>
        ))}
      </div>
      <input type="hidden" name="closesAtIso" value={iso} />
      <input type="hidden" name="roundHours" value={choice === "tonight" ? "24" : choice} />
      <span className="text-xs text-ink-3">{choice === "tonight" ? "8pm your time. Later rounds get a day each." : "Later rounds get the same. A round also closes as soon as everyone has voted or skipped."}</span>
    </div>
  );
}
