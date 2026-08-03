import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb, listUsersByStatus } from "@/lib/auth/db";
import { AdminPendingList, type PendingUser } from "@/components/AdminPendingList";
import { AdminTabs } from "@/components/AdminTabs";

export const metadata: Metadata = {
	title: "Account requests · Admin",
	robots: { index: false, follow: false },
};

// Reads the session per request; must be dynamic.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
	const user = await getCurrentUser();
	if (!user) redirect("/login?next=/admin");
	// Don't reveal the route to non-admins.
	if (!user.isAdmin) notFound();

	const rows = await listUsersByStatus(getDb(), "pending");
	const pending: PendingUser[] = rows.map((u) => ({
		id: u.id,
		name: u.display_name,
		email: u.email,
		company: u.company ?? "",
		phone: u.phone ?? "",
		address: u.address ?? "",
		accountType: u.account_type ?? "",
		createdAt: u.created_at,
	}));

	return (
		<main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
			<h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Accounts</h1>
			<AdminTabs active="requests" pendingCount={pending.length} />

			<p className="mt-6 text-sm text-slate-500">
				Approve a request to activate the account and set its price tier. The applicant is emailed that
				they can sign in. Denied accounts stay blocked.
			</p>

			<div className="mt-8">
				<AdminPendingList initial={pending} />
			</div>
		</main>
	);
}
