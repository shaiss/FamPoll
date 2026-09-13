import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Screen } from "@/components/ui";
import { SmokeCheckout } from "@/components/smoke-checkout";
import { isOrganizer, requireMembership } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { hasStripe, hasStripePublishable, hasStripeSmoke } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Billing smoke",
  robots: { index: false, follow: false },
};

/**
 * Optional smoke UI for Stripe Embedded Checkout. Not linked from home/nav.
 * Reachable only when STRIPE_SMOKE=1 and the viewer is an organizer.
 * Checkout Session smoke only — no paywall, subscriptions, or product billing.
 */
export default async function BillingSmokePage() {
  if (!hasStripeSmoke) notFound();

  const { member } = await requireMembership();
  if (!isOrganizer(member)) notFound();

  const ready = hasStripe && hasStripePublishable;
  return (
    <Screen className="pt-10">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-3">Smoke · not a product</p>
      <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.02em]">
        Checkout smoke
      </h1>
      <p className="text-sm text-ink-2">
        One-off $1 test charge via Stripe Embedded Checkout. Confirms{" "}
        {brand.name} can create a session and mount Checkout when Marketplace env
        vars are present. Nothing here is a public payment offer or subscription.
      </p>
      {ready ? (
        <SmokeCheckout />
      ) : (
        <div className="rounded-2xl border border-dashed border-line-2 bg-sand p-4 text-sm text-ink-2">
          <p className="font-semibold text-ink">Stripe env not set.</p>
          <p className="mt-1">
            After installing Stripe on the Vercel project, run{" "}
            <code className="font-semibold">vercel env pull</code> so{" "}
            <code className="font-semibold">STRIPE_SECRET_KEY</code> and{" "}
            <code className="font-semibold">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>{" "}
            are in <code className="font-semibold">.env.local</code>, set{" "}
            <code className="font-semibold">STRIPE_SMOKE=1</code>, then restart{" "}
            <code className="font-semibold">npm run dev</code>.
          </p>
        </div>
      )}
      <Link href="/app" className="text-sm font-semibold text-accent">
        Back to app
      </Link>
    </Screen>
  );
}
