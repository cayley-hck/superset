import { FEATURE_FLAGS } from "@superset/shared/constants";
import { useFeatureFlagEnabled } from "posthog-js/react";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useRef,
	useState,
} from "react";
import { env } from "renderer/env.renderer";
import { authClient, getJwt } from "renderer/lib/auth-client";
import { MOCK_ORG_ID } from "shared/constants";
import { getCollections, preloadCollections } from "./collections";

type CollectionsContextType = ReturnType<typeof getCollections> & {
	switchOrganization: (organizationId: string) => Promise<void>;
};

const CollectionsContext = createContext<CollectionsContextType | null>(null);

export function preloadActiveOrganizationCollections(
	activeOrganizationId: string | null | undefined,
	enableV2Cloud: boolean,
): void {
	if (!activeOrganizationId) return;
	void preloadCollections(activeOrganizationId, {
		includeChatCollections: false,
		enableV2Cloud,
	}).catch((error) => {
		console.error(
			"[collections-provider] Failed to preload active org collections:",
			error,
		);
	});
}

export function CollectionsProvider({ children }: { children: ReactNode }) {
	const { data: session, refetch: refetchSession } = authClient.useSession();
	const isV2CloudEnabled =
		useFeatureFlagEnabled(FEATURE_FLAGS.V2_CLOUD) ?? false;
	const [isSwitching, setIsSwitching] = useState(false);
	const activeOrganizationId = env.SKIP_ENV_VALIDATION
		? MOCK_ORG_ID
		: session?.session?.activeOrganizationId;
	const electricDiagnosticKeyRef = useRef<string | null>(null);

	useEffect(() => {
		console.info("[collections-provider] session context", {
			activeOrganizationId,
			organizationIds: session?.session?.organizationIds ?? [],
			hasUser: !!session?.user,
			isV2CloudEnabled,
		});
	}, [
		activeOrganizationId,
		isV2CloudEnabled,
		session?.session?.organizationIds,
		session?.user,
	]);

	const switchOrganization = useCallback(
		async (organizationId: string) => {
			if (organizationId === activeOrganizationId) return;
			setIsSwitching(true);
			try {
				await authClient.organization.setActive({ organizationId });
				await preloadCollections(organizationId, {
					enableV2Cloud: isV2CloudEnabled,
				});
				await refetchSession();
			} finally {
				setIsSwitching(false);
			}
		},
		[activeOrganizationId, isV2CloudEnabled, refetchSession],
	);

	useEffect(() => {
		preloadActiveOrganizationCollections(
			activeOrganizationId,
			isV2CloudEnabled,
		);
	}, [activeOrganizationId, isV2CloudEnabled]);

	useEffect(() => {
		if (process.env.NODE_ENV !== "development") {
			return;
		}
		if (!activeOrganizationId || !session?.user) {
			return;
		}

		const jwt = getJwt();
		const diagnosticKey = `${activeOrganizationId}:${jwt ? "jwt" : "no-jwt"}`;
		if (electricDiagnosticKeyRef.current === diagnosticKey) {
			return;
		}
		electricDiagnosticKeyRef.current = diagnosticKey;

		if (!jwt) {
			console.warn("[electric] diagnostic skipped because JWT is missing", {
				activeOrganizationId,
			});
			return;
		}

		const shapeBaseUrl = `${env.NEXT_PUBLIC_ELECTRIC_URL}/v1/shape`;
		const diagnosticTargets = [
			{
				name: "workspaces",
				url: `${shapeBaseUrl}?table=workspaces&organizationId=${encodeURIComponent(activeOrganizationId)}&offset=-1`,
			},
			{
				name: "auth.organizations",
				url: `${shapeBaseUrl}?table=auth.organizations&offset=-1`,
			},
			{
				name: "auth.members",
				url: `${shapeBaseUrl}?table=auth.members&organizationId=${encodeURIComponent(activeOrganizationId)}&offset=-1`,
			},
			{
				name: "auth.users",
				url: `${shapeBaseUrl}?table=auth.users&organizationId=${encodeURIComponent(activeOrganizationId)}&offset=-1`,
			},
		];

		console.info("[electric] diagnostic start", {
			activeOrganizationId,
			targets: diagnosticTargets.map((target) => target.name),
		});

		void Promise.allSettled(
			diagnosticTargets.map(async (target) => {
				const response = await fetch(target.url, {
					headers: {
						Authorization: `Bearer ${jwt}`,
					},
				});
				const text = await response.text();
				console.info("[electric] diagnostic response", {
					target: target.name,
					status: response.status,
					ok: response.ok,
					bodyPreview: text.slice(0, 240),
				});
			}),
		).then((results) => {
			const failures = results
				.filter(
					(
						result,
					): result is PromiseRejectedResult => result.status === "rejected",
				)
				.map((result) =>
					result.reason instanceof Error
						? result.reason.message
						: String(result.reason),
				);
			if (failures.length > 0) {
				console.warn("[electric] diagnostic fetch failures", {
					activeOrganizationId,
					failures,
				});
			}
		});
	}, [activeOrganizationId, session?.user]);

	const collections = activeOrganizationId
		? getCollections(activeOrganizationId, isV2CloudEnabled)
		: null;

	if (!collections || isSwitching) {
		console.info("[collections-provider] waiting for collections", {
			activeOrganizationId,
			isSwitching,
			hasCollections: !!collections,
		});
		return null;
	}

	return (
		<CollectionsContext.Provider value={{ ...collections, switchOrganization }}>
			{children}
		</CollectionsContext.Provider>
	);
}

export function useCollections(): CollectionsContextType {
	const context = useContext(CollectionsContext);
	if (!context) {
		throw new Error("useCollections must be used within CollectionsProvider");
	}
	return context;
}
