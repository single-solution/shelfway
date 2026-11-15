import { connection } from 'next/server';
import { platformApi, platformBranding, platformSession, one } from '../../_lib/server.js';
import { SiteFooter, SiteHeader } from '../../_components/SiteNav.js';
import { COMPANY_NAME, PRODUCT_BRAND } from '../../_components/brand.js';
import { DashboardHubView } from '../../../src/console/views/dashboard.js';
import { loadOverview as loadMerchantOverview, loadWebsites } from '../../../src/console/loaders.js';
import { loadOverview as loadAdminOverview, loadMerchants, loadProducts } from '../../../src/console/admin/loaders.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
	return {
		title: `Dashboard - ${PRODUCT_BRAND}`,
		description: `Unified role-based management dashboard for merchants, administrators, and staff.`,
		robots: { index: false, follow: false },
	};
}

/**
 * Maps URL sub-path to dashboard section identifier.
 * @param {string[]} path
 * @param {string} [fallbackQuery]
 * @returns {string}
 */
const sectionFromPath = (path, fallbackQuery) => {
	const seg = path[0]?.toLowerCase();
	if (!seg || seg === 'overview') return 'overview';
	if (seg === 'websites') return 'websites';
	if (seg === 'merchants') return 'merchants';
	if (seg === 'catalog') return 'catalog';
	if (seg === 'products') return 'products';
	if (seg === 'finance') return 'finance';
	if (seg === 'credits' || seg === 'billing') return 'billing';
	if (seg === 'admins') return 'admins';
	if (seg === 'settings' || seg === 'system') return 'system';
	if (seg === 'activity') return 'activity';
	if (seg === 'account') return 'account';
	if (seg === 'tokens') return 'tokens';
	if (seg === 'assigned-stores') return 'assigned-stores';
	if (seg === 'operations-desk') return 'operations-desk';
	return fallbackQuery || 'overview';
};

/** @param {{ params: Promise<{ path?: string[] }>, searchParams: Promise<Record<string, string | string[] | undefined>> }} props */
export default async function DashboardCatchAllPage({ params, searchParams }) {
	await connection();
	const path = (await params)?.path || [];
	const q = (await searchParams) || {};
	const section = sectionFromPath(path, one(q.section));

	const [api, session, branding] = await Promise.all([
		platformApi().catch(() => null),
		platformSession().catch(() => ({ ok: false })),
		platformBranding().catch(() => null),
	]);

	/** @type {any} */
	let initialData = null;
	if (api && session?.ok) {
		if (session.kind === 'admin') {
			const [overview, merchants, products] = await Promise.all([
				loadAdminOverview(api).catch(() => null),
				loadMerchants(api).catch(() => null),
				loadProducts(api).catch(() => null),
			]);
			initialData = { overview, merchants, products };
		} else if (session.kind === 'merchant' && session.merchantId) {
			const [overview, websites] = await Promise.all([
				loadMerchantOverview(api, session.merchantId).catch(() => null),
				loadWebsites(api, session.merchantId).catch(() => null),
			]);
			initialData = { overview, websites };
		}
	}

	const brandName = branding?.name || PRODUCT_BRAND;

	return (
		<div className="shelfway-site flex min-h-screen flex-col bg-transparent text-fg font-sans">
			<SiteHeader brandName={brandName} session={session?.ok ? session : null} />
			<main className="flex-1">
				<DashboardHubView
					branding={branding}
					session={session?.ok ? session : null}
					initialSection={section}
					initialData={initialData}
				/>
			</main>
			<SiteFooter brandName={brandName} companyName={COMPANY_NAME} session={session?.ok ? session : null} />
		</div>
	);
}

