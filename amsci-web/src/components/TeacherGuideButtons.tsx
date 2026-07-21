/**
 * "View / Download Teacher's Guide" buttons shown under a product image, only for
 * items that have a working guide (Product.teacherGuideAvailable). The PDF is
 * served through /api/teacher-guide?sku=… (inline for View, attachment for
 * Download), keyed by SKU so the raw NetSuite URL never reaches the client and it
 * can't be used as an open proxy.
 *
 * Pure presentational (no hooks), so it renders in both the server SingleProduct
 * layout and the client ProductVariantView (where `sku` swaps per selected variant).
 */
export function TeacherGuideButtons({ sku, available }: { sku: string; available?: boolean }) {
	if (!available) return null;
	const base = `/api/teacher-guide?sku=${encodeURIComponent(sku)}`;
	return (
		<div className="mt-4 flex flex-wrap gap-2.5" data-teacher-guide>
			<a
				href={base}
				target="_blank"
				rel="noopener noreferrer"
				className="inline-flex items-center gap-2 rounded-full border border-brand-blue/30 bg-brand-blue/5 px-4 py-2 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blue/10"
			>
				<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
					<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
					<circle cx="12" cy="12" r="3" />
				</svg>
				View Teacher&apos;s Guide
			</a>
			<a
				href={`${base}&dl=1`}
				className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
			>
				<svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
					<path d="M12 3v12m0 0 4-4m-4 4-4-4" />
					<path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
				</svg>
				Download Teacher&apos;s Guide
			</a>
		</div>
	);
}
