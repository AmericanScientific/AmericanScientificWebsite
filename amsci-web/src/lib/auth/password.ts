/**
 * Modern password hashing for the new site: PBKDF2-HMAC-SHA-256 via WebCrypto
 * (Workers-native, no dependency). Used for new signups and to lazily upgrade
 * migrated WordPress users off their legacy hash on first successful login.
 *
 * Stored format:  pbkdf2$<iterations>$<saltB64>$<hashB64>
 */
const enc = new TextEncoder();
const ITERATIONS = 210_000;
const KEY_LEN = 32; // bytes
const SALT_LEN = 16;

function b64(bytes: Uint8Array): string {
	let bin = "";
	for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
	return btoa(bin);
}
function unb64(s: string): Uint8Array {
	const bin = atob(s);
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
	return out;
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
	const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
	const bits = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", salt: salt as unknown as BufferSource, iterations, hash: "SHA-256" },
		key,
		KEY_LEN * 8,
	);
	return new Uint8Array(bits);
}

/** Hash a password for storage. */
export async function hashPassword(password: string): Promise<string> {
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
	const hash = await derive(password, salt, ITERATIONS);
	return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
	return diff === 0;
}

/** Verify a password against a stored `pbkdf2$…` hash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	try {
		const parts = stored.split("$");
		if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
		const iterations = Number(parts[1]);
		if (!Number.isFinite(iterations) || iterations < 1) return false;
		const salt = unb64(parts[2]);
		const expected = unb64(parts[3]);
		const actual = await derive(password, salt, iterations);
		return timingSafeEqual(actual, expected);
	} catch {
		return false;
	}
}

/** True if a stored hash is our modern format (vs a legacy WordPress hash). */
export function isModernHash(stored: string | null | undefined): boolean {
	return !!stored && stored.startsWith("pbkdf2$");
}
