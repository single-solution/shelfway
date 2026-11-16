import { connection } from 'next/server';
import { platformApi, platformBranding, platformSession } from '../_lib/server.js';
import { loadAttentionCount } from '../../src/console/admin/loaders.js';
import { adminCan } from '../../src/infra/rbac.js';
import { AdminShell } from '../../src/console/admin/views/shell.js';
import { ConsoleShell } from '../../src/console/views/shell.js';
import { loadFrame } from '../../src/console/loaders.js';

export const dynamic = 'force-dynamic';

/**
 * The unified role-based Dashboard frame (AppShell):
 * Stays mounted on screen across navigations inside /dashboard.
 * Admin role gets the AdminShell with administrative navigation and attention counters.
 * Merchant role gets the ConsoleShell with merchant navigation, website switcher, and billing status.
 * Unauthenticated visitors pass through to the page, which triggers redirect to the unified sign-in modal.
 *
 * @param {{ children: import('react').ReactNode }} props
 */
export default async function DashboardLayout({ children }) {
	await connection();
	const [session, branding, api] = await Promise.all([
		platformSession().catch(() => ({ ok: false })),
		platformBranding().catch(() => ({ name: 'Shelfway', accent: '#0f766e', logoUrl: null })),
		platformApi().catch(() => null),
	]);

	if (!session?.ok) {
		return children;
	}

	if (session.kind === 'admin') {
		const attention =
			!session.twoStepRequired && adminCan(session.admin, 'billing.read') && api
				? await loadAttentionCount(api).catch(() => 0)
				: 0;
		return (
			<AdminShell admin={session.admin} twoStepRequired={session.twoStepRequired} branding={branding} attention={attention}>
				{children}
			</AdminShell>
		);
	}

	if (session.kind === 'merchant') {
		const frame =
			api && session.merchantId
				? await loadFrame(api, session.merchantId).catch(() => ({ websites: [], billing: null }))
				: { websites: [], billing: null };
		return (
			<ConsoleShell me={session.me} websites={frame.websites || []} billing={frame.billing || null} branding={branding}>
				{children}
			</ConsoleShell>
		);
	}

	return children;
}
