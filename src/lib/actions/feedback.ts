"use server";

import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getMembership, requireUser } from "../auth";
import { getDb, schema } from "../db";
import { hasGithubFeedback, isFeedbackAdminEmail } from "../env";
import { fail } from "../flash";
import { postFeedbackIssue, sanitizeFeedback, type PostedIssue } from "../github";
import { newId } from "../ids";
import { getMessages } from "@/lib/locale-server";

const MIN_FEEDBACK = 5;
const RATE_WINDOW_HOURS = 24;
const RATE_MAX = 10;

const SUBMIT_PATH = "/app/feedback";
const REVIEW_PATH = "/app/feedback/review";

const kindSchema = z.enum(["bug", "idea", "other"]).catch("other");

/**
 * Anyone signed in can submit — feedback is a growth channel, not a privileged
 * action. The text is scrubbed here, before it is ever stored, so the review
 * queue and the eventual public issue only ever hold sanitized text. The row is
 * recorded under the person for rate-limiting and abuse response, but that
 * identity never leaves the database.
 */
export async function submitFeedback(formData: FormData) {
  const user = await requireUser();
  const t = await getMessages();
  const kind = kindSchema.parse(formData.get("kind"));
  const message = sanitizeFeedback(String(formData.get("message") ?? ""));
  if (message.length < MIN_FEEDBACK) fail(SUBMIT_PATH, t.errFeedbackTooShort);

  const db = getDb();
  // Coarse, internal-only context; nullable so a group deletion never erases feedback.
  const membership = await getMembership(user.id);
  const since = new Date(Date.now() - RATE_WINDOW_HOURS * 3_600_000);

  // Count-then-insert must be atomic per person, or parallel submits could all
  // pass the check and blow past RATE_MAX. A per-user transaction advisory lock
  // (released when the transaction ends) serializes one person's submissions
  // without blocking anyone else. Rate-limit by person, never by IP.
  let tooMany = false;
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${user.id}))`);
    const recent = await tx
      .select({ id: schema.feedback.id })
      .from(schema.feedback)
      .where(and(eq(schema.feedback.createdByUserId, user.id), gte(schema.feedback.createdAt, since)));
    if (recent.length >= RATE_MAX) {
      tooMany = true;
      return;
    }
    await tx.insert(schema.feedback).values({
      id: newId(),
      createdByUserId: user.id,
      familyId: membership?.family.id ?? null,
      kind,
      message,
      status: "queued",
    });
  });
  if (tooMany) fail(SUBMIT_PATH, t.errFeedbackTooMany);
  redirect(`${SUBMIT_PATH}?sent=1`);
}

/** Gate the review queue to the app owner (the email allowlist). Never the family organizer. */
async function requireFeedbackAdmin() {
  const user = await requireUser();
  if (!isFeedbackAdminEmail(user.email)) redirect("/app");
  return user;
}

/**
 * Owner reviews the exact would-be-public text (optionally editing it), then
 * posts. The row is claimed atomically first — flipped from queued/failed to a
 * transient "posting" lease — so two approvals can't both read "queued" and post
 * the same feedback twice, and a rejected or already-posted row can't be revived
 * by a stale approval. The (re-scrubbed) edit is saved on the claim, so a failed
 * push keeps the reviewed text and the item returns to the queue as "failed".
 */
export async function approveFeedback(formData: FormData) {
  const user = await requireFeedbackAdmin();
  const t = await getMessages();
  const id = z.string().parse(formData.get("id"));
  const edited = sanitizeFeedback(String(formData.get("message") ?? ""));
  if (edited.length < MIN_FEEDBACK) fail(REVIEW_PATH, t.errFeedbackTooShort);
  if (!hasGithubFeedback) fail(REVIEW_PATH, t.errFeedbackNotConnected);

  const db = getDb();
  // Claim the row: only queued/failed rows can be taken, and only the request
  // whose UPDATE matches proceeds. This both excludes posted/rejected rows and
  // serializes concurrent approvals of the same item.
  const claimed = await db
    .update(schema.feedback)
    .set({ status: "posting", message: edited, reviewedByUserId: user.id })
    .where(and(eq(schema.feedback.id, id), inArray(schema.feedback.status, ["queued", "failed"])))
    .returning();
  if (claimed.length === 0) fail(REVIEW_PATH, t.errFeedbackGone);
  const row = claimed[0];

  let issue: PostedIssue;
  try {
    issue = await postFeedbackIssue({ kind: row.kind, message: edited });
  } catch {
    // Release the claim back to the queue as "failed" so the owner can retry.
    // Production hides thrown error text, so route the reason through fail().
    await db
      .update(schema.feedback)
      .set({ status: "failed", reviewedAt: new Date() })
      .where(eq(schema.feedback.id, id));
    fail(REVIEW_PATH, t.errFeedbackPostFailed);
  }
  await db
    .update(schema.feedback)
    .set({
      status: "posted",
      githubIssueNumber: issue.number,
      githubIssueUrl: issue.url,
      reviewedAt: new Date(),
    })
    .where(eq(schema.feedback.id, id));
  revalidatePath(REVIEW_PATH);
  redirect(`${REVIEW_PATH}?posted=1`);
}

/** Owner declines an item: it never reaches GitHub. */
export async function rejectFeedback(formData: FormData) {
  const user = await requireFeedbackAdmin();
  const id = z.string().parse(formData.get("id"));
  const db = getDb();
  await db
    .update(schema.feedback)
    .set({ status: "rejected", reviewedByUserId: user.id, reviewedAt: new Date() })
    .where(and(eq(schema.feedback.id, id), inArray(schema.feedback.status, ["queued", "failed"])));
  revalidatePath(REVIEW_PATH);
  redirect(`${REVIEW_PATH}?rejected=1`);
}
