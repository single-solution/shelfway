/**
 * Next.js config for Chat. The product serves its API through standard rewrites and the dashboard page.
 */
import { defineProductNextConfig } from '@shelfway/config/next';

export default defineProductNextConfig({
	here: import.meta.url,
});
