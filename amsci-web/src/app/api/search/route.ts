import { productSlug } from "@/types/product";
import { getCategoryName } from "@/data/categories";
import { parseSearchFilters, searchCatalog } from "@/data/search";

/**
 * Search API — powers the header typeahead (live suggestions). Returns the top
 * `limit` ranked matches as a compact payload (no images, to stay snappy per
 * keystroke) plus the total count so the UI can offer "see all N results".
 *
 * GET /api/search?q=magnet&limit=7[&category=&grade=&min=&max=&sort=]
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
	const sp = new URL(request.url).searchParams;
	const filters = parseSearchFilters({
		q: sp.get("q") ?? undefined,
		category: sp.get("category") ?? undefined,
		grade: sp.get("grade") ?? undefined,
		min: sp.get("min") ?? undefined,
		max: sp.get("max") ?? undefined,
		sort: sp.get("sort") ?? undefined,
	});

	if (!filters.q) {
		return Response.json({ q: "", total: 0, suggestions: [] });
	}

	const limitRaw = Number(sp.get("limit"));
	const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 25) : 7;

	const { results, total } = await searchCatalog(filters);
	// No price in the typeahead payload — prices are login-gated and must not be
	// exposed on a public, unauthenticated endpoint.
	const suggestions = results.slice(0, limit).map((p) => ({
		slug: p.pageSlug ?? productSlug(p),
		title: p.title,
		sku: p.sku,
		category: getCategoryName(p.category),
		variantCount: p.variantCount ?? 0,
	}));

	return Response.json({ q: filters.q, total, suggestions });
}
