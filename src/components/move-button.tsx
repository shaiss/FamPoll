"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

/**
 * A reorder arrow that also disables itself while its own form is submitting, so
 * a double-tap can't move the same decision twice before the page navigates. The
 * caller's boundary `disabled` (first/last row) still applies; the explicit prop
 * after the spread keeps `pending` from being overridden.
 */
export function MoveButton({ disabled, ...rest }: ComponentProps<"button"> & { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button type="submit" {...rest} disabled={pending || disabled} aria-busy={pending} />;
}
