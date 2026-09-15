import "server-only";
import Stripe from "stripe";
import { brand } from "./brand";
import { env, hasStripe } from "./env";

let stripe: Stripe | undefined;

/**
 * Server-only Stripe client. Lazily created so a deployment without
 * STRIPE_SECRET_KEY still boots; callers should check hasStripe first.
 */
export function getStripe(): Stripe {
  if (!hasStripe) {
    throw new Error("STRIPE_SECRET_KEY is not set.");
  }
  if (!stripe) {
    stripe = new Stripe(env.stripeSecretKey, {
      appInfo: {
        name: `${brand.name} smoke`,
        url: "https://github.com/shaiss/FamPoll",
      },
    });
  }
  return stripe;
}
