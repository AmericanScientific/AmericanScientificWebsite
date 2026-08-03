import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { SignOutButton } from "@/components/SignOutButton";

export const metadata: Metadata = {
	title: "My Account · American Scientific",
	robots: { index: false, follow: false },
};

// Reads the session cookie → must render per request.
export const dynamic = "force-dynamic";

export default async function AccountPage() {
	const user = await getCurrentUser();
	if (!user) redirect("/login?next=/account");

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
				{/*
				 * No price tier here. Which negotiated tier an account sits on is
				 * internal commercial information: it invites "why am I on 3 when
				 * they're on 4", and the number means nothing to the customer anyway.
				 * Their prices are already shown on the products themselves.
				 */}
			</dl>

			<div className="mt-8 flex items-center justify-between gap-4">
				<p className="text-sm text-slate-500">Signed in as {user.email}</p>
				<SignOutButton />
			</div>
		</main>
	);
}
