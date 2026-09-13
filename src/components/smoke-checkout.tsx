"use client";

import { useCallback } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

/**
 * Minimal Embedded Checkout mount for the smoke path. Fetches a client_secret
 * from POST /api/stripe/checkout; never touches the secret key.
 */
export function SmokeCheckout() {
  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/stripe/checkout", { method: "POST" });
    const data = (await res.json()) as { clientSecret?: string; error?: string };
    if (!res.ok || !data.clientSecret) {
      throw new Error(data.error ?? "Failed to create Checkout Session.");
    }
    return data.clientSecret;
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
