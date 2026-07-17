import type { Metadata } from "next";
import { RegisterForm } from "@/components/RegisterForm";
import { turnstileSiteKey } from "@/lib/auth/turnstile";

export const metadata: Metadata = {
	title: "Request an Account · American Scientific",
	description:
		"Request a wholesale account with American Scientific. Educators and distributors get account-specific pricing after approval.",
};

// Reads the Turnstile site key from the runtime env.
export const dynamic = "force-dynamic";

export default function RegisterPage() {
	const siteKey = turnstileSiteKey();

	return (
		<main className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
			<div className="text-center">
				<h1 className="font-display text-3xl font-bold tracking-tight text-slate-900">Request an account</h1>
				<p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-600">
					American Scientific is a wholesale distributor and manufacturer. Tell us about your
					organization and we'll set you up with account-specific pricing. Requests are reviewed by our
					team before your account is activated.
				</p>
			</div>

			<div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
				<RegisterForm siteKey={siteKey} />
			</div>
		</main>
	);
}
