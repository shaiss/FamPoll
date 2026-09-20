"use client";

import { clearSeatSession } from "@/lib/actions/seats";
import { SubmitButton } from "@/components/submit-button";
import { useMessages } from "@/components/locale-provider";
import { interpolate } from "@/lib/messages";

/** "Voting as Nana. Not you?" — shown on every link-seat ballot. */
export function SeatIdentityBar({ name }: { name: string }) {
  const t = useMessages();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-sand px-3 py-2 text-sm">
      <span className="font-semibold text-ink">
        {interpolate(t.seatVotingAs, { name })}
      </span>
      <form action={clearSeatSession}>
        <SubmitButton variant="ghost" size="sm" pendingLabel="…">
          {t.seatNotYou}
        </SubmitButton>
      </form>
    </div>
  );
}
