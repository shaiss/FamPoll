import type { CopyLine } from "@/components/copy-text";
import { deadlineShort } from "./format";
import { DEFAULT_LOCALE, type Locale } from "./locale";
import { interpolate, type Messages } from "./messages";

/** A pending voter in Path A nudge copy. Link seats carry their own `/p/` URL. */
export type NudgePerson = {
  displayName: string;
  /** Absolute personal voting URL; omit for signed-in seats. */
  personalLink?: string;
};

/** Absolute `/p/<token>` for a stored personal-link token. Never invents a token. */
export function personalVoteUrl(base: string, token: string): string {
  return `${base.replace(/\/$/, "")}/p/${encodeURIComponent(token)}`;
}

/** Map waiters to nudge people. Pass `personalLinkToken` only for live link seats. */
export function nudgePeople(seats: { displayName: string; personalLinkToken?: string | null }[], base: string): NudgePerson[] {
  return seats.map((s) => {
    const token = s.personalLinkToken?.trim();
    return token ? { displayName: s.displayName, personalLink: personalVoteUrl(base, token) } : { displayName: s.displayName };
  });
}

/**
 * Paste-ready Messenger nudge: Round Path A template.
 * “Still waiting on {names} — vote by {deadline}: {link}”, optional per-person
 * `/p/` lines for link seats, plus Open in Safari/Chrome.
 * Client CopyText fills {deadline} in the viewer's time zone when closesAtIso is set.
 */
export function pasteNudgeLines(
  t: Messages,
  opts: { pending: NudgePerson[]; link: string; closesAt: Date },
): CopyLine[] {
  const names = opts.pending.map((p) => p.displayName);
  const lines: CopyLine[] = [
    {
      text: interpolate(t.nudgeStillWaiting, {
        names: names.join(", "),
        deadline: "{deadline}",
        link: opts.link,
      }),
      closesAtIso: opts.closesAt.toISOString(),
    },
  ];
  for (const p of opts.pending) {
    if (p.personalLink) {
      lines.push({ text: interpolate(t.nudgePersonLink, { name: p.displayName, link: p.personalLink }) });
    }
  }
  lines.push({ text: t.nudgeOpenInBrowser });
  return lines;
}

/** Organizer reminder email body — same Path A template, deadline resolved server-side. */
export function reminderNudgeBody(
  t: Messages,
  opts: { pending: NudgePerson[]; link: string; closesAt: Date; locale?: Locale; now?: Date },
): string {
  const locale = opts.locale ?? DEFAULT_LOCALE;
  return pasteNudgeLines(t, opts)
    .map((l) => (l.closesAtIso ? l.text.replaceAll("{deadline}", deadlineShort(opts.closesAt, opts.now, locale)) : l.text))
    .join("\n\n");
}
