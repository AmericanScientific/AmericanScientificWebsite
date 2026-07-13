/**
 * Content-shaping helpers for NetSuite-sourced fields.
 *
 * NetSuite stores loosely-structured HTML/text (http image URLs, `\r\n` + "•"
 * descriptions, HTML-encoded YouTube embeds). These pure functions normalize
 * that into safe, structured data for rendering. Reused later across the catalog.
 */

/** Coerce an http(s) URL to https to avoid mixed-content blocking on our https site. */
export function toHttps(url: string | null | undefined): string | null {
	const trimmed = url?.trim();
	if (!trimmed) return null;
	return trimmed.replace(/^http:\/\//i, "https://");
}

/** Minimal, server-safe HTML entity decode (no DOM available). */
export function decodeHtmlEntities(input: string): string {
	return input
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#0?39;/g, "'")
		.replace(/&#x27;/gi, "'")
		.replace(/&#x2F;/gi, "/")
		.replace(/&amp;/g, "&"); // decode &amp; last so we don't double-decode
}

/**
 * Extract a YouTube video ID from an embed code or URL. Returns null if none —
 * so callers can build their OWN clean iframe rather than injecting NetSuite's
 * raw (HTML-encoded) markup.
 */
export function extractYouTubeId(embed: string | null | undefined): string | null {
	if (!embed) return null;
	const decoded = decodeHtmlEntities(embed);
	const patterns = [
		/youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{6,})/i,
		/youtube\.com\/watch\?[^"'\s]*\bv=([A-Za-z0-9_-]{6,})/i,
		/youtu\.be\/([A-Za-z0-9_-]{6,})/i,
		/[?&]v=([A-Za-z0-9_-]{6,})/i,
	];
	for (const re of patterns) {
		const match = decoded.match(re);
		if (match) return match[1];
	}
	return null;
}

export interface DescriptionBlocks {
	/** Non-bullet lines, in order. */
	paragraphs: string[];
	/** Bullet lines (leading "•" stripped). */
	bullets: string[];
}

/** Split a stored description (`\r\n` line breaks, "•" bullets) into blocks. */
export function parseDescription(raw: string | null | undefined): DescriptionBlocks {
	const paragraphs: string[] = [];
	const bullets: string[] = [];
	if (!raw) return { paragraphs, bullets };

	const normalized = raw.replace(/\r\n?/g, "\n");
	for (const line of normalized.split("\n")) {
		const text = line.trim();
		if (!text) continue;
		if (text.startsWith("•")) {
			bullets.push(text.replace(/^•\s*/, "").trim());
		} else {
			paragraphs.push(text);
		}
	}
	return { paragraphs, bullets };
}

/** Collapse a description to a single line and clamp it for a meta description. */
export function trimForMeta(raw: string | null | undefined, max = 160): string {
	if (!raw) return "";
	const clean = raw
		.replace(/\r\n?/g, " ")
		.replace(/•/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	if (clean.length <= max) return clean;
	return clean.slice(0, max - 1).trimEnd() + "…";
}

/** Split a comma-separated keyword string into a clean, de-duped array. */
export function splitKeywords(raw: string | null | undefined): string[] {
	if (!raw) return [];
	const seen = new Set<string>();
	for (const part of raw.split(",")) {
		const k = part.trim();
		if (k) seen.add(k);
	}
	return [...seen];
}
