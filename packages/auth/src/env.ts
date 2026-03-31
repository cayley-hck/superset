import path from "node:path";
import { createEnv } from "@t3-oss/env-core";
import { config } from "dotenv";
import { z } from "zod";

const rootEnvDir = path.resolve(import.meta.dirname, "../../..");
const envName =
	process.env.SUPERSET_ENV ||
	(process.env.NODE_ENV === "production" ? "production" : "development");

config({ path: path.join(rootEnvDir, ".env"), quiet: true });
config({
	path: path.join(rootEnvDir, `.env.${envName}`),
	override: true,
	quiet: true,
});

export const env = createEnv({
	server: {
		GH_CLIENT_ID: z.string(),
		GH_CLIENT_SECRET: z.string(),
		GOOGLE_CLIENT_ID: z.string(),
		GOOGLE_CLIENT_SECRET: z.string(),
		BETTER_AUTH_SECRET: z.string(),
		RESEND_API_KEY: z.string(),
		KV_REST_API_URL: z.string(),
		KV_REST_API_TOKEN: z.string(),
		INTERNAL_TEAM: z.string().optional(),
		STRIPE_SECRET_KEY: z.string(),
		STRIPE_WEBHOOK_SECRET: z.string(),
		STRIPE_PRO_MONTHLY_PRICE_ID: z.string(),
		STRIPE_PRO_YEARLY_PRICE_ID: z.string(),
		STRIPE_ENTERPRISE_YEARLY_PRICE_ID: z.string(),
		QSTASH_TOKEN: z.string().min(1),
		SLACK_BILLING_WEBHOOK_URL: z.string().url(),
	},
	clientPrefix: "NEXT_PUBLIC_",
	client: {
		NEXT_PUBLIC_COOKIE_DOMAIN: z.string(),
		NEXT_PUBLIC_API_URL: z.string().url(),
		NEXT_PUBLIC_WEB_URL: z.string().url(),
		NEXT_PUBLIC_ADMIN_URL: z.string().url(),
		NEXT_PUBLIC_MARKETING_URL: z.string().url(),
		NEXT_PUBLIC_DESKTOP_URL: z.string().url().optional(),
	},
	runtimeEnv: process.env,
	emptyStringAsUndefined: true,
	skipValidation: true,
});
