import type { Metadata } from "next";
import Link from "next/link";
import { Screen } from "@/components/ui";
import { SmokeCheckout } from "@/components/smoke-checkout";
import { brand } from "@/lib/brand";
import { hasStripe, hasStripePublishable } from "@/lib/env";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout smoke",
  robots: { index: false, follow: false },
};

/**
 * Non-production smoke path for Stripe Embedded Checkout. Not linked from the
 * product UI; exists so the Stack launch path can verify env + SDK wiring.
 */
export default function SmokeCheckoutPage() {
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
        vars are present. Nothing here is a public payment offer.
      </p>
      {ready ? (
        <SmokeCheckout />
      ) : (
        <div className="rounded-2xl border border-dashed border-line-2 bg-sand p-4 text-sm text-ink-2">
          <p className="font-semibold text-ink">Stripe env not set.</p>
          <p className="mt-1">
            After installing Stripe on the Vercel project, run{" "}
            <code className="font-semibold">vercel env pull</code> (or copy the
            test placeholders from <code className="font-semibold">.env.example</code>
            ) so <code className="font-semibold">STRIPE_SECRET_KEY</code> and{" "}
            <code className="font-semibold">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>{" "}
            are in <code className="font-semibold">.env.local</code>, then restart{" "}
            <code className="font-semibold">npm run dev</code>.
          </p>
        </div>
      )}
      <Link href="/" className="text-sm font-semibold text-accent">
        Back home
      </Link>
    </Screen>
  );
}
