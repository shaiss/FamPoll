import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Screen } from "@/components/ui";
import { isOrganizer, requireMembership } from "@/lib/auth";
import { hasStripeSmoke } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Billing smoke return",
  robots: { index: false, follow: false },
};

/**
 * Return landing after Embedded Checkout. Confirms the return URL only —
 * never customer or payment details. Same gates as the smoke page.
 */
export default async function BillingSmokeReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  if (!hasStripeSmoke) notFound();
  const { member } = await requireMembership();
  if (!isOrganizer(member)) notFound();

  const { session_id: sessionId } = await searchParams;
  return (
    <Screen className="pt-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Smoke · not a product</p>
      <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em]">
        {sessionId ? "Checkout returned" : "No session"}
      </h1>
      <p className="text-sm text-ink-2">
        {sessionId
          ? "Stripe redirected back with a Checkout Session id. Fulfillment belongs on the webhook; this page only confirms the return URL works."
          : "Missing session_id query param — open /app/billing/smoke to start again."}
      </p>
      <Link href="/app/billing/smoke" className="text-sm font-semibold text-accent">
        Back to smoke checkout
      </Link>
    </Screen>
  );
}
