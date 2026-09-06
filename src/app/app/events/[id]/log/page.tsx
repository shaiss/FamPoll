import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { LocalTime } from "@/components/time";
import { Screen, SectionLabel, TopBar } from "@/components/ui";
import { requireMembership } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getLocale, getMessages } from "@/lib/locale-server";
import { interpolate } from "@/lib/messages";
import { eventData } from "@/lib/queries";

export default async function EventLog({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { family } = await requireMembership();
  const data = await eventData(id, family.id);
  if (!data) notFound();
  const log = await getDb().query.activity.findMany({ where: eq(schema.activity.eventId, id), orderBy: [desc(schema.activity.createdAt)], limit: 300 });
  const t = await getMessages();
  const locale = await getLocale();
  return (
    <Screen>
      <TopBar back={`/app/events/${id}`} backLabel={data.event.title} />
      <h1 className="font-display text-[28px] font-bold leading-[1.05] tracking-[-0.02em]">{t.eventsHowWeGotHere}</h1>
      <section className="flex flex-col gap-1">
        <SectionLabel right={interpolate(t.eventsLogEntryCount, { count: log.length })}>{t.eventsLogNewestFirst}</SectionLabel>
        {log.map((a) => (
          <div key={a.id} className="flex gap-3 border-b border-sand py-2.5">
            <div className="w-12 shrink-0 pt-0.5 text-xs font-semibold text-ink-3">
              <LocalTime iso={a.createdAt.toISOString()} mode="date" fallback={formatDate(a.createdAt, undefined, locale)} />
            </div>
            <div className="text-sm leading-snug">{a.message}</div>
          </div>
        ))}
      </section>
    </Screen>
  );
}
