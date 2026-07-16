/**
 * Verify legacy WordPress password hashes on the Cloudflare Workers runtime, so
 * migrated customers keep their existing passwords. Two formats exist in the
 * exported user table:
 *
 *   $P$…  — phpass "portable" hash (8192× MD5). ~1,782 users.
 *   $wp$… — WordPress 6.8+ bcrypt hash. ~232 users. Format is
 *           '$wp' + password_hash( base64(hmac_sha384(trim(pw),'wp-sha384')), BCRYPT )
 *
 * On a successful login the caller re-hashes the password with our modern
 * scheme (see password.ts) and clears the legacy hash, so this code path is only
 * ever hit once per migrated user.
 */
import bcrypt from "bcryptjs";
import { md5 } from "./md5";

const enc = new TextEncoder();

// phpass custom base64 alphabet.
const ITOA64 = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** phpass encode64 — packs `count` bytes into the itoa64 alphabet. */
function phpassEncode64(input: Uint8Array, count: number): string {
	let output = "";
	let i = 0;
	do {
		let value = input[i++];
		output += ITOA64[value & 0x3f];
		if (i < count) value |= input[i] << 8;
		output += ITOA64[(value >> 6) & 0x3f];
		if (i++ >= count) break;
		if (i < count) value |= input[i] << 16;
		output += ITOA64[(value >> 12) & 0x3f];
		if (i++ >= count) break;
		output += ITOA64[(value >> 18) & 0x3f];
	} while (i < count);
	return output;
}

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
	const out = new Uint8Array(a.length + b.length);
	out.set(a, 0);
	out.set(b, a.length);
	return out;
}

/** Constant-time-ish string compare (both are fixed-length hashes here). */
function safeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

/** Verify a phpass portable hash ($P$ / $H$). */
function verifyPhpass(password: string, stored: string): boolean {
	if (stored.length !== 34) return false; // 12 setting + 22 hash
	const countLog2 = ITOA64.indexOf(stored[3]);
	if (countLog2 < 7 || countLog2 > 30) return false;
	const count = 1 << countLog2;
	const salt = stored.substring(4, 12);
	if (salt.length !== 8) return false;

	const pw = enc.encode(password);
	let hash = md5(concatBytes(enc.encode(salt), pw));
	for (let i = 0; i < count; i++) {
		hash = md5(concatBytes(hash, pw));
	}
	const computed = stored.substring(0, 12) + phpassEncode64(hash, 16);
	return safeEqual(computed, stored);
}

/** Standard base64 of raw bytes (matches PHP base64_encode). */
function base64(bytes: Uint8Array): string {
	let bin = "";
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin);
}

/** Verify a WordPress 6.8+ '$wp$' bcrypt hash. */
async function verifyWpBcrypt(password: string, stored: string): Promise<boolean> {
	// stored = '$wp' + '$2y$10$....'  → strip the '$wp' domain-separation prefix.
	const bcryptHash = stored.substring(3);
	if (!bcryptHash.startsWith("$2")) return false;

	const key = await crypto.subtle.importKey(
		"raw",
		enc.encode("wp-sha384"),
		{ name: "HMAC", hash: "SHA-384" },
		false,
		["sign"],
	);
	const sig = await crypto.subtle.sign("HMAC", key, enc.encode(password.trim()));
	const prehash = base64(new Uint8Array(sig));
	return bcrypt.compareSync(prehash, bcryptHash);
}

/** True if `stored` looks like a WordPress-format hash this module can verify. */
export function isWordPressHash(stored: string): boolean {
	return stored.startsWith("$P$") || stored.startsWith("$H$") || stored.startsWith("$wp$");
}

/**
 * Verify `password` against a legacy WordPress hash. Returns false for any
 * unrecognized/empty hash rather than throwing.
 */
export async function verifyWordPressPassword(password: string, stored: string): Promise<boolean> {
	if (!stored) return false;
	try {
		if (stored.startsWith("$wp$")) return await verifyWpBcrypt(password, stored);
		if (stored.startsWith("$P$") || stored.startsWith("$H$")) return verifyPhpass(password, stored);
	} catch {
		return false;
	}
	return false;
}
