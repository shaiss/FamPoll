"use client";

import { useState } from "react";
import { closesLabel } from "@/lib/format";
import { useLocale, useMessages } from "@/components/locale-provider";
import { Button, Icon } from "./ui";

export type CopyLine = { text: string; closesAtIso?: string };

/**
 * "Copy for Messenger": builds a plain-text message on the client so any
 * deadline in it reads in the family member's own time zone, then copies it.
 * Falls back to a visible, selectable textarea when the clipboard is blocked
 * (Facebook's in-app browser does that).
 */
export function CopyText({ lines, label, variant = "secondary" }: { lines: CopyLine[]; label?: string; variant?: "secondary" | "dark" | "ghost" }) {
  const t = useMessages();
  const locale = useLocale();
  const [state, setState] = useState<"idle" | "done" | "manual">("idle");
  const text = lines.map((l) => (l.closesAtIso ? l.text.replace("{closes}", closesLabel(new Date(l.closesAtIso), undefined, locale)) : l.text)).join("\n");
  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant={variant}
        size="sm"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setState("done");
            setTimeout(() => setState("idle"), 2000);
          } catch {
            setState("manual");
          }
        }}
      >
        <Icon name={state === "done" ? "check" : "poll"} size={16} stroke={2.25} />
        {state === "done" ? t.cmpcopied : label ?? t.cmpcopyForMessenger}
      </Button>
      {state === "manual" ? (
        <textarea
          readOnly
          value={text}
          rows={Math.min(8, lines.length + 1)}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-[12px] border border-line bg-card px-3 py-2 text-[14px]"
          aria-label={t.cmptextToCopy}
        />
      ) : null}
    </div>
  );
}
