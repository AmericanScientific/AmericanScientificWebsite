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

			{/*
			 * MIGRATION NOTICE: temporary.
			 *
			 * Sits ABOVE the form on purpose. Roughly 448 accounts can sign in and
			 * have not set a password here yet, and their old site password will be
			 * rejected. Explaining that after they have already failed to sign in is
			 * too late: a returning customer reads a rejection as "my account is
			 * broken", not "this is a different site". So it is placed where it is
			 * read first.
			 *
			 * Remove this once the migration tail is small enough that it is noise
			 * for everyone else.
			 */}
			<section
				aria-labelledby="new-site-heading"
				className="mt-8 rounded-2xl border border-brand-blue/25 bg-brand-blue/[0.06] p-5 sm:p-6"
			>
				<h2 id="new-site-heading" className="font-display text-base font-semibold tracking-tight text-slate-900">
					Welcome to the new American Scientific
				</h2>
				<p className="mt-2 text-sm leading-relaxed text-slate-600">
					This is our new website. If you had an account on our previous site,{" "}
					<strong className="font-semibold text-slate-900">your old password will not work here.</strong>{" "}
					Choose <span className="font-medium text-slate-800">&ldquo;First time here, or forgot your password?&rdquo;</span>{" "}
					below and we will email you a secure link to set a new one.
				</p>
				<p className="mt-2 text-sm leading-relaxed text-slate-600">
					Your account, your company details and your pricing all carry over. You only need to choose a new password.
				</p>
			</section>

			<div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
				<Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-slate-50" />}>
					<LoginForm />
				</Suspense>
			</div>

			<p className="mt-6 text-center text-sm text-slate-500">
				Don&apos;t have an account?{" "}
				<Link href="/register" className="font-semibold text-brand-blue hover:underline">
					Request one
				</Link>
			</p>
		</main>
	);
}
