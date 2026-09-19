import type { CopyLine } from "@/components/copy-text";
import { deadlineShort } from "./format";
import { DEFAULT_LOCALE, type Locale } from "./locale";
import { interpolate, type Messages } from "./messages";

/**
 * Paste-ready Messenger nudge: Round Path A template.
 * “Still waiting on {names} — vote by {deadline}: {link}” plus Open in Safari/Chrome.
 * Client CopyText fills {deadline} in the viewer's time zone when closesAtIso is set.
 */
export function pasteNudgeLines(
  t: Messages,
  opts: { names: string[]; link: string; closesAt: Date },
): CopyLine[] {
  return [
    {
      text: interpolate(t.nudgeStillWaiting, {
        names: opts.names.join(", "),
        deadline: "{deadline}",
        link: opts.link,
      }),
      closesAtIso: opts.closesAt.toISOString(),
    },
    { text: t.nudgeOpenInBrowser },
  ];
}

/** Organizer reminder email body — same Path A template, deadline resolved server-side. */
export function reminderNudgeBody(
  t: Messages,
  opts: { names: string[]; link: string; closesAt: Date; locale?: Locale; now?: Date },
): string {
  const locale = opts.locale ?? DEFAULT_LOCALE;
  const line = interpolate(t.nudgeStillWaiting, {
    names: opts.names.join(", "),
    deadline: deadlineShort(opts.closesAt, opts.now, locale),
    link: opts.link,
  });
  return `${line}\n\n${t.nudgeOpenInBrowser}`;
}
