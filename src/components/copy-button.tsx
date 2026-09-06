"use client";

import { useState } from "react";
import { useMessages } from "@/components/locale-provider";
import { Button, Icon } from "./ui";

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const t = useMessages();
  const [done, setDone] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          window.prompt(t.cmpcopyThisLinkPrompt, text);
        }
      }}
    >
      <Icon name={done ? "check" : "link"} size={18} stroke={2.25} />
      {done ? t.cmpcopied : label ?? t.cmpcopyLink}
    </Button>
  );
}
