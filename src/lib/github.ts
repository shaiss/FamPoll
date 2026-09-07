import { brand } from "./brand";
import { env, hasGithubFeedback } from "./env";

/**
 * The feedback → GitHub bridge.
 *
 * Anonymity here has two independent layers and both must hold:
 *  1. Identity — every issue is created with ONE machine credential
 *     (a fine-grained PAT under a dedicated account), so the GitHub author is
 *     uniform and says nothing about who submitted. The token is server-only.
 *  2. Payload — nothing that names a person ever reaches the body. Callers pass
 *     only { kind, message }; the message is scrubbed first (see sanitizeFeedback)
 *     and no user, group, email or timestamp is interpolated in.
 *
 * A public GitHub issue is world-readable, search-indexed, and its edit history
 * is permanent, so scrubbing must happen BEFORE the first post — editing after a
 * leak does not remove the original. That is why sanitizeFeedback runs at submit
 * time (into the review queue) and again on the final text at approval.
 */

export const MAX_FEEDBACK_LENGTH = 2000;

/**
 * Remove or neutralize anything in free text that could de-anonymize the author,
 * leak an app capability secret, or misbehave as GitHub markdown. Conservative by
 * design: on a small user base a single identifying detail unmasks the reporter,
 * so we would rather over-redact than leak.
 */
export function sanitizeFeedback(raw: string): string {
  let text = String(raw ?? "");

  // Strip HTML tags outright — no injected markup, and it removes anchor tags
  // that could smuggle a link (and its embedded token) past the URL pass below.
  text = text.replace(/<[^>]*>/g, " ");

  // Remove URLs. This is the primary net for leaked share tokens and invite
  // codes: they almost always arrive pasted inside a link (or a screenshot's URL
  // bar transcribed as text). Covers http(s):// and bare www. links.
  text = text.replace(/\b(?:https?:\/\/|www\.)\S+/gi, "[link removed]");

  // Remove bare capability paths even when not written as a full URL.
  text = text.replace(/\/(?:s|join)\/[A-Za-z0-9._~-]+/g, "[link removed]");

  // Remove email addresses.
  text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, "[email removed]");

  // Remove standalone capability secrets: invite codes are 16 chars and share
  // tokens 14 (see src/lib/ids.ts), lowercase alnum. Requiring at least one digit
  // keeps ordinary words (which have none) intact while catching real tokens.
  text = text.replace(/\b(?=[a-z0-9]*\d)[a-z0-9]{14,16}\b/g, "[code removed]");

  // Neutralize GitHub linkification/automation the reporter can't have meant:
  //  - "@name" would ping a real account; a zero-width space after @ stops it.
  //  - "#12" (and closing keywords like "fixes #12") would cross-reference or
  //    auto-close an unrelated issue; the same trick defuses it.
  text = text.replace(/@(?=[A-Za-z0-9])/g, "@​");
  text = text.replace(/#(?=\d)/g, "#​");

  // Collapse the whitespace the substitutions left behind, then cap length.
  return text.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, MAX_FEEDBACK_LENGTH);
}

const KIND_LABEL: Record<string, string> = { bug: "Bug", idea: "Idea", other: "Feedback" };
/** GitHub label applied per kind, on top of the configured base labels. */
const KIND_GH_LABEL: Record<string, string> = { bug: "bug", idea: "enhancement", other: "feedback" };

/** A short, identity-free title: the kind plus the first line of the (scrubbed) message. */
function feedbackTitle(kind: string, message: string): string {
  const firstLine = message.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  const snippet = firstLine.length > 70 ? `${firstLine.slice(0, 69).trimEnd()}…` : firstLine;
  const prefix = KIND_LABEL[kind] ?? KIND_LABEL.other;
  return snippet ? `${prefix}: ${snippet}` : prefix;
}

/** The issue body: kind + scrubbed message + a footer marking it anonymous. No identifiers. */
function feedbackBody(kind: string, message: string): string {
  const prefix = KIND_LABEL[kind] ?? KIND_LABEL.other;
  return [
    `**${prefix}**`,
    "",
    message,
    "",
    "---",
    `_Submitted anonymously through ${brand.name} in-app feedback._`,
  ].join("\n");
}

export type PostedIssue = { number: number; url: string };

/**
 * Create the issue. Throws on any failure so the caller can keep the row and let
 * the owner retry — capture (the DB write) is always separate from this push.
 */
export async function postFeedbackIssue(input: { kind: string; message: string }): Promise<PostedIssue> {
  if (!hasGithubFeedback) throw new Error("GitHub feedback is not configured");
  const [owner, repo] = env.githubFeedbackRepo.split("/");
  if (!owner || !repo) throw new Error('GITHUB_FEEDBACK_REPO must be "owner/repo"');

  const base = env.githubFeedbackLabels
    ? env.githubFeedbackLabels.split(",").map((l) => l.trim()).filter(Boolean)
    : ["feedback"];
  const kindLabel = KIND_GH_LABEL[input.kind];
  const labels = Array.from(new Set([...base, ...(kindLabel ? [kindLabel] : [])]));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.githubFeedbackToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "fampoll-feedback",
      },
      body: JSON.stringify({
        title: feedbackTitle(input.kind, input.message),
        body: feedbackBody(input.kind, input.message),
        labels,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`GitHub responded ${res.status}: ${detail.slice(0, 200)}`);
    }
    const json = (await res.json()) as { number: number; html_url: string };
    return { number: json.number, url: json.html_url };
  } finally {
    clearTimeout(timeout);
  }
}
