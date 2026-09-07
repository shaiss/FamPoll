import { requireUser } from "@/lib/auth";
import { brandFor } from "@/lib/brand";
import { getLocale } from "@/lib/locale-server";
import { decisionData } from "@/lib/queries";

/** YYYY-MM-DD → YYYYMMDD (an all-day VALUE=DATE). */
function icsDate(d: string): string {
  return d.replace(/-/g, "");
}

/** All-day DTEND is exclusive, so the day after the last night. */
function dayAfter(d: string): string {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10).replace(/-/g, "");
}

function escapeIcs(s: string): string {
  return s.replace(/([\\;,])/g, "\\$1").replace(/\r?\n/g, "\\n");
}

/**
 * The decided date range of a dates decision as a downloadable .ics — the
 * "decide, record, hand off" bridge to the family's calendars. Behind /app, so
 * the signed-in organizer's browser downloads it; nothing external is called.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const data = await decisionData(id, user.id);
  if (!data) return new Response("Not found", { status: 404 });
  const { decision, event, options } = data;
  const outcome = decision.outcomeOptionId ? options.find((o) => o.id === decision.outcomeOptionId) : null;
  if (decision.status !== "decided" || decision.format !== "date" || !outcome?.startsOn) {
    return new Response("This decision has no dates to add.", { status: 404 });
  }
  const brand = brandFor(await getLocale());
  const stamp = new Date().toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${escapeIcs(brand.name)}//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${decision.id}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${icsDate(outcome.startsOn)}`,
    `DTEND;VALUE=DATE:${dayAfter(outcome.endsOn ?? outcome.startsOn)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(`${decision.title}: ${outcome.title}`)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const filename = event.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "event";
  return new Response(body, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}.ics"`,
      "cache-control": "no-store",
    },
  });
}
