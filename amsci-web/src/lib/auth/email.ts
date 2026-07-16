import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { TokenPurpose } from "./tokens";

/**
 * Transactional email via Resend (https://resend.com). Sender is a dedicated
 * domain (am-sci.com) verified in Resend with its own DNS records, separate
 * from the american-scientific.com M365 mail, so it can't affect that setup.
 * Secret: RESEND_API_KEY (wrangler secret). Config vars: EMAIL_FROM,
 * EMAIL_FROM_NAME, SITE_URL.
 */
interface MailEnv {
	RESEND_API_KEY?: string;
	EMAIL_FROM?: string;
	EMAIL_FROM_NAME?: string;
	SITE_URL?: string;
	AUTH_DEV_LINKS?: string;
}

function mailEnv(): MailEnv {
	try {
		return getCloudflareContext().env as unknown as MailEnv;
	} catch {
		return {};
	}
}

/**
 * Whether to surface setup/reset links in API responses (for local testing
 * without a mail provider). Gated on an EXPLICIT env flag set only in .dev.vars,
 * never in production, so a prod deploy without the EMAIL binding can't leak links.
 */
export function devLinksEnabled(): boolean {
	return mailEnv().AUTH_DEV_LINKS === "1";
}

/** Absolute base URL for links in emails: SITE_URL if set, else the request origin. */
export function siteBaseUrl(request: Request): string {
	const env = mailEnv();
	if (env.SITE_URL) return env.SITE_URL.replace(/\/$/, "");
	return new URL(request.url).origin;
}

const COPY: Record<TokenPurpose, { subject: string; heading: string; intro: string; cta: string; expiry: string }> = {
	setup: {
		subject: "Set up your American Scientific account",
		heading: "Welcome to the new American Scientific",
		intro: "We've launched a brand new website. To keep your account secure, please set a new password. Your previous password does not carry over to the new site.",
		cta: "Set your password",
		expiry: "72 hours",
	},
	reset: {
		subject: "Reset your American Scientific password",
		heading: "Reset your password",
		intro: "We received a request to reset your password. Choose a new one using the button below. If you did not request this, you can safely ignore this email.",
		cta: "Reset your password",
		expiry: "1 hour",
	},
};

// Brand palette (matches src/app/globals.css).
const BRAND_GRADIENT = "linear-gradient(100deg,#c1121f,#7a2f8f 52%,#1391d5)";
const BRAND_BLUE_DEEP = "#0a6ea8"; // solid fallback for clients that drop gradients (Outlook)

function renderHtml(name: string, link: string, purpose: TokenPurpose): string {
	const c = COPY[purpose];
	const greeting = name ? `Hi ${name},` : "Hello,";
	let base = "";
	try {
		base = new URL(link).origin;
	} catch {
		base = "";
	}
	const logo = `${base}/am-sci-logo.png`;
	const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
	return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head>
<body style="margin:0;padding:0;background:#f6f7fb;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Set a new password for your American Scientific account.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
        <tr><td style="height:6px;background:${BRAND_BLUE_DEEP};background-image:${BRAND_GRADIENT};font-size:0;line-height:0;">&nbsp;</td></tr>
        <tr><td align="center" style="padding:32px 32px 8px;">
          <img src="${logo}" alt="American Scientific" width="170" style="width:170px;max-width:70%;height:auto;display:block;border:0;">
        </td></tr>
        <tr><td style="padding:12px 40px 40px;font-family:${font};color:#0b1220;">
          <h1 style="margin:16px 0 16px;font-size:22px;line-height:1.3;color:#0a0f1c;">${c.heading}</h1>
          <p style="margin:0 0 14px;font-size:15px;line-height:1.6;">${greeting}</p>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#334155;">${c.intro}</p>
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;"><tr>
            <td align="center" bgcolor="${BRAND_BLUE_DEEP}" style="border-radius:9999px;background-image:${BRAND_GRADIENT};">
              <a href="${link}" style="display:inline-block;padding:14px 32px;font-family:${font};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:9999px;">${c.cta}</a>
            </td>
          </tr></table>
          <p style="margin:0 0 6px;font-size:13px;color:#64748b;">Or paste this link into your browser:</p>
          <p style="margin:0 0 24px;font-size:13px;word-break:break-all;"><a href="${link}" style="color:${BRAND_BLUE_DEEP};">${link}</a></p>
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">This secure link can only be used once and expires in ${c.expiry}. If you weren't expecting it, you can ignore this email.</p>
        </td></tr>
        <tr><td style="padding:20px 40px;background:#f8fafc;border-top:1px solid #eef2f7;font-family:${font};font-size:12px;color:#94a3b8;line-height:1.7;">
          American Scientific, LLC<br>
          888-490-9002 &nbsp;&middot;&nbsp; office@american-scientific.com &nbsp;&middot;&nbsp; Columbus, OH
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function renderText(name: string, link: string, purpose: TokenPurpose): string {
	const c = COPY[purpose];
	return `${name ? `Hi ${name},` : "Hello,"}

${c.intro}

${c.cta}: ${link}

This secure link can only be used once and expires in ${c.expiry}.

American Scientific, LLC
888-490-9002 | office@american-scientific.com | Columbus, OH`;
}

/**
 * Send a password setup/reset email via Resend. When RESEND_API_KEY is unset
 * (local dev, or before the sender domain is configured), it logs the link and
 * returns { delivered:false, devFallback:true } so the flow still works and can
 * be tested without a mail provider. Never throws.
 */
export async function sendPasswordEmail(
	to: string,
	name: string,
	link: string,
	purpose: TokenPurpose,
): Promise<{ delivered: boolean; devFallback: boolean; link: string }> {
	const env = mailEnv();
	const c = COPY[purpose];
	// No API key = dev / not yet configured. Log the link and flag it as a dev
	// fallback so callers may surface it locally (never in production).
	if (!env.RESEND_API_KEY) {
		console.log(`[auth/email] no RESEND_API_KEY: ${purpose} link for ${to}: ${link}`);
		return { delivered: false, devFallback: true, link };
	}
	const fromAddr = env.EMAIL_FROM || "hello@am-sci.com";
	const fromName = env.EMAIL_FROM_NAME || "American Scientific";
	try {
		const res = await fetch("https://api.resend.com/emails", {
			method: "POST",
			headers: {
				Authorization: `Bearer ${env.RESEND_API_KEY}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				from: `${fromName} <${fromAddr}>`,
				to: [to],
				subject: c.subject,
				html: renderHtml(name, link, purpose),
				text: renderText(name, link, purpose),
			}),
		});
		if (!res.ok) {
			const detail = await res.text().catch(() => "");
			console.error(`[auth/email] Resend ${res.status} for ${to}: ${detail}`);
			return { delivered: false, devFallback: false, link };
		}
		return { delivered: true, devFallback: false, link };
	} catch (err) {
		// Network/API failure → do NOT leak the link.
		console.error(`[auth/email] send failed for ${to}:`, err);
		return { delivered: false, devFallback: false, link };
	}
}
