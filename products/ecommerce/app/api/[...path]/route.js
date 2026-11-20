/**
 * The product's API function: every kit route (`/.well-known/shelfway-connect`, `/.well-known/shelfway-events`, `/sso`,
 * `/openapi.json`, `/v1/tickets`, `/v1/data-rights/*`, `/v1/dashboard/*`) and every product route (`/widget.js`,
 * `/docs`, `/v1/*`), reached through the rewrites in next.config.js. The kit strips the `/api` prefix and finishes its work after the
 * response with Next.js `after`.
 */
import { after } from 'next/server.js';
import { createProductApiRoute } from '@shelfway/app-kit';
import { createProductInstance } from '../../../server/adapters/product.js';
import { createRoutes } from '../../../server/routes.js';

export const dynamic = 'force-dynamic';
export const { GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS } = createProductApiRoute({
	createProductInstance,
	createRoutes,
	after,
});
