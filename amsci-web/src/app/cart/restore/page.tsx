import type { Metadata } from "next";
import { Suspense } from "react";
import { RestoreCart } from "@/components/RestoreCart";

export const metadata: Metadata = {
	title: "Restore your cart · American Scientific",
	robots: { index: false, follow: false },
};

export default function RestoreCartPage() {
	return (
		<main className="mx-auto flex max-w-xl flex-col px-4 py-16 sm:px-6">
			<h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">Restoring your cart</h1>
			<p className="mt-2 text-sm text-slate-500">
				Putting the items from your previous cart back where you left them.
			</p>

			<div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
				<Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-slate-50" />}>
					<RestoreCart />
				</Suspense>
			</div>
		</main>
	);
}
