import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { env, hasDatabase, hasMailer } from "@/lib/env";
import { runReminderSweep } from "@/lib/reminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The reminder sweep, run by an external pinger (a GitHub Actions cron or
 * cron-job.org) hitting this URL every N minutes with the shared secret.
 * Inert without config: no CRON_SECRET (or no database) → it does nothing and
 * still returns 200, so a secret-less deployment stays green. The secret is
 * passed only as `Authorization: Bearer <secret>` — never in the URL, which
 * would leak it into request/proxy logs.
 */
export async function GET(req: Request) {
  if (!env.cronSecret || !hasDatabase) {
    return NextResponse.json({ ok: true, skipped: "not configured" });
  }
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secretMatches(provided, env.cronSecret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!hasMailer) {
    return NextResponse.json({ ok: true, sent: 0, note: "mailer not configured" });
  }
  const result = await runReminderSweep();
  return NextResponse.json({ ok: true, ...result });
}
