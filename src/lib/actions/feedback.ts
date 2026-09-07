"use server";

import { and, eq, gte, inArray } from "drizzle-orm";
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
  // Rate-limit by person (they are authenticated), never by IP.
  const since = new Date(Date.now() - RATE_WINDOW_HOURS * 3_600_000);
  const recent = await db
    .select({ id: schema.feedback.id })
    .from(schema.feedback)
    .where(and(eq(schema.feedback.createdByUserId, user.id), gte(schema.feedback.createdAt, since)));
  if (recent.length >= RATE_MAX) fail(SUBMIT_PATH, t.errFeedbackTooMany);

  // Coarse, internal-only context; nullable so a group deletion never erases feedback.
  const membership = await getMembership(user.id);
  await db.insert(schema.feedback).values({
    id: newId(),
    createdByUserId: user.id,
    familyId: membership?.family.id ?? null,
    kind,
    message,
    status: "queued",
  });
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
 * posts. The edit is saved first so a failed push keeps the reviewed text, and
 * the final text is scrubbed again as a belt-and-braces pass before it goes out.
 */
export async function approveFeedback(formData: FormData) {
  const user = await requireFeedbackAdmin();
  const t = await getMessages();
  const id = z.string().parse(formData.get("id"));
  const edited = sanitizeFeedback(String(formData.get("message") ?? ""));
  if (edited.length < MIN_FEEDBACK) fail(REVIEW_PATH, t.errFeedbackTooShort);

  const db = getDb();
  const row = await db.query.feedback.findFirst({ where: eq(schema.feedback.id, id) });
  if (!row || row.status === "posted") fail(REVIEW_PATH, t.errFeedbackGone);
  if (!hasGithubFeedback) fail(REVIEW_PATH, t.errFeedbackNotConnected);

  await db.update(schema.feedback).set({ message: edited }).where(eq(schema.feedback.id, id));
  let issue: PostedIssue;
  try {
    issue = await postFeedbackIssue({ kind: row.kind, message: edited });
  } catch {
    // Keep the row; the owner can retry. Production hides thrown error text, so
    // route the reason back through fail() instead of letting it 500.
    await db
      .update(schema.feedback)
      .set({ status: "failed", reviewedByUserId: user.id, reviewedAt: new Date() })
      .where(eq(schema.feedback.id, id));
    fail(REVIEW_PATH, t.errFeedbackPostFailed);
  }
  await db
    .update(schema.feedback)
    .set({
      status: "posted",
      githubIssueNumber: issue.number,
      githubIssueUrl: issue.url,
      reviewedByUserId: user.id,
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
