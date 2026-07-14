import type { Metadata } from "next";
import { ProductGrid } from "@/components/ProductGrid";
import { SearchFilters } from "@/components/SearchFilters";
import { parseSearchFilters, searchCatalog, getAllGrades } from "@/data/search";

/** Search depends entirely on the query string, so render per-request. */
export const dynamic = "force-dynamic";

type RawParams = Record<string, string | string[] | undefined>;

function firstOf(v: string | string[] | undefined): string | undefined {
	return Array.isArray(v) ? v[0] : v;
}

export async function generateMetadata({
	searchParams,
}: {
	searchParams: Promise<RawParams>;
}): Promise<Metadata> {
	const q = firstOf((await searchParams).q)?.trim();
	return { title: q ? `Search: ${q}` : "Search the catalog" };
}

export default async function SearchPage({
	searchParams,
}: {
	searchParams: Promise<RawParams>;
}) {
	const raw = await searchParams;
	const filters = parseSearchFilters({
		q: firstOf(raw.q),
		category: firstOf(raw.category),
		grade: firstOf(raw.grade),
		min: firstOf(raw.min),
		max: firstOf(raw.max),
		sort: firstOf(raw.sort),
	});

	const [{ results, total }, grades] = await Promise.all([
		searchCatalog(filters),
		getAllGrades(),
	]);

	const summary = filters.q
		? `${total} result${total === 1 ? "" : "s"} for “${filters.q}”`
		: `${total} product${total === 1 ? "" : "s"}`;

	return (
		<div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
			<header className="border-b border-slate-200 pb-6">
				<h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">
					{filters.q ? (
						<>
							Search <span className="text-slate-400">·</span> {filters.q}
						</>
					) : (
						"Search the catalog"
					)}
				</h1>
				<p className="mt-1 text-sm text-slate-500">{summary} · Sign in for your account pricing</p>
			</header>

			<div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[16rem_1fr]">
				<SearchFilters grades={grades} />

				<div>
					{results.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-slate-300 bg-white/50 py-16 text-center">
							<p className="font-medium text-slate-600">
								{filters.q ? `No products match “${filters.q}”.` : "No products match these filters."}
							</p>
							<p className="mt-1 text-sm text-slate-400">
								Try fewer words, a broader category, or a wider price range.
							</p>
						</div>
					) : (
						<ProductGrid products={results} />
					)}
				</div>
			</div>
		</div>
	);
}
