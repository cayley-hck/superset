#!/usr/bin/env node
import { resolve } from "node:path";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { config } from "dotenv";
import { createMcpServer } from "./mcp/index.js";

const rootEnvDir = resolve(import.meta.dirname, "../../..");
const envName =
	process.env.SUPERSET_ENV ||
	(process.env.NODE_ENV === "production" ? "production" : "development");

config({ path: resolve(rootEnvDir, ".env") });
config({
	path: resolve(rootEnvDir, `.env.${envName}`),
	override: true,
});

const server = createMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
