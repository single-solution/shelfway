import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { staticSecurityHeaders } from '@shelfway/net';
import { API_CSP } from './src/infra/security-headers.js';

const here = dirname(fileURLToPath(import.meta.url));
// inside the Shelfway monorepo the workspace packages are linked from its root; extracted, the project is the root
const monorepo = resolve(here, '..');
const root = existsSync(resolve(monorepo, 'pnpm-workspace.yaml')) ? monorepo : here;

/** @type {import('next').NextConfig} */
const config = {
	poweredByHeader: false,
	reactStrictMode: true,
	images: { unoptimized: true },
	// `next dev` would write AGENTS.md / CLAUDE.md into the project when it detects a coding agent
	agentRules: false,
	outputFileTracingRoot: root,
	turbopack: { root },
	serverExternalPackages: ['mongodb'],
	// the UI library ships untranspiled JSX in .js files
	transpilePackages: ['@shelfway/ui'],
	// One route handler (app/api/[...path]) serves every server path; the public paths stay as they are. Checked before
	// the console's catch-all page, which owns every other path.
	rewrites: async () => ({
		beforeFiles: [
			{ source: '/docs/:productId/openapi.json', destination: '/api/v1/docs/:productId/openapi.json' },
			{ source: '/docs/openapi.json', destination: '/api/v1/docs/openapi.json' },
			...['/v1/:path*', '/branding/logo', '/.well-known/jwks.json'].map((source) => ({
				source,
				destination: `/api${source}`,
			})),
		],
	}),
	redirects: async () => [
		{ source: '/admin', destination: '/dashboard', permanent: false },
		{ source: '/admin/:path*', destination: '/dashboard/:path*', permanent: false },
		{ source: '/overview', destination: '/dashboard', permanent: false },
		{ source: '/websites', destination: '/dashboard/websites', permanent: false },
		{ source: '/websites/:path*', destination: '/dashboard/websites/:path*', permanent: false },
		{ source: '/credits', destination: '/dashboard/finance', permanent: false },
		{ source: '/credits/:path*', destination: '/dashboard/finance', permanent: false },
		{ source: '/account', destination: '/dashboard/account', permanent: false },
		{ source: '/account/:path*', destination: '/dashboard/account', permanent: false },
		{ source: '/login', destination: '/?auth=1', permanent: false },
		{ source: '/forgot-password', destination: '/?auth=forgot', permanent: false },
		{ source: '/reset-password', destination: '/?auth=reset', permanent: false },
		{ source: '/set-password', destination: '/?auth=setup', permanent: false },
		{ source: '/confirm-email', destination: '/?auth=confirm', permanent: false },
		{ source: '/shared-setup', destination: '/dashboard', permanent: false },
	],
	// `/` is the public marketing site (app/page.js). Signed-in users are sent to /dashboard from that page.
	headers: async () => [
		{ source: '/:path*', headers: staticSecurityHeaders() },
		{ source: '/api/:path*', headers: [{ key: 'Content-Security-Policy', value: API_CSP }] },
		{ source: '/v1/:path*', headers: [{ key: 'Content-Security-Policy', value: API_CSP }] },
		{ source: '/.well-known/:path*', headers: [{ key: 'Content-Security-Policy', value: API_CSP }] },
		{ source: '/docs/:path*.json', headers: [{ key: 'Content-Security-Policy', value: API_CSP }] },
	],
};

export default config;
