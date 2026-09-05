"use client";

import { Button, Icon } from "./ui";

/** Uses the phone's share sheet (which is where Messenger lives) and falls back to copying. */
export function ShareButton({ url, title, text }: { url: string; title: string; text?: string }) {
  return (
    <Button
      type="button"
      variant="dark"
      onClick={async () => {
        if (typeof navigator !== "undefined" && "share" in navigator) {
          try {
            await navigator.share({ url, title, text });
            return;
          } catch {
            /* user cancelled; fall through to copy */
          }
        }
        try {
          await navigator.clipboard.writeText(url);
          alert("Link copied. Paste it into Messenger.");
        } catch {
          window.prompt("Copy this link", url);
        }
      }}
    >
      <Icon name="share" size={18} stroke={2.25} />
      Share
    </Button>
  );
}
