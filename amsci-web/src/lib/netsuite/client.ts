/**
 * Minimal NetSuite SuiteTalk REST client with TBA (OAuth 1.0a, HMAC-SHA256).
 *
 * Read-only by design for the shell: only SuiteQL queries are exposed. All
 * signing uses Web Crypto (`crypto.subtle`), which is available on both the
 * Cloudflare Workers runtime and Node 18+. Server-side only — never import into
 * a client component (it reads secrets).
 *
 * NOTE: nothing in the storefront calls this yet. It exists so the integration
 * work can start against a real, signed client once secrets are in place.
 */
import { loadNetSuiteConfig, type NetSuiteConfig } from "./config";
import { getEnv, type RawEnv } from "./env";

export class NetSuiteError extends Error {
	constructor(
		readonly status: number,
		readonly body: string,
	) {
		super(`NetSuite request failed (${status}): ${body.slice(0, 500)}`);
		this.name = "NetSuiteError";
	}
}

export interface SuiteQLPage<T> {
	items: T[];
	hasMore: boolean;
	totalResults: number;
	offset: number;
}

/** RFC 3986 percent-encoding (OAuth requires encoding of ! * ' ( ) too). */
function pctEncode(value: string): string {
	return encodeURIComponent(value).replace(
		/[!*'()]/g,
		(c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
	);
}

function makeNonce(length = 24): string {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	let out = "";
	for (const b of bytes) out += alphabet[b % alphabet.length];
	return out;
}

async function hmacSha256Base64(key: string, message: string): Promise<string> {
	const enc = new TextEncoder();
	const cryptoKey = await crypto.subtle.importKey(
		"raw",
		enc.encode(key),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
	let binary = "";
	for (const b of new Uint8Array(signature)) binary += String.fromCharCode(b);
	return btoa(binary);
}

/** Build the OAuth 1.0a Authorization header for a TBA request. */
async function buildAuthHeader(
	cfg: NetSuiteConfig,
	method: string,
	url: string,
): Promise<string> {
	const parsed = new URL(url);
	const baseUrl = `${parsed.origin}${parsed.pathname}`;

	const oauthParams: Record<string, string> = {
		oauth_consumer_key: cfg.consumerKey,
		oauth_token: cfg.token,
		oauth_signature_method: "HMAC-SHA256",
		oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
		oauth_nonce: makeNonce(),
		oauth_version: "1.0",
	};

	// Signature base includes oauth params + any query-string params.
	const allParams: [string, string][] = [
		...Object.entries(oauthParams),
		...[...parsed.searchParams.entries()],
	].map(([k, v]) => [pctEncode(k), pctEncode(v)]);
	allParams.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1));

	const paramString = allParams.map(([k, v]) => `${k}=${v}`).join("&");
	const baseString = [method.toUpperCase(), pctEncode(baseUrl), pctEncode(paramString)].join("&");
	const signingKey = `${pctEncode(cfg.consumerSecret)}&${pctEncode(cfg.tokenSecret)}`;
	const signature = await hmacSha256Base64(signingKey, baseString);

	const headerParams: Record<string, string> = {
		realm: cfg.account.toUpperCase(),
		...oauthParams,
		oauth_signature: signature,
	};

	return (
		"OAuth " +
		Object.entries(headerParams)
			.map(([k, v]) => `${pctEncode(k)}="${pctEncode(v)}"`)
			.join(", ")
	);
}

export class NetSuiteClient {
	private constructor(private readonly cfg: NetSuiteConfig) {}

	/** Build a client from environment secrets (throws if unconfigured). */
	static fromEnv(env: RawEnv = getEnv()): NetSuiteClient {
		return new NetSuiteClient(loadNetSuiteConfig(env));
	}

	/**
	 * Run a single SuiteQL page. Caller paginates via `offset`/`hasMore`.
	 * Remember SuiteQL rules (CLAUDE.md §6): `||` concat, no CTEs, `TO_DATE`,
	 * and NO `FETCH FIRST … ROWS ONLY` — use limit/offset params instead.
	 */
	async suiteql<T = Record<string, unknown>>(
		query: string,
		{ limit = 1000, offset = 0 }: { limit?: number; offset?: number } = {},
	): Promise<SuiteQLPage<T>> {
		const url = `https://${this.cfg.host}/services/rest/query/v1/suiteql?limit=${limit}&offset=${offset}`;
		const authorization = await buildAuthHeader(this.cfg, "POST", url);

		const res = await fetch(url, {
			method: "POST",
			headers: {
				Authorization: authorization,
				"Content-Type": "application/json",
				Accept: "application/json",
				Prefer: "transient",
			},
			body: JSON.stringify({ q: query }),
		});

		if (!res.ok) {
			throw new NetSuiteError(res.status, await res.text());
		}

		const data = (await res.json()) as {
			items?: T[];
			hasMore?: boolean;
			totalResults?: number;
			offset?: number;
		};
		return {
			items: data.items ?? [],
			hasMore: data.hasMore ?? false,
			totalResults: data.totalResults ?? 0,
			offset: data.offset ?? offset,
		};
	}

	/**
	 * Connectivity smoke test: count the web-visible catalog
	 * (`isonline='T' AND isinactive='F'` — the canonical population, CLAUDE.md §3).
	 * Returns the live count. Handy to verify secrets end-to-end.
	 */
	async webCatalogCount(): Promise<number> {
		const page = await this.suiteql<{ cnt: number }>(
			"SELECT COUNT(*) AS cnt FROM item WHERE isonline = 'T' AND isinactive = 'F'",
			{ limit: 1 },
		);
		return Number(page.items[0]?.cnt ?? 0);
	}
}
