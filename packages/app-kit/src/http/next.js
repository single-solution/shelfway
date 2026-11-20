/**
 * Next.js App Router adapter. In the product's catch-all `app/api/[...path]/route.js`:
 *
 *   export const { GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS } = toNextRoute(product.handler(routes), { after });
 *
 * with `after` from `next/server`, so the kit's work after a response (reports, business.json, activity copies) runs
 * after it. A leading `/api` is stripped, so routes are declared as `/v1/...`, `/sso`, `/.well-known/...` and
 * `/widget.js` while rewrites send them to `/api/...`.
 * @module
 */
import { createLogger } from '@shelfway/net';
import { configFromEnv } from '../config.js';
import { rememberScheduler } from './handler.js';

/** The prefix Next.js rewrites put before every kit and product route. */
const PREFIX = '/api';

/**
 * @param {Request} request
 * @returns {Request}
 */
const stripPrefix = (request) => {
	const url = new URL(request.url);
	if (url.pathname !== PREFIX && !url.pathname.startsWith(`${PREFIX}/`)) return request;
	url.pathname = url.pathname.slice(PREFIX.length) || '/';
	const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
	return new Request(url, {
		method: request.method,
		headers: request.headers,
		...(hasBody ? { body: request.body, duplex: 'half' } : {}),
		redirect: request.redirect,
		signal: request.signal,
	});
};

/**
 * @param {(request: Request) => Promise<Response>} handler
 * @param {{ after?: (task: () => Promise<unknown>) => void }} [options] `after` = the framework's post-response
 *   scheduler (Next.js `after`)
 * @returns {Record<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS', (request: Request, context?: unknown) => Promise<Response>>}
 */
export const toNextRoute = (handler, { after } = {}) => {
	/** @param {Request} request */
	const route = (request) => {
		const target = stripPrefix(request);
		if (typeof after === 'function') rememberScheduler(target, after);
		return handler(target);
	};
	return Object.freeze({ GET: route, POST: route, PUT: route, PATCH: route, DELETE: route, HEAD: route, OPTIONS: route });
};

/**
 * Creates Next.js App Router route handlers for a product instance.
 * @param {{
 *   createProductInstance: (options: { config: any, problems: any, logger: any }) => any,
 *   createRoutes: (product: any) => any,
 *   after?: (task: () => Promise<unknown>) => void,
 * }} options
 * @returns {Record<'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS', (request: Request, context?: unknown) => Promise<Response>>}
 */
export const createProductApiRoute = ({ createProductInstance, createRoutes, after }) => {
	const { config, problems } = configFromEnv();
	const product = createProductInstance({ config, problems, logger: createLogger() });
	return toNextRoute(product.handler(createRoutes(product)), { after });
};
