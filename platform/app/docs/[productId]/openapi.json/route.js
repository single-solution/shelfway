import { getPlatform } from '../../../../src/runtime.js';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
	const { productId } = await params;
	const portal = await getPlatform();
	const catalog = portal.modules.catalog;
	const spec = await catalog.productOpenapi(productId);
	if (!spec) {
		return new Response(JSON.stringify({ status: 404, title: 'Not Found', detail: 'Product openapi not found.' }), {
			status: 404,
			headers: { 'content-type': 'application/json' },
		});
	}
	return new Response(JSON.stringify(spec), {
		status: 200,
		headers: {
			'content-type': 'application/json',
			'cache-control': 'public, max-age=60',
		},
	});
}
