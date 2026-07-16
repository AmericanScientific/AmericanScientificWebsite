import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = {
	title: "My Account · American Scientific",
	robots: { index: false, follow: false },
};

// Reads the session cookie → must render per request.
export const dynamic = "force-dynamic";

export default async function AccountPage() {
	const user = await getCurrentUser();
	if (!user) redirect("/login?next=/account");

	const tierLabel = user.priceLevel > 1 ? `Tier ${user.priceLevel}` : "Base";

	return (
		<main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
			<h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">My Account</h1>

			<dl className="mt-8 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
				<div className="flex justify-between py-3">
					<dt className="text-sm text-slate-500">Name</dt>
					<dd className="text-sm font-medium text-slate-900">{user.displayName || "—"}</dd>
				</div>
				<div className="flex justify-between py-3">
					<dt className="text-sm text-slate-500">Email</dt>
					<dd className="text-sm font-medium text-slate-900">{user.email}</dd>
				</div>
				<div className="flex justify-between py-3">
					<dt className="text-sm text-slate-500">Pricing tier</dt>
					<dd className="text-sm font-medium text-slate-900">{tierLabel}</dd>
				</div>
			</dl>
		</main>
	);
}
