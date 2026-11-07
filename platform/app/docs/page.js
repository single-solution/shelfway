import { connection } from 'next/server';
import { consoleApi, consoleBranding, consoleSession, one } from '../(console)/_lib/server.js';
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
		description: `Interactive Swagger explorer, OpenAPI 3.1 specifications, and SDK guides for ${PRODUCT_BRAND} products.`,
		robots: { index: true, follow: true },
	};
}

/** @param {{ searchParams: Promise<Record<string, string | string[] | undefined>> }} props */
export default async function DocsPage({ searchParams }) {
	await connection();
	const q = (await searchParams) || {};
	const session = await consoleSession();
	const [branding, api] = await Promise.all([consoleBranding(), consoleApi()]);
	const loaded = await loadDocsHub(api);
	const initialProduct = one(q.product) || '';
	const initialOp = one(q.op) || '';
	const initialSection = one(q.section) || (initialProduct ? 'products' : 'quickstart');
	const initialToken = one(q.token) || '';
	const initialWebsite = one(q.website) || '';
	const productDetail = initialProduct ? await loadDocsProduct(api, initialProduct) : null;
	const brandName = branding?.name || PRODUCT_BRAND;

	return (
		<div className="shelfway-site flex min-h-screen flex-col bg-transparent text-fg font-sans">
			<div className="wash" aria-hidden="true" />
			<div className="grid-hard" aria-hidden="true" />
			<SiteHeader brandName={brandName} session={session.ok ? session : null} />
			<main className="flex-1">
				<DocsHubView
					branding={branding}
					items={loaded.ok ? loaded.items : []}
					activeProductDetail={productDetail?.ok ? productDetail.product : null}
					actor={
						session.ok ? session.me || session.actor || (session.admin ? { role: 'owner', name: 'Admin' } : null) : null
					}
					initialProductId={initialProduct}
					initialOpKey={initialOp}
					initialSection={initialSection}
					initialToken={initialToken}
					initialWebsite={initialWebsite}
				/>
			</main>
			<SiteFooter brandName={brandName} companyName={COMPANY_NAME} session={session.ok ? session : null} />
		</div>
	);
}
