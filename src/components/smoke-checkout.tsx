"use client";

import { useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { createSmokeCheckoutSession } from "@/lib/actions/stripe-smoke";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

/**
 * Minimal Embedded Checkout mount for the smoke path. Fetches a client_secret
 * via server action; never touches the secret key.
 */
export function SmokeCheckout() {
  const fetchClientSecret = useCallback(async () => {
    const result = await createSmokeCheckoutSession();
    if ("error" in result) {
      throw new Error(result.error);
    }
    return result.clientSecret;
  }, []);

  if (!stripePromise) {
    return (
      <p className="text-sm text-ink-2">
        Set <code className="font-semibold">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to mount
        Embedded Checkout.
      </p>
    );
  }

  return (
    <div id="smoke-checkout" className="min-h-[420px]">
      <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret }}>
        <EmbeddedCheckout />
      </EmbeddedCheckoutProvider>
    </div>
  );
}
