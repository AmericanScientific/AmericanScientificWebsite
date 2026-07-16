import type { Metadata } from "next";
import { Suspense } from "react";
import { SetPasswordForm } from "@/components/SetPasswordForm";

export const metadata: Metadata = {
	title: "Set your password · American Scientific",
	robots: { index: false, follow: false },
};

export default function SetPasswordPage() {
	return (
		<main className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
			<h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">Set your password</h1>
			<p className="mt-2 text-sm text-slate-500">
				Choose a password for your American Scientific account.
			</p>

			<div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
				<Suspense fallback={<div className="h-56 animate-pulse rounded-xl bg-slate-50" />}>
					<SetPasswordForm />
				</Suspense>
			</div>
		</main>
	);
}
