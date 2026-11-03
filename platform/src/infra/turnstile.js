/**
 * Cloudflare Turnstile verification helper for bot defense against AI and automated attacks.
 * @module
 */

/**
 * Verify a Turnstile response token with Cloudflare siteverify endpoint.
 * When secretKey is null or empty (e.g. in development, CI, or when Turnstile is disabled),
 * the check passes automatically so test suites and local development work without network calls.
 *
 * @param {{ secretKey: string | null | undefined, token: string | undefined | null, ip?: string | null }} params
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function verifyTurnstile({ secretKey, token, ip }) {
	if (!secretKey) {
		return { ok: true };
	}
	if (!token || typeof token !== 'string' || token.trim() === '') {
		return { ok: false, error: 'Turnstile verification token is required' };
	}
	try {
		const formData = new URLSearchParams();
		formData.set('secret', secretKey);
		formData.set('response', token.trim());
		if (ip) {
			formData.set('remoteip', ip);
		}
		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body: formData.toString(),
		});
		if (!res.ok) {
			return { ok: false, error: `Turnstile verification service returned HTTP ${res.status}` };
		}
		/** @type {any} */
		const data = await res.json();
		if (data && data.success === true) {
			return { ok: true };
		}
		return { ok: false, error: 'Turnstile challenge verification failed' };
	} catch (err) {
		return { ok: false, error: err instanceof Error ? err.message : 'Turnstile verification failed' };
	}
}
