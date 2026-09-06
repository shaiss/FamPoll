import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LocalTime } from "@/components/time";
import { Card, Icon, LinkButton } from "@/components/ui";
import { Wordmark } from "@/components/wordmark";
import { brandFor } from "@/lib/brand";
import { getLocale } from "@/lib/locale";
import { hasClerk, hasDatabase } from "@/lib/env";
import { auth } from "@clerk/nextjs/server";
import { getMembership } from "@/lib/auth";
import { roundLabel } from "@/lib/engine/rounds";
import { closesRelative, formatDate, formatDateRange, nightsBetween, plural, relativeTime } from "@/lib/format";
import { summaryByToken } from "@/lib/queries";

export const dynamic = "force-dynamic";

/** Text-only link preview for the family chat. Names and votes stay off it. */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const b = brandFor(await getLocale());
  if (!hasDatabase) return { title: "Summary" };
  const { token } = await params;
  const data = await summaryByToken(token);
  if (!data) return { title: "Summary", robots: { index: false } };
  const decided = data.decisions.filter((d) => d.decision.status === "decided");
  const open = data.decisions.filter((d) => d.decision.status === "open" && d.currentRound?.status === "open");
  const parts = [`${decided.length} of ${data.decisions.length} decided`];
  if (open.length) parts.push(`${open.length === 1 ? open[0].decision.title : `${open.length} open`}${open.length === 1 && open[0].currentRound ? " · " + closesRelative(open[0].currentRound.closesAt) : ""}`);
  const title = `${data.event.title} · what we’ve decided`;
  const description = parts.join(" · ");
  return { title, description, robots: { index: false }, openGraph: { title, description, siteName: b.name, type: "website" } };
}

export default async function PublicSummary({ params }: { params: Promise<{ token: string }> }) {
  if (!hasDatabase) redirect("/setup");
  const { token } = await params;
  const data = await summaryByToken(token);
  if (!data) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-4 px-5 pt-14">
        <Wordmark href="/" />
        <p className="text-ink-2">This link doesn’t point to anything any more.</p>
        <LinkButton href="/" variant="secondary">
          Home
        </LinkButton>
      </main>
    );
  }
  const { event, decisions, log, members } = data;
  const { userId } = hasClerk ? await auth() : { userId: null };
  const membership = userId ? await getMembership(userId) : null;
  const isMember = membership?.family.id === event.familyId;
  const decided = decisions.filter((d) => d.decision.status === "decided").length;
  const nights = nightsBetween(event.startsOn, event.endsOn);
  const updated = log[0]?.createdAt ?? event.createdAt;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-5 pb-16 pt-10">
      <div className="flex items-center justify-between">
        <Wordmark size={18} href="/" />
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
            const open = r?.status === "open" && d.decision.status === "open";
            const row = (
              <div className={`flex items-center gap-3 py-3 ${i < decisions.length - 1 ? "border-b border-sand" : ""}`}>
                <span
                  className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                    isDecided ? "bg-teal text-white" : open ? "bg-accent-tint text-accent-deep" : "border-2 border-dashed border-line-2 text-ink-3"
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
                  ) : open && r ? (
                    <span className="text-[13px] text-accent-deep">
                      {r.kind === "ideas" ? "Gathering ideas" : roundLabel(r, d.rounds, d.decision.plan)} · <LocalTime iso={r.closesAt.toISOString()} mode="closes" fallback={closesRelative(r.closesAt)} />
                    </span>
                  ) : (
                    <span className="text-[13px] text-ink-3">Waiting on the organizer</span>
                  )}
                </div>
              </div>
            );
            return open ? (
              <Link key={d.decision.id} href={`/app/decisions/${d.decision.id}`} className="block hover:bg-sand/50">
                {row}
              </Link>
            ) : (
              <div key={d.decision.id}>{row}</div>
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

      {isMember ? (
        <LinkButton href={`/app/events/${event.id}`}>Open it and vote</LinkButton>
      ) : (
        <LinkButton href={`/join/${event.family.inviteCode}`}>Join {event.family.name} to vote</LinkButton>
      )}

      {log.length ? (
        <section className="flex flex-col gap-2">
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-ink-2">How we got here</div>
          {log.map((a) => (
            <div key={a.id} className="flex gap-3 py-1.5">
              <div className="w-12 shrink-0 pt-0.5 text-xs font-semibold text-ink-3">
                <LocalTime iso={a.createdAt.toISOString()} mode="date" fallback={formatDate(a.createdAt)} />
              </div>
              <div className="text-sm leading-snug">{a.message}</div>
            </div>
          ))}
        </section>
      ) : null}
    </main>
  );
}
