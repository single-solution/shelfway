import { redirect } from 'next/navigation.js';

export const dynamic = 'force-dynamic';

/**
 * Single-page docs architecture: redirect product routes to the unified `/docs?product=...` hub,
 * preserving all incoming query parameters (such as token, website, op, etc.).
 * @param {{ params: Promise<{ productId: string }>, searchParams: Promise<Record<string, string | string[] | undefined>> }} props
 */
export default async function DocsProductPage({ params, searchParams }) {
	const { productId } = await params;
	const resolvedSearchParams = searchParams ? await searchParams : {};
	const qs = new URLSearchParams();
	qs.set('product', productId);
	for (const [key, val] of Object.entries(resolvedSearchParams)) {
		if (key !== 'product' && val !== undefined) {
			if (Array.isArray(val)) {
				for (const item of val) qs.append(key, item);
			} else {
				qs.set(key, val);
			}
		}
	}
	redirect(`/docs?${qs.toString()}`);
}
