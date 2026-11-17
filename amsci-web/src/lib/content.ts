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

const NAMED_ENTITIES: Record<string, string> = {
	amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
	rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
	ndash: "–", mdash: "—", hellip: "…", bull: "•", middot: "·",
	deg: "°", plusmn: "±", times: "×", divide: "÷", micro: "µ",
	reg: "®", trade: "™", copy: "©",
	frac12: "½", frac14: "¼", frac34: "¾",
	sup2: "²", sup3: "³", le: "≤", ge: "≥", ohm: "Ω",
};

/**
 * Server-safe HTML entity decode (no DOM available on Workers).
 *
 * One regex pass, so `&amp;lt;` decodes to the literal text `&lt;` rather than
 * being double-decoded into `<`. Unknown named entities are left untouched.
 * `&nbsp;` decodes to a plain space: in NetSuite copy it is always stray
 * padding, never a deliberate non-breaking join.
 */
export function decodeHtmlEntities(input: string): string {
	return input.replace(/&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi, (match, body: string) => {
		if (body[0] === "#") {
			const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
			if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return match;
			return code === 0xa0 ? " " : String.fromCodePoint(code);
		}
		return NAMED_ENTITIES[body.toLowerCase()] ?? match;
	});
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

/**
 * Flatten NetSuite description HTML into the plain-text line format that
 * `parseDescription` understands. Block-level tags become line breaks, `<li>`
 * becomes a "•" line, and every other tag (including pasted `<span style=…>` /
 * `<font>` junk) is dropped. Output is TEXT: callers render it through React,
 * which escapes it, so no markup from NetSuite ever reaches the page as HTML.
 *
 * The tag pattern requires a letter (or "/" + letter) after "<", so copy like
 * "Output power: <5 mW" survives intact.
 */
export function htmlToText(raw: string): string {
	return decodeHtmlEntities(
		raw
			.replace(/\r\n?/g, "\n")
			.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "")
			.replace(/<!--[\s\S]*?-->/g, "")
			.replace(/<br\s*\/?>/gi, "\n")
			.replace(/<li\b[^>]*>/gi, "\n• ")
			.replace(/<\/?(p|div|ul|ol|li|h[1-6]|tr|table|blockquote)\b[^>]*>/gi, "\n")
			.replace(/<\/?[a-z][^>]*>/gi, ""),
	).replace(/ /g, " ");
}

/** An ordered description block: a paragraph or a bulleted list. */
export type DescriptionBlock = { type: "p"; text: string } | { type: "ul"; items: string[] };

/**
 * Turn a stored description into ordered paragraph / bullet-list blocks.
 *
 * Accepts all three formats found in NetSuite `storedescription`:
 *  - plain lines separated by `\r\n`, bullets as lines starting with "•"
 *  - inline bullets on one line: "Intro text. • 3.2 V • 0.35 A"
 *  - HTML (`<p>`, `<br>`, `<li>`, entities), flattened via `htmlToText`
 */
export function parseDescription(raw: string | null | undefined): DescriptionBlock[] {
	const blocks: DescriptionBlock[] = [];
	if (!raw) return blocks;

	const pushBullet = (text: string) => {
		const last = blocks[blocks.length - 1];
		if (last?.type === "ul") last.items.push(text);
		else blocks.push({ type: "ul", items: [text] });
	};

	for (const line of htmlToText(raw).split("\n")) {
		const text = line.replace(/\s+/g, " ").trim();
		if (!text) continue;
		// "Intro. • a • b" → ["Intro.", "a", "b"]; "• a" → ["", "a"].
		const [lead, ...bullets] = text.split(/\s*•\s*/);
		if (lead) blocks.push({ type: "p", text: lead });
		for (const b of bullets) if (b) pushBullet(b);
	}
	return blocks;
}

const plainTextCache = new Map<string, string>();

/**
 * The description as one clean line of plain text (no tags, no entities, no
 * glued-together bullets). For meta tags, search matching and the chat tool.
 * Memoized: search scores every product's description on every query.
 */
export function descriptionPlainText(raw: string | null | undefined): string {
	if (!raw) return "";
	const hit = plainTextCache.get(raw);
	if (hit !== undefined) return hit;
	const text = parseDescription(raw)
		.map((b) =>
			b.type === "p" ? b.text : b.items.map((i) => i.replace(/[\s.;,:]+$/, "")).join("; ") + ".",
		)
		.join(" ");
	if (plainTextCache.size > 5000) plainTextCache.clear();
	plainTextCache.set(raw, text);
	return text;
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
