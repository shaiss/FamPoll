"use server";

import { brand } from "@/lib/brand";
import { env, hasStripe } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { baseUrl } from "@/lib/url";

/**
 * Creates a one-off Embedded Checkout Session for the $1 smoke product.
 * Returns only the client_secret the browser needs to mount Checkout.
 * No-op shape when Stripe is not configured (caller shows a setup message).
 */
export async function createSmokeCheckoutSession(): Promise<
  { clientSecret: string } | { error: string }
> {
  if (!hasStripe) {
    return { error: "Stripe is not configured (STRIPE_SECRET_KEY missing)." };
  }
  if (!env.stripePublishableKey) {
    return { error: "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set." };
  }

  const origin = await baseUrl();
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded_page",
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: 100,
          product_data: {
            name: `$1 ${brand.name} smoke test`,
            description: "Internal smoke-test charge. Not a product offering.",
          },
        },
      },
    ],
    return_url: `${origin}/smoke/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
  });

  if (!session.client_secret) {
    return { error: "Checkout Session did not return a client_secret." };
  }
  return { clientSecret: session.client_secret };
}
