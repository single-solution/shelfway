import { connection } from 'next/server';
import { notFound } from 'next/navigation.js';
import { consoleApi, consoleBranding, consoleSession } from '../../../(console)/_lib/server.js';
import { loadDocsHub, loadDocsProduct } from '../../../../src/console/loaders.js';
import { DocsHubView } from '../../../../src/console/views/docs.js';
import { SiteFooter, SiteHeader } from '../../_components/SiteNav.js';
import { COMPANY_NAME, PRODUCT_BRAND } from '../../_components/brand.js';

export const dynamic = 'force-dynamic';

/** @param {{ params: Promise<{ productId: string }> }} props */
export async function generateMetadata({ params }) {
	const { productId } = await params;
	return {
		title: `${productId} Documentation - ${PRODUCT_BRAND}`,
		description: `Developer documentation, guides, and OpenAPI spec for ${productId}.`,
		robots: { index: true, follow: true },
	};
}

/** @param {{ params: Promise<{ productId: string }> }} props */
export default async function DocsProductPage({ params }) {
	await connection();
	const { productId } = await params;
	const session = await consoleSession();
	const [branding, api] = await Promise.all([consoleBranding(), consoleApi()]);
	const [loaded, productDetail] = await Promise.all([loadDocsHub(api), loadDocsProduct(api, productId)]);

	if (!productDetail.ok && productDetail.status === 404) {
		notFound();
	}

	const brandName = branding?.name || PRODUCT_BRAND;

	return (
		<div className="flex min-h-screen flex-col">
			<SiteHeader brandName={brandName} session={session.ok ? session : null} />
			<main className="flex-1">
				<DocsHubView
					branding={branding}
					items={loaded.ok ? loaded.items : []}
					activeProductDetail={productDetail.ok ? productDetail.product : null}
					actor={
						session.ok ? session.me || session.actor || (session.admin ? { role: 'owner', name: 'Admin' } : null) : null
					}
					initialProductId={productId}
				/>
			</main>
			<SiteFooter brandName={brandName} companyName={COMPANY_NAME} session={session.ok ? session : null} />
		</div>
	);
}
