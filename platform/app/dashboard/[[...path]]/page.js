import { notFound, redirect } from 'next/navigation.js';
import { connection } from 'next/server';
import { PageTransition } from '@shelfway/ui';
import { platformApi, platformBranding, platformSession, one } from '../../_lib/server.js';
import {
	loadActivity,
	loadAdmin,
	loadAdmins,
	loadAdminWebsite,
	loadBilling,
	loadMerchant,
	loadMerchants,
	loadMyAccount,
	loadOverview as loadAdminOverview,
	loadProduct,
	loadProducts,
	loadSettings,
} from '../../../src/console/admin/loaders.js';
import {
	ADMIN_PARTS,
	FINANCE_PARTS,
	MY_ACCOUNT_PARTS,
	PRODUCT_PARTS,
	SETTINGS_PARTS,
	adminRoutes,
} from '../../../src/console/admin/paths.js';
import {
	loadAccount,
	loadCredits,
	loadOverview as loadMerchantOverview,
	loadWebsitePage,
	loadWebsites,
} from '../../../src/console/loaders.js';
import { ACCOUNT_PARTS, routes } from '../../../src/console/paths.js';
import { LEGACY_PEER_REDIRECTS, websitePartOf } from '../../../src/console/website-parts.js';
import { MyAccountView } from '../../../src/console/admin/views/account.js';
import { ActivityView } from '../../../src/console/admin/views/activity.js';
import { AdminsView } from '../../../src/console/admin/views/admins.js';
import { FinanceView } from '../../../src/console/admin/views/finance.js';
import { AdminWebsiteView, MerchantsView } from '../../../src/console/admin/views/merchants.js';
import { OverviewView as AdminOverviewView } from '../../../src/console/admin/views/overview.js';
import { ProductsView } from '../../../src/console/admin/views/products.js';
import { SettingsView } from '../../../src/console/admin/views/settings.js';
import { AccountView } from '../../../src/console/views/account.js';
import { CreditsView } from '../../../src/console/views/credits.js';
import { SharedSetupView } from '../../../src/console/views/setup.js';
import { OverviewView as MerchantOverviewView, WebsiteView, WebsitesView } from '../../../src/console/views/websites.js';

export const dynamic = 'force-dynamic';

const MERCHANT_PARTS = ['websites', 'credits', 'details', 'activity'];

/**
 * Metadata for unified role-based dashboard pages.
 * @param {{ params: Promise<{ path?: string[] }> }} props
 */
export async function generateMetadata({ params }) {
	const path = (await params)?.path || [];
	const [session, branding] = await Promise.all([
		platformSession().catch(() => ({ ok: false })),
		platformBranding().catch(() => null),
	]);
	const brandName = branding?.name || 'Shelfway';
	const seg = path[0]?.toLowerCase();

	if (session?.ok && session.kind === 'admin') {
		if (!seg || seg === 'overview') return { title: `Overview · Admin · ${brandName}` };
		if (seg === 'merchants') return { title: `Merchants · Admin · ${brandName}` };
		if (seg === 'products') return { title: `Products · Admin · ${brandName}` };
		if (seg === 'finance' || seg === 'credits') return { title: `Credits and billing · Admin · ${brandName}` };
		if (seg === 'admins') return { title: `Admins · Admin · ${brandName}` };
		if (seg === 'settings') return { title: `Settings · Admin · ${brandName}` };
		if (seg === 'activity') return { title: `Activity · Admin · ${brandName}` };
		if (seg === 'account') return { title: `My account · Admin · ${brandName}` };
		return { title: `Admin · ${brandName}` };
	}

	if (session?.ok && session.kind === 'merchant') {
		if (!seg || seg === 'overview') return { title: `Overview · ${brandName}` };
		if (seg === 'websites') return { title: `Websites · ${brandName}` };
		if (seg === 'credits' || seg === 'finance') return { title: `Usage and credits · ${brandName}` };
		if (seg === 'account') return { title: `Account · ${brandName}` };
		return { title: `Dashboard · ${brandName}` };
	}

	return { title: `Dashboard · ${brandName}` };
}

/**
 * Unified Role-Based Dashboard Catch-All Page:
 * Renders the production views inside the full-screen AppShell console frame.
 * Role-based routing partitions view access cleanly between Admin and Merchant personas.
 * Unauthenticated visitors are redirected to the unified sign-in modal with their return path preserved.
 *
 * @param {{ params: Promise<{ path?: string[] }>, searchParams: Promise<Record<string, string | string[] | undefined>> }} props
 */
export default async function DashboardPage({ params, searchParams }) {
	await connection();
	const path = (await params)?.path || [];
	const q = (await searchParams) || {};

	const [session, branding, api] = await Promise.all([
		platformSession().catch(() => ({ ok: false })),
		platformBranding().catch(() => ({ name: 'Shelfway', accent: '#0f766e', logoUrl: null })),
		platformApi().catch(() => null),
	]);

	if (!session?.ok || !api) {
		const fullPath = path.length ? `/dashboard/${path.join('/')}` : '/dashboard';
		redirect(`/?auth=1&next=${encodeURIComponent(fullPath)}`);
	}

	// -------------------------------------------------------------------------------------------------
	// 1. ADMIN PERSONA
	// -------------------------------------------------------------------------------------------------
	if (session.kind === 'admin') {
		const [first, second, third, fourth, fifth, sixth] = path;

		// Overview: [] or ['overview']
		if (!first || first === 'overview') {
			const data = await loadAdminOverview(api);
			return <AdminOverviewView {...data} admin={session.admin} />;
		}

		// Merchants: ['merchants']
		if (first === 'merchants' && !second) {
			const filter = { status: one(q.status), q: one(q.q), cursor: one(q.cursor) };
			const list = await loadMerchants(api, filter);
			const firstId = list.ok && list.page?.items?.[0]?.merchantId ? String(list.page.items[0].merchantId) : null;
			const detail = firstId ? await loadMerchant(api, firstId, session.admin) : null;
			return <MerchantsView list={list} detail={detail} fromList admin={session.admin} />;
		}

		// Merchant website: ['merchants', ':merchantId', 'websites', ':websiteId', ...]
		if (first === 'merchants' && second && third === 'websites' && fourth) {
			const merchantId = second;
			const websiteId = fourth;
			const part = fifth;
			const sub = sixth;
			if (part && LEGACY_PEER_REDIRECTS.includes(/** @type {any} */ (part))) {
				redirect(adminRoutes.website(merchantId, websiteId));
			}
			const websitePath = websitePartOf(part, sub);
			const detail = await loadAdminWebsite(api, merchantId, websiteId, websitePath, session.admin);
			return <AdminWebsiteView detail={detail} admin={session.admin} />;
		}

		// Merchant sub-part: ['merchants', ':merchantId', ':part']
		if (first === 'merchants' && second && third && !fourth) {
			const merchantId = second;
			const part = third;
			if (!MERCHANT_PARTS.includes(part)) notFound();
			redirect(adminRoutes.merchantPart(merchantId, part));
		}

		// Merchant detail: ['merchants', ':merchantId']
		if (first === 'merchants' && second && !third) {
			const merchantId = second;
			const filter = { status: one(q.status), q: one(q.q), cursor: one(q.cursor) };
			const [list, detail] = await Promise.all([loadMerchants(api, filter), loadMerchant(api, merchantId, session.admin)]);
			return <MerchantsView list={list} detail={detail} merchantId={merchantId} admin={session.admin} />;
		}

		// Products: ['products']
		if (first === 'products' && !second) {
			const status = one(q.status);
			const list = await loadProducts(api, { status });
			const firstId = list.ok && list.items?.[0]?.productId ? String(list.items[0].productId) : null;
			const detail = firstId ? await loadProduct(api, firstId) : null;
			return <ProductsView {...list} detail={detail} fromList admin={session.admin} />;
		}

		// Product detail: ['products', ':productId']
		if (first === 'products' && second && !third) {
			const productId = second;
			const status = one(q.status);
			const [list, detail] = await Promise.all([loadProducts(api, { status }), loadProduct(api, productId)]);
			return <ProductsView {...list} detail={detail} productId={productId} admin={session.admin} />;
		}

		// Product sub-part: ['products', ':productId', ':part']
		if (first === 'products' && second && third && !fourth) {
			const productId = second;
			const part = third;
			if (!PRODUCT_PARTS.includes(part)) notFound();
			redirect(`/dashboard/products/${productId}#${part}`);
		}

		// Finance: ['finance'] or ['credits']
		if ((first === 'finance' || first === 'credits') && !second) {
			const filter = {
				merchantId: one(q.merchantId),
				from: one(q.from),
				to: one(q.to),
				method: one(q.method),
				by: one(q.by),
			};
			const billing = await loadBilling(api, filter);
			return <FinanceView {...billing} part="attention" admin={session.admin} />;
		}

		// Finance sub-part: ['finance', ':part']
		if ((first === 'finance' || first === 'credits') && second && !third) {
			const part = second;
			if (!FINANCE_PARTS.includes(/** @type {any} */ (part)) || part === 'attention') notFound();
			const filter = {
				merchantId: one(q.merchantId),
				from: one(q.from),
				to: one(q.to),
				method: one(q.method),
				by: one(q.by),
			};
			const billing = await loadBilling(api, filter);
			return <FinanceView {...billing} part={part} admin={session.admin} />;
		}

		// Admins: ['admins']
		if (first === 'admins' && !second) {
			const list = await loadAdmins(api, session.admin);
			const firstId = list.ok && list.items?.[0]?.adminId ? String(list.items[0].adminId) : null;
			const detail = firstId ? await loadAdmin(api, session.admin, firstId) : null;
			return <AdminsView {...list} detail={detail} fromList admin={session.admin} />;
		}

		// Admin detail: ['admins', ':adminId']
		if (first === 'admins' && second && !third) {
			const adminId = second;
			const detail = await loadAdmin(api, session.admin, adminId);
			return <AdminsView {...detail} selectedId={adminId} admin={session.admin} />;
		}

		// Admin sub-part: ['admins', ':adminId', ':part']
		if (first === 'admins' && second && third && !fourth) {
			const adminId = second;
			const part = third;
			if (!ADMIN_PARTS.includes(part)) notFound();
			redirect(`/dashboard/admins/${adminId}#${part}`);
		}

		// Settings: ['settings']
		if (first === 'settings' && !second) {
			const settings = await loadSettings(api);
			return <SettingsView {...settings} />;
		}

		// Settings sub-part: ['settings', ':part']
		if (first === 'settings' && second && !third) {
			const part = second;
			if (!SETTINGS_PARTS.includes(part)) notFound();
			redirect(adminRoutes.settingsPart(part));
		}

		// Activity: ['activity']
		if (first === 'activity' && !second) {
			const filter = { merchantId: one(q.merchantId), adminId: one(q.adminId), from: one(q.from), to: one(q.to) };
			const activity = await loadActivity(api, filter, session.admin);
			return <ActivityView key={JSON.stringify(filter)} {...activity} />;
		}

		// Account: ['account']
		if (first === 'account' && !second) {
			const account = await loadMyAccount(api);
			return <MyAccountView {...account} part="profile" />;
		}

		// Account sub-part: ['account', ':part']
		if (first === 'account' && second && !third) {
			const part = second;
			if (!MY_ACCOUNT_PARTS.includes(part) || part === 'profile') notFound();
			redirect(adminRoutes.accountPart(part));
		}

		// Friendly redirect: an admin visiting /dashboard/websites goes to /dashboard/merchants
		if (first === 'websites') {
			redirect('/dashboard/merchants');
		}

		return notFound();
	}

	// -------------------------------------------------------------------------------------------------
	// 2. MERCHANT PERSONA
	// -------------------------------------------------------------------------------------------------
	if (session.kind === 'merchant') {
		const [first, second, third, fourth] = path;
		const merchantId = session.merchantId;
		if (!merchantId) redirect('/?auth=1');

		// Overview: [] or ['overview']
		if (!first || first === 'overview') {
			const overview = await loadMerchantOverview(api, merchantId);
			const welcome = overview.ok && overview.rows?.length === 0;
			const view = <MerchantOverviewView {...overview} me={session.me} branding={welcome ? branding : undefined} />;
			return <PageTransition>{view}</PageTransition>;
		}

		// Websites: ['websites']
		if (first === 'websites' && !second) {
			const websites = await loadWebsites(api, merchantId);
			const welcome = websites.ok && websites.rows?.length === 0;
			return <WebsitesView {...websites} branding={welcome ? branding : undefined} />;
		}

		// Website page: ['websites', ':websiteId', ...]
		if (first === 'websites' && second) {
			const websiteId = second;
			const part = third;
			const sub = fourth;
			const queryPart =
				one(q.part) ||
				(one(q.tab)
					? one(q.section)
						? `${one(q.tab)}/${one(q.section)}`
						: one(q.tab)
					: one(q.product)
						? `products/${one(q.product)}`
						: '');
			const effectivePart = part || queryPart;
			if (effectivePart && LEGACY_PEER_REDIRECTS.includes(/** @type {any} */ (effectivePart))) {
				redirect(routes.website(websiteId));
			}
			const websitePath = websitePartOf(effectivePart, sub);
			const loaded = await loadWebsitePage(api, merchantId, websiteId, websitePath);
			return <WebsiteView {...loaded} />;
		}

		// Credits / Finance: ['credits'] or ['finance'] or ['billing']
		if ((first === 'credits' || first === 'finance' || first === 'billing') && !second) {
			const loaded = await loadCredits(api, merchantId, {
				from: one(q.from),
				to: one(q.to),
				websiteId: one(q.websiteId),
			});
			return <CreditsView {...loaded} />;
		}

		// Credits receipts: ['credits', 'receipts'] or ['finance', 'receipts']
		if ((first === 'credits' || first === 'finance') && second === 'receipts') {
			redirect(routes.creditsReceipts());
		}

		// Account: ['account']
		if (first === 'account' && !second) {
			const loaded = await loadAccount(api, merchantId);
			return <AccountView {...loaded} part="details" />;
		}

		// Account sub-part: ['account', ':part']
		if (first === 'account' && second && !third) {
			const part = second;
			if (!ACCOUNT_PARTS.includes(part) || part === 'details') notFound();
			redirect(routes.accountPart(part));
		}

		// Shared Setup: ['shared-setup']
		if (first === 'shared-setup') {
			return <SharedSetupView brand={branding.name} />;
		}

		return notFound();
	}

	return notFound();
}
