// Server-side admin console context: the admin session (its cookie is separate from merchant sessions) and the
// redirects of signed-out visitors and of merchants, on the request's API client and Branding (`app/_lib/server.js`).
// Thin adapter over src/console/admin (no business logic here).
import { cache } from 'react';
import { redirect } from 'next/navigation.js';
import { loadAdminSession } from '../../../src/console/admin/loaders.js';
import { platformApi, platformBranding } from '../../_lib/server.js';

export { one } from '../../_lib/server.js';

/** The Branding (public). */
export const adminBranding = platformBranding;

/** The signed-in admin session (one `/v1/me` call per request). */
export const adminSession = cache(async () => loadAdminSession(await platformApi()));

/**
 * Signed-in admin context of a page; others go to the one sign-in page (and come back to `next`), merchants to their
 * console.
 * @param {string} next
 */
export const adminContext = async (next) => {
	const session = await adminSession();
	if (!session.ok) {
		if (session.status === 401) redirect(`/?auth=1&next=${encodeURIComponent(next)}`);
		if (/** @type {{ merchant?: boolean }} */ (session).merchant) redirect('/overview');
		throw new Error(session.problem?.detail ?? 'The admin console is unavailable.');
	}
	return { api: await platformApi(), admin: session.admin };
};
