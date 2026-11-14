import { connection } from 'next/server';
import { platformApi, platformBranding, platformSession, one } from '../_lib/server.js';
import { SiteFooter, SiteHeader } from '../_components/SiteNav.js';
import { COMPANY_NAME, PRODUCT_BRAND } from '../_components/brand.js';
import { DashboardHubView } from '../../src/console/views/dashboard.js';
import { loadOverview as loadMerchantOverview, loadWebsites } from '../../src/console/loaders.js';
import { loadOverview as loadAdminOverview, loadMerchants, loadProducts } from '../../src/console/admin/loaders.js';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
	return {
		title: `Dashboard - ${PRODUCT_BRAND}`,
		description: `Unified role-based management dashboard for merchants, administrators, and staff.`,
		robots: { index: false, follow: false },
	};
}

/** @param {{ searchParams: Promise<Record<string, string | string[] | undefined>> }} props */
export default async function DashboardPage({ searchParams }) {
	await connection();
	const q = (await searchParams) || {};
	const section = one(q.section) || '';

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

