"use client";

import { useState } from "react";
import { Button, Icon } from "./ui";

export function CopyButton({ text, label = "Copy link" }: { text: string; label?: string }) {
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
          window.prompt("Copy this link", text);
        }
      }}
    >
      <Icon name={done ? "check" : "link"} size={18} stroke={2.25} />
      {done ? "Copied" : label}
    </Button>
  );
}
