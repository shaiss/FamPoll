import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb, schema } from "./db";
import { env, hasMailer } from "./env";
import { DEFAULT_LOCALE } from "./locale";
import { interpolate, messages } from "./messages";
import { roundsDueForReminder } from "./queries";

/**
 * Send one reminder email via Resend. Server-side only (a route handler / this
 * module) — never from the browser — so the outbound call is legitimate.
 */
async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendApiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from: env.resendFromEmail, to, subject, text }),
    // A stalled request must not block the sequential sweep; a timeout lands in the caller's catch, which releases the claim.
    signal: AbortSignal.timeout(10000),
  });
  return res.ok;
}

/**
 * Email the organizers of rounds closing soon that still have people to vote.
 * Only organizers, never the family. A complete no-op when no mail provider is
 * configured, so the app deploys and runs green without secrets. Each round is
 * claimed atomically (reminder_sent_at set only while still null) so two
 * concurrent ticks can't double-send; a send failure rolls the claim back so a
 * later tick retries. Copy is fixed to the default locale — a cron has no request.
 */
export async function runReminderSweep(now = new Date()): Promise<{ claimed: number; sent: number }> {
  if (!hasMailer) return { claimed: 0, sent: 0 };
  const db = getDb();
  const t = messages(DEFAULT_LOCALE);
  const appUrl = env.appUrl ? env.appUrl.replace(/\/$/, "") : "";
  const targets = await roundsDueForReminder(now);
  let claimed = 0;
  let sent = 0;
  for (const target of targets) {
    // Claim: only the tick that flips reminder_sent_at from null owns this round.
    const [got] = await db
      .update(schema.rounds)
      // Re-check at claim time: a round can close or pass its deadline between the read and this loop.
      .set({ reminderSentAt: now })
      .where(and(eq(schema.rounds.id, target.roundId), isNull(schema.rounds.reminderSentAt), eq(schema.rounds.status, "open"), gt(schema.rounds.closesAt, now)))
      .returning({ id: schema.rounds.id });
    if (!got) continue;
    const subject = interpolate(t.reminderEmailSubject, { title: target.decisionTitle });
    const body = interpolate(t.reminderEmailBody, {
      decision: target.decisionTitle,
      event: target.eventTitle,
      waiting: target.pendingNames.join(", "),
      link: `${appUrl}/app/decisions/${target.decisionId}`,
    });
    let ok = false;
    try {
      const results = await Promise.all(target.organizers.map((o) => sendEmail(o.email, subject, body)));
      ok = results.some(Boolean);
    } catch {
      ok = false;
    }
    if (ok) {
      sent++;
      claimed++;
    } else {
      // Release the claim so a later tick can try again.
      await db.update(schema.rounds).set({ reminderSentAt: null }).where(eq(schema.rounds.id, target.roundId));
    }
  }
  return { claimed, sent };
}
