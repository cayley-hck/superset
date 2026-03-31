import Stripe from "stripe";
import { env } from "./env";

/**
 * Internal team mode — disables Stripe billing, auto-grants pro subscriptions.
 * Set INTERNAL_TEAM=true in .env to enable.
 */
export const isInternalTeam = env.INTERNAL_TEAM === "true";

export const stripeClient = !isInternalTeam
	? new Stripe(env.STRIPE_SECRET_KEY)
	: (new Proxy({} as Stripe, {
			get(_, prop) {
				return new Proxy(
					{},
					{
						get(_, method) {
							return async () => {
								console.warn(
									`[internal] Stripe.${String(prop)}.${String(method)}() skipped — INTERNAL_TEAM=true`,
								);
								return { id: `internal_${Date.now()}`, data: [], url: "" };
							};
						},
					},
				);
			},
		}) as unknown as Stripe);
