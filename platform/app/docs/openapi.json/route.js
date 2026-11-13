import { getPlatform } from '../../../src/runtime.js';

export const dynamic = 'force-dynamic';

export async function GET() {
	const portal = await getPlatform();
	const catalog = portal.modules.catalog;
	const spec = await catalog.catalogOpenapi();
	return new Response(JSON.stringify(spec), {
		status: 200,
		headers: {
			'content-type': 'application/json',
			'cache-control': 'public, max-age=60',
		},
	});
}
