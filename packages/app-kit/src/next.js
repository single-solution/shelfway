/**
 * Next.js configuration builder for Shelfway micro-products (PLAN 0.4.3).
 * Centralizes the monorepo root discovery, Turbopack root, MongoDB externals, UI transpilation,
 * dashboard frame-denial security headers, and API route rewrites.
 * @module
 */
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dashboardHeaders } from './http/headers.js';

/**
 * Defines standard Next.js configuration for a Shelfway micro-product.
 * @param {{
 *   here?: string | URL,
 *   extraRewrites?: readonly string[],
 * }} [options]
 * @returns {Record<string, any>}
 */
export const defineProductNextConfig = ({ here = '', extraRewrites = [] } = {}) => {
	const dir =
		typeof here === 'string' && here.startsWith('file:')
			? fileURLToPath(here)
			: typeof here === 'object' && here instanceof URL
				? fileURLToPath(here)
				: String(here ?? '');
	const productDir = dirname(dir);
	const monorepo = resolve(productDir, '../..');
	const root = existsSync(resolve(monorepo, 'pnpm-workspace.yaml')) ? monorepo : productDir;
	const standardRewrites = [
		'/.well-known/:path*',
		'/sso',
		'/widget.js',
		'/docs',
		'/openapi.json',
		...extraRewrites,
		'/v1/:path*',
	];

	return {
		poweredByHeader: false,
		reactStrictMode: true,
		images: { unoptimized: true },
		agentRules: false,
		outputFileTracingRoot: root,
		turbopack: { root },
		serverExternalPackages: ['mongodb'],
		transpilePackages: ['@shelfway/ui'],
		headers: async () => dashboardHeaders(),
		async rewrites() {
			return standardRewrites.map((source) => ({
				source,
				destination: `/api${source}`,
			}));
		},
	};
};
