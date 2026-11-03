import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyTurnstile } from '../src/infra/turnstile.js';

describe('verifyTurnstile', () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
		vi.restoreAllMocks();
	});

	it('passes without error when secretKey is null or undefined', async () => {
		const resNull = await verifyTurnstile({ secretKey: null, token: null });
		expect(resNull).toEqual({ ok: true });

		const resUndefined = await verifyTurnstile({ secretKey: undefined, token: '' });
		expect(resUndefined).toEqual({ ok: true });
	});

	it('fails when secretKey is present but token is missing or empty', async () => {
		const resMissing = await verifyTurnstile({ secretKey: '0x4AAAAAA', token: '' });
		expect(resMissing.ok).toBe(false);
		expect(resMissing.error).toBe('Turnstile verification token is required');

		const resNullToken = await verifyTurnstile({ secretKey: '0x4AAAAAA', token: null });
		expect(resNullToken.ok).toBe(false);
		expect(resNullToken.error).toBe('Turnstile verification token is required');
	});

	it('returns ok: true when Cloudflare confirms valid challenge', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ success: true }),
		});

		const res = await verifyTurnstile({
			secretKey: '0x4AAAAAA',
			token: 'turnstile-token-xyz',
			ip: '198.51.100.1',
		});

		expect(res).toEqual({ ok: true });
		expect(globalThis.fetch).toHaveBeenCalledTimes(1);
	});

	it('returns ok: false when Cloudflare rejects token', async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ success: false, 'error-codes': ['invalid-input-response'] }),
		});

		const res = await verifyTurnstile({
			secretKey: '0x4AAAAAA',
			token: 'bad-token',
		});

		expect(res.ok).toBe(false);
		expect(res.error).toBe('Turnstile challenge verification failed');
	});
});
