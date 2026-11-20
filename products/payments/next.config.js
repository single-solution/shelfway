/**
 * Next.js config for Payments. The product serves its API through standard rewrites and the dashboard page.
 */
import { defineProductNextConfig } from '@shelfway/config/next';

export default defineProductNextConfig({
	here: import.meta.url,
	extraRewrites: ['/pay.js', '/pay/:path*', '/l/:path*', '/return/:path*'],
});
