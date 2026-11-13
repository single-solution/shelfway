import { connection } from 'next/server';
import { consoleApi, consoleBranding, one } from '../(console)/_lib/server.js';
import { platformSession } from '../_lib/server.js';
import { loadDocsHub, loadDocsProduct } from '../../src/console/loaders.js';
import { DocsHubView } from '../../src/console/views/docs.js';
import { SiteFooter, SiteHeader } from '../_components/SiteNav.js';
import { COMPANY_NAME, PRODUCT_BRAND } from '../_components/brand.js';

export const dynamic = 'force-dynamic';

/** @param {{ searchParams: Promise<Record<string, string | string[] | undefined>> }} props */
export async function generateMetadata({ searchParams }) {
	const q = (await searchParams) || {};
	const product = one(q.product) || '';
	const op = one(q.op) || '';
	return {
		title: op
			? `${op} - ${product ? product.toUpperCase() : 'API'} - ${PRODUCT_BRAND} Documentation`
			: product
				? `${product.charAt(0).toUpperCase() + product.slice(1)} API Documentation - ${PRODUCT_BRAND}`
				: `Documentation Hub - ${PRODUCT_BRAND}`,
		description: `Interactive Swagger explorer and universal API documentation for ${PRODUCT_BRAND} store and product services.`,
		robots: { index: true, follow: true },
	};
}

/** @param {{ searchParams: Promise<Record<string, string | string[] | undefined>> }} props */
export default async function DocsPage({ searchParams }) {
	await connection();
	const q = (await searchParams) || {};
	const api = await consoleApi().catch(() => null);
	const initialProduct = one(q.product) || '';
	const [session, branding, docsData, initialProductData] = await Promise.all([
		platformSession().catch(() => ({ ok: false })),
		consoleBranding().catch(() => null),
		api ? loadDocsHub(api).catch(() => ({ ok: false })) : Promise.resolve({ ok: false }),
		api && initialProduct ? loadDocsProduct(api, initialProduct).catch(() => null) : Promise.resolve(null),
	]);
	const items = docsData?.ok && Array.isArray(docsData.items) ? docsData.items : [];
	const initialProductDetails =
		initialProductData?.ok && initialProductData.product ? { [initialProduct]: initialProductData.product } : {};
	const initialOp = one(q.op) || '';
	const initialView = one(q.view) === 'product' || one(q.section)?.startsWith('sdk-') ? 'product' : 'store';
	const initialSection = one(q.section) || '';
	let initialToken = one(q.token) || '';
	let initialWebsite = one(q.website) || '';

	if (session?.ok && (!initialToken || !initialWebsite)) {
		if (api && session.kind === 'merchant' && session.merchantId) {
			try {
				const webRes = await api.get(`/v1/merchants/${session.merchantId}/websites`);
				const firstWeb = Array.isArray(webRes.data?.items) ? webRes.data.items[0] : null;
				if (firstWeb) {
					if (!initialWebsite && firstWeb.domain) {
						initialWebsite = firstWeb.domain;
					}
					const webId = firstWeb.websiteId || firstWeb.id;
					if (!initialToken && webId) {
						const tokRes = await api.get(`/v1/merchants/${session.merchantId}/websites/${webId}/tokens`);
						if (tokRes.ok && Array.isArray(tokRes.data?.items) && tokRes.data.items.length > 0) {
							const bTok =
								tokRes.data.items.find((/** @type {any} */ t) => t.browserToken)?.browserToken ||
								tokRes.data.items[0].browserToken;
							if (bTok) {
								initialToken = bTok;
							}
						}
					}
				}
			} catch {
				// best effort server pre-resolution
			}
		}
		if (!initialToken) {
			const role = session.role || session.actor?.role || 'owner';
			const uid = session.actor?.id || session.merchantId || session.admin?.id || 'viewer';
			initialToken = `tok_${role}_${uid}`;
		}
	}

	const brandName = branding?.name || PRODUCT_BRAND;

	return (
		<div className="shelfway-site flex min-h-screen flex-col bg-transparent text-fg font-sans">
			<SiteHeader brandName={brandName} session={session?.ok ? session : null} />
			<main className="flex-1">
				<DocsHubView
					branding={branding}
					items={items}
					actor={
						session?.ok
							? session.actor ||
								session.me ||
								(session.admin
									? {
											role: session.admin.role || 'owner',
											name: session.admin.name || 'Admin',
											admin: true,
											id: session.admin.id || 'admin',
										}
									: null)
							: null
					}
					initialProductId={initialProduct}
					initialOpKey={initialOp}
					initialView={initialView}
					initialSection={initialSection}
					initialToken={initialToken}
					initialWebsite={initialWebsite}
					initialProductDetails={initialProductDetails}
				/>
			</main>
			<SiteFooter brandName={brandName} companyName={COMPANY_NAME} session={session?.ok ? session : null} />
		</div>
	);
}
