import { NextResponse } from "next/server";
import { isOrganizer, requireMembership } from "@/lib/auth";
import { brand } from "@/lib/brand";
import { env, hasStripe, hasStripePublishable, hasStripeSmokeEnabled } from "@/lib/env";
import { getStripe } from "@/lib/stripe";
import { baseUrl } from "@/lib/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates a one-off Embedded Checkout Session for the $1 smoke product.
 * Gated by STRIPE_SMOKE_ENABLED=1 and an organizer seat — not a product paywall.
 * Returns only { clientSecret } for Embedded Checkout.
 */
export async function POST() {
  if (!hasStripeSmokeEnabled) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!hasStripe || !hasStripePublishable) {
    return NextResponse.json(
      { error: "Stripe is not configured (STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)." },
      { status: 503 },
    );
  }

  const { member } = await requireMembership();
  if (!isOrganizer(member)) {
    return NextResponse.json({ error: "organizer only" }, { status: 403 });
  }

  const origin = await baseUrl();
  const session = await getStripe().checkout.sessions.create({
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
    return_url: `${origin}/app/billing/smoke/return?session_id={CHECKOUT_SESSION_ID}`,
  });

  if (!session.client_secret) {
    return NextResponse.json({ error: "Checkout Session did not return a client_secret." }, { status: 500 });
  }

  // Publishable key is already public; returned so the client can mount without
  // relying on a stale build-time NEXT_PUBLIC_ value in odd local setups.
  return NextResponse.json({
    clientSecret: session.client_secret,
    publishableKey: env.stripePublishableKey,
  });
}
