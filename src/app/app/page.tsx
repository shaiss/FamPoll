import Link from "next/link";
import { AvatarStack, Card, Icon, LinkButton, Pill, Progress, SectionLabel, Screen } from "@/components/ui";
import { requireMembership } from "@/lib/auth";
import { roundTitle } from "@/lib/engine/rounds";
import { closesLabel, formatDate, formatDateRange, plural } from "@/lib/format";
import { homeData } from "@/lib/queries";

const KIND_LABEL: Record<string, string> = { trip: "Trip", outing: "Outing", meal: "Meal", party: "Party", other: "Event" };

export default async function Home() {
  const { user, family } = await requireMembership();
  const { needsVote, events, members, seats } = await homeData(family.id, user.id);
  const live = events.filter((e) => e.event.status === "planning");
  const past = events.filter((e) => e.event.status !== "planning");
  const firstName = user.name.split(" ")[0];

  return (
    <Screen className="relative pt-8">
      <div className="flex items-end justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="text-sm font-medium text-ink-2">{formatDate(new Date(), { weekday: "long", month: "short", day: "numeric" })}</div>
          <h1 className="font-display text-[30px] font-bold leading-[1.05] tracking-[-0.02em]">Hi, {firstName}</h1>
        </div>
        <Link href="/app/family" aria-label={family.name} className="flex items-center">
          <AvatarStack names={members.map((m) => m.displayName)} size={30} max={4} />
        </Link>
      </div>

      <section className="flex flex-col gap-2.5">
        <SectionLabel tone="accent" right={needsVote.length ? `${needsVote.length} open` : undefined}>
          Needs your vote
        </SectionLabel>
        {needsVote.length === 0 ? (
          <Card className="p-4 text-sm text-ink-2">Nothing waiting on you. Nice.</Card>
        ) : (
          needsVote.map((n) => {
            const proxies = n.pendingSeats.filter((s) => s.userId !== user.id);
            return (
              <Card key={n.decision.id + n.round.id} accent className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <Pill tone="accent">
                    <Icon name="clock" size={12} stroke={2.5} />
                    {roundTitle(n.round.kind, n.round.number, n.decision.plan)} · {closesLabel(n.round.closesAt)}
                  </Pill>
                  <Icon name="chevron-right" size={18} stroke={2.25} className="text-ink-3" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <div className="font-display text-xl font-bold tracking-[-0.01em]">{n.decision.title}</div>
                  <div className="text-[13px] text-ink-2">
                    {n.event.title}
                    {n.round.maxPicks > 1 ? ` · pick up to ${n.round.maxPicks}` : ""}
                    {proxies.length ? ` · also for ${proxies.map((p) => p.displayName).join(", ")}` : ""}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AvatarStack names={n.votedNames} size={24} max={4} ring="#ffffff" />
                    <span className="text-xs text-ink-2">
                      {n.votedNames.length} of {n.totalSeats} voted
                    </span>
                  </div>
                  <LinkButton href={`/app/decisions/${n.decision.id}`} size="sm">
                    Vote
                  </LinkButton>
                </div>
              </Card>
            );
          })
        )}
      </section>

      <section className="flex flex-col gap-2.5">
        <SectionLabel right={past.length ? <Link href="#past">See past</Link> : undefined}>Events</SectionLabel>
        {live.length === 0 ? (
          <Card className="flex flex-col gap-2 p-4">
            <div className="font-display text-lg font-bold">No events yet</div>
            <p className="text-sm text-ink-2">Start with the next thing you need to decide together: a trip, a birthday, Friday dinner.</p>
          </Card>
        ) : null}
        {live.map((c) => (
          <Link key={c.event.id} href={`/app/events/${c.event.id}`} className="block">
            <Card className="flex flex-col gap-3 p-4 transition hover:border-line-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <div className="font-display text-[19px] font-bold tracking-[-0.01em]">{c.event.title}</div>
                  <div className="flex items-center gap-1.5 text-[13px] text-ink-2">
                    <Icon name={c.event.kind === "trip" ? "pin" : "calendar"} size={14} />
                    <span>
                      {KIND_LABEL[c.event.kind]}
                      {c.event.startsOn ? ` · ${formatDateRange(c.event.startsOn, c.event.endsOn)}` : ""}
                    </span>
                  </div>
                </div>
              </div>
              {c.total > 0 ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-teal-deep">
                      {c.decided} of {c.total} decided
                    </span>
                    <span className={c.openRoundLabel ? "text-accent-deep" : "text-ink-2"}>{c.openRoundLabel ?? (c.open ? plural(c.open, "decision") + " waiting" : "all settled")}</span>
                  </div>
                  <Progress decided={c.decided} open={c.open} total={c.total} />
                </div>
              ) : (
                <div className="text-xs font-semibold text-ink-2">No decisions yet · add the first one</div>
              )}
            </Card>
          </Link>
        ))}
        {past.length ? (
          <div id="past" className="flex flex-col gap-2 pt-2">
            <SectionLabel>Past</SectionLabel>
            {past.map((c) => (
              <Link key={c.event.id} href={`/app/events/${c.event.id}`} className="block">
                <Card className="flex items-center justify-between p-4 opacity-80">
                  <div className="font-display text-[17px] font-bold">{c.event.title}</div>
                  <div className="text-xs text-ink-2">
                    {c.decided} of {c.total} decided
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : null}
      </section>

      <Link
        href="/app/events/new"
        aria-label="New event"
        className="fixed bottom-8 right-5 inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-button hover:bg-accent-deep md:right-[calc(50%-13rem)]"
      >
        <Icon name="plus" size={24} stroke={2.5} />
      </Link>
      {seats.length > 1 ? <span className="sr-only">You also vote for {seats.filter((s) => s.userId !== user.id).map((s) => s.displayName).join(", ")}</span> : null}
    </Screen>
  );
}
