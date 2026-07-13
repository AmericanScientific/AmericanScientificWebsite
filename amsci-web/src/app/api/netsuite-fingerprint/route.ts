import { NextResponse } from "next/server";
import { getEnv } from "@/lib/netsuite";

/**
 * TEMPORARY, secrets-safe diagnostic. Does NOT call NetSuite.
 *
 * For each NetSuite env var it reports only: presence, length, last 4 chars, and
 * a short SHA-256 fingerprint (first 10 hex). This is enough to catch the usual
 * INVALID_LOGIN causes — a value pasted into the wrong variable, the same value
 * pasted twice, or a truncated/short value — without revealing any secret.
 *
 * ⚠️ Delete before launch.
 */
export const dynamic = "force-dynamic";

const KEYS = [
	"NS_ACCOUNT",
	"NS_CONSUMER_KEY",
	"NS_CONSUMER_SECRET",
	"NS_TOKEN",
	"NS_TOKEN_SECRET",
] as const;

async function shortHash(value: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
		.slice(0, 10);
}

export async function GET() {
	const env = getEnv();

	const fields = await Promise.all(
		KEYS.map(async (key) => {
			const raw = env[key];
			const value = raw?.trim() ?? "";
			const present = value.length > 0;
			const looksPlaceholder =
				value.toLowerCase().startsWith("your-") || value.toLowerCase().startsWith("replace");
			return {
				key,
				present,
				length: value.length,
				last4: present ? value.slice(-4) : null,
				fingerprint: present ? await shortHash(value) : null,
				looksPlaceholder,
				hadWhitespace: raw !== undefined && raw !== value,
			};
		}),
	);

	// Cross-checks: any two secrets sharing a fingerprint = accidental duplicate.
	const secretFields = fields.filter((f) => f.key !== "NS_ACCOUNT" && f.fingerprint);
	const seen = new Map<string, string[]>();
	for (const f of secretFields) {
		const list = seen.get(f.fingerprint!) ?? [];
		list.push(f.key);
		seen.set(f.fingerprint!, list);
	}
	const duplicates = [...seen.values()].filter((list) => list.length > 1);

	const hints: string[] = [];
	for (const f of fields) {
		if (!f.present) hints.push(`${f.key} is empty.`);
		else if (f.looksPlaceholder) hints.push(`${f.key} is still a placeholder value.`);
		else if (f.hadWhitespace) hints.push(`${f.key} had surrounding whitespace (trimmed OK).`);
	}
	for (const dup of duplicates) hints.push(`Duplicate value in: ${dup.join(" and ")} — likely a paste error.`);
	// TBA secrets from NetSuite are 64-char hex; flag anything clearly off.
	for (const f of secretFields) {
		if (f.length !== 64) hints.push(`${f.key} is ${f.length} chars (NetSuite TBA keys/tokens are usually 64).`);
	}

	return NextResponse.json({
		ok: hints.length === 0,
		fields,
		hints: hints.length ? hints : ["All values present, distinct, and 64 chars — format looks correct."],
	});
}
