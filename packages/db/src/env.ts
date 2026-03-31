import path from "node:path";
import { createEnv } from "@t3-oss/env-core";
import { config } from "dotenv";
import { z } from "zod";

const rootEnvDir = path.resolve(__dirname, "../../..");
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
		DATABASE_URL: z.string().url(),
		DATABASE_URL_UNPOOLED: z.string().url(),
	},

	clientPrefix: "PUBLIC_",

	client: {},

	runtimeEnv: process.env,

	emptyStringAsUndefined: true,
	// IMPORTANT: Do not re-enable import-time validation here.
	// `@superset/db` is imported transitively by packages that run in environments
	// where DB env vars are intentionally absent (e.g. desktop host bundles).
	// Validating on import causes those runtimes to crash even when no DB query is
	// executed. Validation must stay deferred until actual DB client usage.
	skipValidation: true,
});
