"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "./ui";

/**
 * A submit button that disables itself while its form is in flight. Neon's first
 * request of the day can take a couple of seconds, and a plain button lets an
 * impatient double-tap create two events (or two decisions); this blocks that.
 */
export function SubmitButton({ children, pendingLabel, ...rest }: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...rest}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
