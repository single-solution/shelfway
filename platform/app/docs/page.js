import { connection } from 'next/server';
import { consoleApi, consoleBranding, one } from '../(console)/_lib/server.js';
import { platformSession } from '../_lib/server.js';
import { loadDocsHub } from '../../src/console/loaders.js';
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
	const [session, branding, docsData] = await Promise.all([
		platformSession().catch(() => ({ ok: false })),
		consoleBranding().catch(() => null),
		api ? loadDocsHub(api).catch(() => ({ ok: false })) : Promise.resolve({ ok: false }),
	]);
	const items = docsData?.ok && Array.isArray(docsData.items) ? docsData.items : [];
	const initialProduct = one(q.product) || '';
	const initialOp = one(q.op) || '';
	const initialView = one(q.view) === 'product' || one(q.section)?.startsWith('sdk-') ? 'product' : 'store';
	const initialSection = one(q.section) || '';
	const initialToken = one(q.token) || '';
	const initialWebsite = one(q.website) || '';
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
							? session.actor || session.me || (session.admin ? { role: 'owner', name: 'Admin', admin: true } : null)
							: null
					}
					initialProductId={initialProduct}
					initialOpKey={initialOp}
					initialView={initialView}
					initialSection={initialSection}
					initialToken={initialToken}
					initialWebsite={initialWebsite}
				/>
			</main>
			<SiteFooter brandName={brandName} companyName={COMPANY_NAME} session={session?.ok ? session : null} />
		</div>
	);
}
