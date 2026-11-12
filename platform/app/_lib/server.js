// The server side of both consoles: the request's in-process API client bound to its cookies (one per request), the
// Branding and query-string reading. Thin adapter over src/console (no business logic here).
import { cache } from 'react';
import { headers } from 'next/headers.js';
import { createConsoleApi } from '../../src/console/api.js';
import { DEFAULT_SETTINGS } from '../../src/infra/config.js';
import { getPlatform } from '../../src/runtime.js';

/** The request's API client (one per request). */
export const platformApi = cache(async () => {
	const h = await headers(); // first: makes the page dynamic before the Portal (environment) is touched
	const portal = await getPlatform();
	return createConsoleApi({
		handle: portal.handle,
		baseUrl: portal.config.platformUrl, // PLATFORM_URL, never the request's headers (PLAN 0.8.1)
		cookie: h.get('cookie'),
		forwardedFor: h.get('x-forwarded-for'),
		realIp: h.get('x-real-ip'),
	});
});

/** The Branding and support contact (public); the defaults while they cannot be read. */
export const platformBranding = cache(async () => {
	const result = await (await platformApi()).get('/v1/branding');
	if (result.ok) return result.data;
	const { branding, support } = DEFAULT_SETTINGS;
	return { name: branding.name, accent: branding.accent, logoUrl: null, support: { ...support } };
});

/**
 * The resolved session for the public Portal surface (website, docs): verifies whether the visitor
 * holds an active merchant or admin session cookie and returns a normalized session object.
 */
export const platformSession = cache(async () => {
	const api = await platformApi();
	const me = await api.get('/v1/me');
	if (!me.ok) return { ok: false, status: me.status, problem: me.problem };
	const data = me.data;
	if (data?.kind === 'admin') {
		return {
			ok: true,
			kind: 'admin',
			admin: data.admin,
			me: data,
			actor: { role: data.admin?.role || 'owner', name: data.admin?.name || 'Admin', email: data.admin?.email },
			name: data.admin?.name || 'Admin',
			email: data.admin?.email,
			role: data.admin?.role || 'owner',
		};
	}
	if (data?.kind === 'merchant') {
		return {
			ok: true,
			kind: 'merchant',
			merchantId: data.merchant?.merchantId,
			merchant: data.merchant,
			me: data,
			actor: data.actor || { role: 'owner', name: data.merchant?.name || 'Merchant', email: data.merchant?.email },
			name: data.actor?.name || data.merchant?.name || 'Merchant',
			email: data.actor?.email || data.merchant?.email,
			role: data.actor?.role || 'owner',
		};
	}
	return { ok: false, status: 403 };
});

/**
 * The first value of a query-string parameter.
 * @param {unknown} value
 */
export const one = (value) =>
	typeof value === 'string' ? value : Array.isArray(value) && typeof value[0] === 'string' ? value[0] : undefined;
