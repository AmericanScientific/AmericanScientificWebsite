import { parseDescription } from "@/lib/content";

/**
 * Renders a NetSuite `storedescription` as paragraphs + real bullet lists.
 *
 * Handles `\r\n` + "•" lines, inline " • " bullets, and HTML descriptions (tags
 * flattened to text by `parseDescription`). Everything is rendered as React
 * text, never as HTML, so NetSuite markup cannot inject anything into the page.
 * Pure (no hooks), so it works from both server and client components.
 */
export function ProductDescription({ description }: { description: string | null | undefined }) {
	const blocks = parseDescription(description);
	if (blocks.length === 0) return null;

	return (
		<div className="mt-6 space-y-3 text-sm leading-relaxed text-slate-600">
			{blocks.map((block, i) =>
				block.type === "p" ? (
					<p key={i}>{block.text}</p>
				) : (
					<ul key={i} className="list-disc space-y-1 pl-5 marker:text-slate-400">
						{block.items.map((item, j) => (
							<li key={j}>{item}</li>
						))}
					</ul>
				),
			)}
		</div>
	);
}
