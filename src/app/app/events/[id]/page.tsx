import Link from "next/link";
import { notFound } from "next/navigation";
import { ShareButton } from "@/components/share-button";
import { AvatarStack, Button, Card, Icon, LinkButton, Screen, SectionLabel, TopBar } from "@/components/ui";
import { setEventStatus } from "@/lib/actions/events";
import { requireMembership } from "@/lib/auth";
import { roundTitle } from "@/lib/engine/rounds";
import { closesLabel, formatDate, formatDateRange, nightsBetween, plural } from "@/lib/format";
import { eventData } from "@/lib/queries";
import { baseUrl } from "@/lib/url";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, family, member } = await requireMembership();
  const data = await eventData(id, family.id);
  if (!data) notFound();
  const { event, decisions, members, log } = data;
  const base = await baseUrl();
  const shareUrl = `${base}/s/${event.shareToken}`;
  const memberName = new Map(members.map((m) => [m.id, m.displayName]));
  const decided = decisions.filter((d) => d.decision.status === "decided");
  const nights = nightsBetween(event.startsOn, event.endsOn);
  const organizer = member.role === "organizer" || event.createdByMemberId === member.id;
  const mySeatIds = new Set(members.filter((m) => m.userId === user.id || m.managedByUserId === user.id).map((m) => m.id));

  return (
    <Screen>
      <TopBar back="/app" backLabel="Home" right={<ShareButton url={shareUrl} title={`${event.title} · what we’ve decided`} />} />

      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] font-bold leading-[1.05] tracking-[-0.025em]">{event.title}</h1>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[13px] font-medium text-ink-2">
            {event.startsOn ? (
              <span className="inline-flex items-center gap-1">
                <Icon name="calendar" size={14} />
                {formatDateRange(event.startsOn, event.endsOn)}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Icon name="calendar" size={14} />
                Dates open
              </span>
            )}
            {event.status !== "planning" ? <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-bold">{event.status}</span> : null}
          </div>
          <AvatarStack names={members.map((m) => m.displayName)} size={26} />
        </div>
      </div>

      <div className="flex flex-col gap-2.5 rounded-card bg-teal-tint p-4">
        <SectionLabel tone="teal" right={<span className="text-teal-deep">{decided.length} of {decisions.length}</span>}>
          Decided so far
        </SectionLabel>
        {decided.length === 0 ? (
          <p className="text-sm text-teal-ink">Nothing settled yet. The first decision usually goes fast.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {nights ? (
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-teal-deep">When</span>
                <span className="text-right font-display text-[17px] font-bold text-teal-ink">
                  {formatDateRange(event.startsOn, event.endsOn)} · {plural(nights, "night")}
                </span>
              </div>
            ) : null}
            {decided.map((d) => (
              <div key={d.decision.id} className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-teal-deep">{d.decision.title}</span>
                <span className="text-right font-display text-[17px] font-bold text-teal-ink">{d.outcome?.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <section className="flex flex-col gap-2.5">
        <SectionLabel right="In order">Decisions</SectionLabel>
        <div className="flex flex-col gap-2">
          {decisions.map((d, i) => {
            const r = d.currentRound;
            const isDecided = d.decision.status === "decided";
            const skipped = d.decision.status === "skipped";
            const open = d.decision.status === "open" && r?.status === "open";
            const iVoted = r ? [...mySeatIds].every((sid) => d.votedMemberIds.includes(sid)) : false;
            if (open && r && r.kind !== "ideas") {
              return (
                <Card key={d.decision.id} accent className="flex flex-col gap-3 p-3.5">
                  <Link href={`/app/decisions/${d.decision.id}`} className="flex items-center gap-3">
                    <span className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-accent-tint font-display text-sm font-extrabold text-accent-deep">{i + 1}</span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="font-semibold">{d.decision.title}</span>
                      <span className="text-[13px] font-semibold text-accent-deep">
                        {roundTitle(r.kind, r.number, d.decision.plan).toLowerCase()} · {closesLabel(r.closesAt)}
                      </span>
                    </span>
                  </Link>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AvatarStack names={d.votedMemberIds.map((mid) => memberName.get(mid) ?? "?")} size={24} max={4} ring="#ffffff" />
                      <span className="text-xs text-ink-2">
                        {d.votedMemberIds.length} of {members.length} voted{iVoted ? "" : " · not you yet"}
                      </span>
                    </div>
                    <LinkButton href={`/app/decisions/${d.decision.id}`} size="sm" variant={iVoted ? "ghost" : "primary"}>
                      {iVoted ? "Change" : "Vote"}
                    </LinkButton>
                  </div>
                </Card>
              );
            }
            return (
              <Link key={d.decision.id} href={`/app/decisions/${d.decision.id}`} className="block">
                <Card className={`flex items-center gap-3 px-3.5 py-3 ${skipped ? "opacity-60" : ""}`}>
                  {isDecided ? (
                    <span className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-teal text-white">
                      <Icon name="check" size={16} stroke={3} />
                    </span>
                  ) : (
                    <span className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border-2 border-dashed border-line-2 font-display text-sm font-extrabold text-ink-3">{i + 1}</span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold">{d.decision.title}</span>
                    <span className="text-[13px] text-ink-2">
                      {isDecided
                        ? `${d.outcome?.title ?? "Decided"} · ${formatDate(d.decision.decidedAt)}`
                        : skipped
                          ? "Set aside"
                          : open && r
                            ? `Round ${r.number} · gathering ideas · ${plural(d.aliveCount, "idea")} so far · ${closesLabel(r.closesAt)}`
                            : "Waiting on the organizer"}
                    </span>
                  </span>
                  {open && r?.kind === "ideas" ? <span className="inline-flex h-8 items-center rounded-[10px] bg-sand px-3 text-[13px] font-bold">Add idea</span> : null}
                </Card>
              </Link>
            );
          })}
          <Link
            href={`/app/events/${event.id}/decisions/new`}
            className="flex items-center justify-center gap-2 rounded-card border-[1.5px] border-dashed border-line-2 p-3.5 text-sm font-semibold text-ink-2 hover:bg-sand"
          >
            <Icon name="plus" stroke={2.5} />
            Add a decision
          </Link>
        </div>
      </section>

      {log.length ? (
        <section className="flex flex-col gap-2">
          <SectionLabel>How we got here</SectionLabel>
          {log.slice(0, 8).map((a) => (
            <div key={a.id} className="flex gap-3 py-1">
              <div className="w-12 shrink-0 pt-0.5 text-xs font-semibold text-ink-3">{formatDate(a.createdAt)}</div>
              <div className="text-sm leading-snug">{a.message}</div>
            </div>
          ))}
        </section>
      ) : null}

      {organizer ? (
        <form action={setEventStatus} className="flex justify-center">
          <input type="hidden" name="eventId" value={event.id} />
          <input type="hidden" name="status" value={event.status === "planning" ? "done" : "planning"} />
          <Button type="submit" variant="ghost" size="sm">
            {event.status === "planning" ? "Mark this event done" : "Reopen this event"}
          </Button>
        </form>
      ) : null}
    </Screen>
  );
}
