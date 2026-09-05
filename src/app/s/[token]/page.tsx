import { redirect } from "next/navigation";
import { Card, Icon, Wordmark } from "@/components/ui";
import { hasDatabase } from "@/lib/env";
import { roundTitle } from "@/lib/engine/rounds";
import { closesLabel, formatDate, formatDateRange, nightsBetween, plural, relativeTime } from "@/lib/format";
import { summaryByToken } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function PublicSummary({ params }: { params: Promise<{ token: string }> }) {
  if (!hasDatabase) redirect("/setup");
  const { token } = await params;
  const data = await summaryByToken(token);
  if (!data) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 pt-14">
        <Wordmark />
        <p className="text-ink-2">This link doesn’t point to anything any more.</p>
      </main>
    );
  }
  const { event, decisions, log, members } = data;
  const decided = decisions.filter((d) => d.decision.status === "decided").length;
  const nights = nightsBetween(event.startsOn, event.endsOn);
  const updated = log[0]?.createdAt ?? event.createdAt;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-16 pt-10">
      <div className="flex items-center justify-between">
        <Wordmark size={18} />
        <div className="text-[13px] text-ink-3">Updated {relativeTime(updated)}</div>
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-[30px] font-bold leading-[1.05] tracking-[-0.025em]">What we’ve decided</h1>
        <p className="text-sm text-ink-2">{event.family.name} · read-only link</p>
      </div>

      <Card className="overflow-hidden shadow-card">
        <div className="flex flex-col gap-1 bg-teal-tint px-[18px] pb-4 pt-[18px]">
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-teal-deep">{event.title}</div>
          <div className="font-display text-[26px] font-extrabold leading-[1.05] tracking-[-0.02em] text-teal-ink">
            {event.startsOn ? formatDateRange(event.startsOn, event.endsOn) : "Dates to be decided"}
          </div>
          <div className="text-[13px] text-teal-deep">
            {plural(members.length, "person", "people")}
            {nights ? ` · ${plural(nights, "night")}` : ""}
          </div>
        </div>
        <div className="flex flex-col px-[18px] pb-3 pt-1.5">
          {decisions.length === 0 ? <div className="py-3 text-sm text-ink-2">No decisions yet.</div> : null}
          {decisions.map((d, i) => {
            const isDecided = d.decision.status === "decided";
            const r = d.currentRound;
            return (
              <div key={d.decision.id} className={`flex items-center gap-3 py-3 ${i < decisions.length - 1 ? "border-b border-sand" : ""}`}>
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                    isDecided ? "bg-teal text-white" : r?.status === "open" ? "bg-accent-tint text-accent-deep" : "border-2 border-dashed border-line-2 text-ink-3"
                  }`}
                >
                  {isDecided ? <Icon name="check" size={13} stroke={3} /> : i + 1}
                </span>
                <div className="flex-1 text-[15px] font-medium text-ink-2">{d.decision.title}</div>
                <div className="text-right text-[15px] font-bold">
                  {isDecided ? (
                    d.outcome?.title
                  ) : d.decision.status === "skipped" ? (
                    <span className="text-[13px] text-ink-3">Set aside</span>
                  ) : r?.status === "open" ? (
                    <span className="text-[13px] text-accent-deep">
                      {r.kind === "ideas" ? "Gathering ideas" : roundTitle(r.kind, r.number, d.decision.plan)} · {closesLabel(r.closesAt)}
                    </span>
                  ) : (
                    <span className="text-[13px] text-ink-3">Waiting on the organizer</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between border-t border-sand px-[18px] py-2.5 text-xs text-ink-3">
          <span>Only the family can vote</span>
          <span>
            {decided} decided · {decisions.length - decided} to go
          </span>
        </div>
      </Card>

      {log.length ? (
        <section className="flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-ink-2">How we got here</div>
          {log.map((a) => (
            <div key={a.id} className="flex gap-3 py-1.5">
              <div className="w-12 shrink-0 pt-0.5 text-xs font-semibold text-ink-3">{formatDate(a.createdAt)}</div>
              <div className="text-sm leading-snug">{a.message}</div>
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
