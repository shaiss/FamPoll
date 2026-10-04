import { NextResponse } from "next/server";
import { env, hasStripe, hasStripeWebhook } from "@/lib/env";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook stub. Verifies STRIPE_WEBHOOK_SECRET, logs the event type,
 * and acknowledges receipt. No PII or payment payloads are logged. Inert when
 * Stripe or the webhook secret is unset so secret-less deploys stay green.
 */
export async function POST(req: Request) {
  if (!hasStripe || !hasStripeWebhook) {
    return NextResponse.json({ ok: true, skipped: "not configured" });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ ok: false, error: "missing signature" }, { status: 400 });
  }

  const payload = await req.text();
  try {
    const event = getStripe().webhooks.constructEvent(
      payload,
      signature,
      env.stripeWebhookSecret,
    );
    // Event type only — never customer email, card, or other PII.
    console.log("[stripe webhook]", event.type);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid signature" }, { status: 400 });
  }

  return NextResponse.json({ received: true });
}
