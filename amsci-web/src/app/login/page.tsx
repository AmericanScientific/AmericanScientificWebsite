import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
	title: "Sign In · American Scientific",
	description: "Sign in to your American Scientific wholesale account to see your pricing and place orders.",
	robots: { index: false, follow: false },
};

export default function LoginPage() {
	return (
		<main className="mx-auto flex max-w-md flex-col px-4 py-16 sm:px-6">
			<h1 className="font-display text-2xl font-bold tracking-tight text-slate-900">Sign in</h1>
			<p className="mt-2 text-sm text-slate-500">
				Access your wholesale account pricing and place orders.
			</p>

			<div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
				<Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-slate-50" />}>
					<LoginForm />
				</Suspense>
			</div>

			<p className="mt-6 text-center text-sm text-slate-500">
				Don&apos;t have an account?{" "}
				<Link href="/" className="font-semibold text-brand-blue hover:underline">
					Request one
				</Link>
			</p>
		</main>
	);
}
