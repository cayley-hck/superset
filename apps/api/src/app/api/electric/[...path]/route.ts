import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";
import { auth } from "@superset/auth/server";
import { env } from "@/env";
import { buildWhereClause } from "./utils";

interface AuthInfo {
	userId: string;
	organizationIds: string[];
	authSource: "jwt" | "session";
}

async function authenticate(request: Request): Promise<AuthInfo | null> {
	const bearer = request.headers.get("Authorization");
	if (bearer?.startsWith("Bearer ")) {
		const token = bearer.slice(7);
		try {
			const { payload } = await auth.api.verifyJWT({ body: { token } });
			if (payload?.sub && Array.isArray(payload.organizationIds)) {
				return {
					userId: payload.sub,
					organizationIds: payload.organizationIds as string[],
					authSource: "jwt",
				};
			}
		} catch {}
	}

	const sessionData = await auth.api.getSession({ headers: request.headers });
	if (!sessionData?.user) return null;
	return {
		userId: sessionData.user.id,
		organizationIds: sessionData.session.organizationIds ?? [],
		authSource: "session",
	};
}

export async function GET(request: Request): Promise<Response> {
	const electricDebug = process.env.ELECTRIC_DEBUG === "1";
	const authInfo = await authenticate(request);
	if (!authInfo) {
		if (electricDebug) {
			console.warn("[electric] unauthorized request", {
				hasAuthorizationHeader: !!request.headers.get("Authorization"),
				url: request.url,
			});
		}
		return new Response("Unauthorized", { status: 401 });
	}

	const url = new URL(request.url);

	const organizationId = url.searchParams.get("organizationId");
	const tableName = url.searchParams.get("table");

	if (electricDebug) {
		console.info("[electric] request", {
			table: tableName,
			organizationId,
			userId: authInfo.userId,
			organizationIds: authInfo.organizationIds,
			authSource: authInfo.authSource,
			hasAuthorizationHeader: !!request.headers.get("Authorization"),
		});
	}

	if (organizationId && !authInfo.organizationIds.includes(organizationId)) {
		if (electricDebug) {
			console.warn("[electric] forbidden organization", {
				table: tableName,
				organizationId,
				userId: authInfo.userId,
				organizationIds: authInfo.organizationIds,
			});
		}
		return new Response("Not a member of this organization", { status: 403 });
	}

	const originUrl = new URL(env.ELECTRIC_URL);
	originUrl.searchParams.set("secret", env.ELECTRIC_SECRET);

	url.searchParams.forEach((value, key) => {
		if (ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key)) {
			originUrl.searchParams.set(key, value);
		}
	});

	if (!tableName) {
		return new Response("Missing table parameter", { status: 400 });
	}

	const whereClause = await buildWhereClause(
		tableName,
		organizationId ?? "",
		authInfo.userId,
	);
	if (!whereClause) {
		return new Response(`Unknown table: ${tableName}`, { status: 400 });
	}

	originUrl.searchParams.set("table", tableName);
	originUrl.searchParams.set("where", whereClause.fragment);
	whereClause.params.forEach((value, index) => {
		originUrl.searchParams.set(`params[${index + 1}]`, String(value));
	});

	if (tableName === "auth.apikeys") {
		originUrl.searchParams.set(
			"columns",
			"id,name,start,created_at,last_request",
		);
	}

	if (tableName === "integration_connections") {
		originUrl.searchParams.set(
			"columns",
			"id,organization_id,connected_by_user_id,provider,token_expires_at,external_org_id,external_org_name,config,created_at,updated_at",
		);
	}

	const response = await fetch(originUrl.toString());

	if (electricDebug) {
		console.info("[electric] upstream response", {
			table: tableName,
			organizationId,
			status: response.status,
			statusText: response.statusText,
			upstreamUrl: originUrl.toString().replace(env.ELECTRIC_SECRET, "[redacted]"),
		});
	}

	const headers = new Headers(response.headers);
	if (headers.get("content-encoding")) {
		headers.delete("content-encoding");
		headers.delete("content-length");
	}

	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
