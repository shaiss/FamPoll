import Link from "next/link";
import { LocalTime } from "@/components/time";
import { Card, Icon, Screen, TopBar } from "@/components/ui";
import { CopyText } from "@/components/copy-text";
import { requireMembership } from "@/lib/auth";
import { baseUrl } from "@/lib/url";
import { clipTitle, formatDate } from "@/lib/format";
import { roundTrail } from "@/lib/engine/rounds";
import { decidedHistory } from "@/lib/queries";
import { getLocale, getMessages } from "@/lib/locale-server";
import { interpolate } from "@/lib/messages";

/** The family's running record across every event: what has been settled, newest first. */
export default async function DecidedPage() {
  const { family } = await requireMembership();
  const items = await decidedHistory(family.id);
  const base = await baseUrl();
  const t = await getMessages();
  const locale = await getLocale();

  return (
    <Screen>
      <TopBar back="/app" backLabel={t.eventsBackHome} />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-[30px] font-bold leading-[1.05] tracking-[-0.025em]">{t.decidedTitle}</h1>
        <span className="rounded-full bg-teal-tint px-2.5 py-1 text-xs font-bold text-teal-deep">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <Card className="p-4 text-sm text-ink-2">{t.decidedEmpty}</Card>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((it) => {
            const trail = roundTrail(t, it.rounds, it.decision.plan);
            const margin = it.decidedMargin ? interpolate(t.trailWon, { winner: it.decidedMargin.winner, runnerUp: it.decidedMargin.runnerUp }) : "";
            const tally = it.decidedMargin ? `, ${it.decidedMargin.winner}–${it.decidedMargin.runnerUp}` : "";
            return (
              <Card key={it.decision.id} className="flex flex-col gap-2 p-4">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-ink-2">
                  <Icon name="check" size={14} stroke={3} className="text-teal-deep" />
                  <Link href={`/app/events/${it.event.id}`} className="font-semibold hover:text-ink">
                    {interpolate(t.decidedInEvent, { event: it.event.title })}
                  </Link>
                  <span className="text-ink-3">·</span>
                  <LocalTime
                    iso={(it.decision.decidedAt ?? it.decision.createdAt).toISOString()}
                    mode="date"
                    fallback={formatDate(it.decision.decidedAt ?? it.decision.createdAt, undefined, locale)}
                  />
                </div>
                <Link href={`/app/decisions/${it.decision.id}`} className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-ink-2">{it.decision.title}</span>
                  <span className="font-display text-[20px] font-bold leading-tight tracking-[-0.01em] text-teal-ink">{clipTitle(it.outcome.title, it.decision.format)}</span>
                </Link>
                {trail ? (
                  <div className="text-xs text-ink-3">
                    {trail}
                    {margin ? ` · ${margin}` : ""}
                  </div>
                ) : null}
                <CopyText
                  variant="ghost"
                  label={t.decisioncopyForMessenger}
                  lines={[
                    { text: `${it.decision.title} (${it.event.title})` },
                    { text: interpolate(t.decisioncopyDecidedLine, { outcome: clipTitle(it.outcome.title, it.decision.format), tally }) },
                    { text: `${base}/app/decisions/${it.decision.id}` },
                  ]}
                />
              </Card>
            );
          })}
        </div>
      )}
    </Screen>
  );
}
