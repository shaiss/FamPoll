"use client";

import { useState } from "react";
import { inputClass } from "./ui";

/**
 * The options block of the new-decision form. Plain text, one per line, or,
 * when the decision sets the event's dates, up to four date ranges.
 */
export function OptionsInput() {
  const [dates, setDates] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <label className="flex items-center justify-between gap-3 rounded-card border border-line bg-card px-3.5 py-3">
        <span className="flex flex-col">
          <span className="text-[15px] font-bold">We’re choosing dates</span>
          <span className="text-[13px] text-ink-2">Options become date ranges, and the winner sets the event’s dates.</span>
        </span>
        <input type="checkbox" name="setsEventDates" value="on" checked={dates} onChange={(e) => setDates(e.target.checked)} className="h-6 w-6 shrink-0 accent-teal" />
      </label>
      {dates ? (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-ink-2">Date ranges to choose from</span>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <input type="date" name="dateStart" aria-label={`Option ${i + 1} start`} className={`${inputClass} h-11 text-[15px]`} />
              <input type="date" name="dateEnd" aria-label={`Option ${i + 1} end`} className={`${inputClass} h-11 text-[15px]`} />
            </div>
          ))}
          <span className="text-xs text-ink-3">Leave a row empty to skip it. Starting with ideas? Leave them all empty and everyone suggests dates.</span>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold text-ink-2">Options, one per line</span>
          <textarea
            name="options"
            rows={5}
            placeholder={"Apartment in Alfama\nBeach house in Cascais\nHotel near Belém"}
            className="w-full rounded-[14px] border border-line bg-card px-4 py-3 text-[16px] font-medium text-ink outline-none placeholder:text-ink-3 focus:border-accent"
          />
          <span className="text-xs text-ink-3">A quick vote needs 2, a shortlist 3. Starting with ideas? Leave this empty and everyone adds their own.</span>
        </div>
      )}
    </div>
  );
}
