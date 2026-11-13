'use client';
/**
 * Documentation Hub view: unified single-page API explorer with a sticky sidebar,
 * full Swagger / OpenAPI 3.1 interactive inspection, query parameter deep-linking,
 * role-based visibility, and client/server token integration guides.
 * Grounded 100% in the website theme with frosted glass and geometric offset teal shadows.
 * @module
 */
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, ButtonLink, CodeBlock, Icon, Input, ToastProvider, copyText } from '@shelfway/ui';
import { apiFetch } from '../client.js';

/**
 * @typedef {object} DocCatalogProduct
 * @property {string} productId
 * @property {string} name
 * @property {string} version
 * @property {string} description
 * @property {'active' | 'inactive'} [status]
 * @property {Array<{ key: string, name: string, description?: string }>} [features]
 * @property {{ database?: boolean, storage?: 'none' | 'optional' | 'required' }} [needs]
 * @property {{ offers: any[], needs: any[] }} [links]
 * @property {string | null} [widgetScriptUrl]
 * @property {'async' | 'blocking'} [widgetScriptLoading]
 * @property {string} [docsUrl]
 * @property {string} [openapiUrl]
 * @property {any} [guide]
 * @property {any[]} [operations]
 * @property {any} [components]
 */

/**
 * Generate a clean sample JSON payload from a JSON schema object.
 * Protects against cyclic $ref structures with depth limit and visited set.
 * @param {any} schema
 * @param {any} [components]
 * @param {number} [depth]
 * @param {Set<any>} [visited]
 * @returns {any}
 */
export function sampleFromSchema(schema, components, depth = 0, visited = new Set()) {
	if (!schema || typeof schema !== 'object' || depth > 6 || visited.has(schema)) return null;
	visited.add(schema);
	try {
		if (schema.$ref && typeof schema.$ref === 'string') {
			const refName = schema.$ref.replace('#/components/schemas/', '');
			const resolved = components?.schemas?.[refName];
			if (resolved) return sampleFromSchema(resolved, components, depth + 1, visited);
			return {};
		}
		if (schema.example !== undefined) return schema.example;
		if (schema.default !== undefined) return schema.default;
		if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
			return sampleFromSchema(schema.oneOf[0], components, depth + 1, visited);
		}
		if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
			return sampleFromSchema(schema.anyOf[0], components, depth + 1, visited);
		}
		if (Array.isArray(schema.allOf) && schema.allOf.length > 0) {
			/** @type {Record<string, any>} */
			const merged = {};
			for (const part of schema.allOf) {
				const sample = sampleFromSchema(part, components, depth + 1, visited);
				if (sample && typeof sample === 'object' && !Array.isArray(sample)) {
					Object.assign(merged, sample);
				}
			}
			return merged;
		}
		if (schema.type === 'object' || schema.properties) {
			/** @type {Record<string, any>} */
			const result = {};
			for (const [key, prop] of Object.entries(schema.properties || {})) {
				result[key] = sampleFromSchema(prop, components, depth + 1, visited);
			}
			return result;
		}
		if (schema.type === 'array') {
			return [sampleFromSchema(schema.items || {}, components, depth + 1, visited)];
		}
		if (schema.type === 'string') {
			if (schema.enum && schema.enum.length > 0) return schema.enum[0];
			if (schema.format === 'email') return 'user@example.com';
			if (schema.format === 'date-time') return '2026-11-03T12:00:00.000Z';
			if (schema.format === 'uri' || schema.format === 'url') return 'https://example.com';
			return schema.description ? schema.description.slice(0, 32) : 'string';
		}
		if (schema.type === 'integer' || schema.type === 'number') {
			return schema.minimum !== undefined ? schema.minimum : 1;
		}
		if (schema.type === 'boolean') {
			return true;
		}
		return {};
	} finally {
		visited.delete(schema);
	}
}

/**
 * HTTP method badge styling helper matching website theme colors.
 * @param {string} method
 */
function methodColor(method) {
	const m = String(method).toUpperCase();
	switch (m) {
		case 'GET':
			return 'bg-info-soft text-on-info-soft border border-info/30';
		case 'POST':
			return 'bg-success-soft text-on-success-soft border border-success/30';
		case 'PUT':
			return 'bg-warning-soft text-on-warning-soft border border-warning/30';
		case 'PATCH':
			return 'bg-attention-soft text-on-attention-soft border border-attention/30';
		case 'DELETE':
			return 'bg-danger-soft text-on-danger-soft border border-danger/30';
		default:
			return 'bg-surface-2 text-muted border border-line';
	}
}

const STATIC_SDK_GUIDES = [
	{
		id: 'cli',
		title: 'CLI Reference (@shelfway/cli)',
		summary: 'Standalone commands for bootstrapping, validating, and testing products outside this monorepo.',
		commands: [
			{
				cmd: 'npx @shelfway/cli app init <id> --name "<name>"',
				desc: 'Create a standalone product workspace conforming to the product standard.',
			},
			{
				cmd: 'npx @shelfway/cli app validate',
				desc: 'Enforce standard routes, manifest validation, schema compliance, and configure vs operate separation.',
			},
		],
	},
	{
		id: 'app-kit',
		title: 'App-Kit Framework (@shelfway/app-kit)',
		summary: 'Standard micro-framework for product backends: handlers, storage adapters, widgets, and tickets.',
		points: [
			'createAppRoutes: standard dispatch for /v1/* endpoints',
			'createMongoStorage: multi-tenant collection isolation per website',
			'Tickets: 15-minute cryptographically signed staff sessions',
			'Configure vs Operate: configuration dashboard cookies strictly denied from live records',
		],
	},
	{
		id: 'protocol',
		title: 'Inter-Service Protocol & Handshake',
		summary: 'Contract specifications for how platform discovers and connects products.',
		points: [
			'POST /v1/connect: one-time registration handshake exchanging public JWK, manifest, and pricing',
			'POST /v1/launch: step-up verified SSO launch token for merchant configure dashboard',
			'GET /v1/health: health check and readiness probe',
			'OpenAPI 3.1: auto-discovered /openapi.json specification for docs hub aggregation',
		],
	},
];

/** Universal product catalogue specifications (not tied to dynamic merchant site placements). */
const UNIVERSAL_PRODUCTS = [
	{
		productId: 'accounts',
		name: 'Accounts',
		version: '1.0.0',
		description: 'Visitor authentication, shopper profiles, staff access, and member accounts.',
		status: 'active',
		features: [
			{ key: 'auth', name: 'Member Sign-In', description: 'Shopper sign-in and session verification.' },
			{ key: 'staff', name: 'Staff Management', description: 'Invite and manage team members and roles.' },
		],
		needs: { database: true, storage: 'none' },
		links: { offers: [], needs: [] },
		docsUrl: '/docs/accounts',
		openapiUrl: '/docs/accounts/openapi.json',
		operations: [
			{
				method: 'POST',
				path: '/v1/auth/sign-in',
				summary: 'Request shopper sign-in code',
				auth: 'browser',
				permission: '',
				feature: 'auth',
				description: 'Sends a one-time sign-in code to the shopper email.',
			},
			{
				method: 'POST',
				path: '/v1/auth/verify',
				summary: 'Verify code and create session',
				auth: 'browser',
				permission: '',
				feature: 'auth',
				description: 'Verifies the code and returns an authenticated customer session.',
			},
			{
				method: 'GET',
				path: '/v1/auth/session',
				summary: 'Get current customer profile',
				auth: 'browser',
				permission: '',
				feature: 'auth',
				description: 'Returns the current signed-in customer profile.',
			},
			{
				method: 'GET',
				path: '/v1/users',
				summary: 'List customer accounts',
				auth: 'server',
				permission: 'users.read',
				feature: 'staff',
				description: 'Search and list customer accounts on this website.',
			},
			{
				method: 'POST',
				path: '/v1/staff/invites',
				summary: 'Invite staff member',
				auth: 'server',
				permission: 'staff.write',
				feature: 'staff',
				description: 'Send an invitation to a new staff member with assigned role.',
			},
		],
	},
	{
		productId: 'chat',
		name: 'Chat',
		version: '1.0.0',
		description: 'Real-time visitor chat, AI replies, and staff operator inbox.',
		status: 'active',
		features: [
			{ key: 'ai', name: 'AI Assistant', description: 'Answers customer questions automatically.' },
			{ key: 'inbox', name: 'Operator Inbox', description: 'Staff live response desk.' },
		],
		needs: { database: true, storage: 'optional' },
		links: { offers: [], needs: [] },
		docsUrl: '/docs/chat',
		openapiUrl: '/docs/chat/openapi.json',
		operations: [
			{
				method: 'POST',
				path: '/v1/conversations',
				summary: 'Start visitor chat conversation',
				auth: 'browser',
				permission: '',
				feature: 'always',
				description: 'Initiate a new live conversation from the storefront widget.',
			},
			{
				method: 'GET',
				path: '/v1/messages',
				summary: 'List chat messages for visitor',
				auth: 'browser',
				permission: '',
				feature: 'always',
				description: 'Fetch message history for the active visitor session.',
			},
			{
				method: 'POST',
				path: '/v1/messages',
				summary: 'Send a message',
				auth: 'browser',
				permission: '',
				feature: 'always',
				description: 'Post a chat message to a conversation.',
			},
			{
				method: 'GET',
				path: '/v1/inbox',
				summary: 'List active conversations for operator',
				auth: 'server',
				permission: 'chat.read',
				feature: 'inbox',
				description: 'Returns active chat conversations for the merchant operator desk.',
			},
			{
				method: 'POST',
				path: '/v1/conversations/:id/reply',
				summary: 'Operator reply to conversation',
				auth: 'server',
				permission: 'chat.write',
				feature: 'inbox',
				description: 'Send a staff reply to an ongoing customer conversation.',
			},
		],
	},
	{
		productId: 'ecommerce',
		name: 'Ecommerce',
		version: '1.0.0',
		description: 'Catalog, shopping cart, checkout flow, orders, and returns.',
		status: 'active',
		features: [
			{ key: 'cart', name: 'Cart & Checkout', description: 'Storefront cart and order checkout.' },
			{ key: 'orders', name: 'Order Management', description: 'Fulfillment, shipping, and returns.' },
		],
		needs: { database: true, storage: 'none' },
		links: { offers: [], needs: [] },
		docsUrl: '/docs/ecommerce',
		openapiUrl: '/docs/ecommerce/openapi.json',
		operations: [
			{
				method: 'GET',
				path: '/v1/catalog',
				summary: 'Browse store catalog products',
				auth: 'browser',
				permission: '',
				feature: 'cart',
				description: 'Returns published store products and category listings.',
			},
			{
				method: 'GET',
				path: '/v1/cart',
				summary: 'Get shopper cart items',
				auth: 'browser',
				permission: '',
				feature: 'cart',
				description: 'Retrieves current items and calculated totals in visitor cart.',
			},
			{
				method: 'POST',
				path: '/v1/cart/items',
				summary: 'Add item to shopping cart',
				auth: 'browser',
				permission: '',
				feature: 'cart',
				description: 'Adds an item variant or updates quantity in shopper cart.',
			},
			{
				method: 'POST',
				path: '/v1/checkout',
				summary: 'Initiate order checkout',
				auth: 'browser',
				permission: '',
				feature: 'cart',
				description: 'Submits visitor cart and begins the checkout sequence.',
			},
			{
				method: 'GET',
				path: '/v1/orders',
				summary: 'List store orders',
				auth: 'server',
				permission: 'orders.read',
				feature: 'orders',
				description: 'List merchant store orders with fulfillment and payment statuses.',
			},
			{
				method: 'POST',
				path: '/v1/orders/:id/fulfill',
				summary: 'Fulfill customer order',
				auth: 'server',
				permission: 'orders.write',
				feature: 'orders',
				description: 'Record fulfillment and courier tracking for an order.',
			},
		],
	},
	{
		productId: 'payments',
		name: 'Payments',
		version: '1.0.0',
		description: 'Collect payments, wallets, payment links, and proof verification.',
		status: 'active',
		features: [
			{ key: 'checkout', name: 'Payment Flow', description: 'Storefront payment sessions.' },
			{ key: 'review', name: 'Proof Review', description: 'Manual payment proof review.' },
		],
		needs: { database: true, storage: 'optional' },
		links: { offers: [], needs: [] },
		docsUrl: '/docs/payments',
		openapiUrl: '/docs/payments/openapi.json',
		operations: [
			{
				method: 'POST',
				path: '/v1/sessions',
				summary: 'Create payment session',
				auth: 'browser',
				permission: '',
				feature: 'checkout',
				description: 'Creates a payment session with available payment gateways.',
			},
			{
				method: 'GET',
				path: '/v1/methods',
				summary: 'List available payment methods',
				auth: 'browser',
				permission: '',
				feature: 'checkout',
				description: 'Returns available payment providers for this website.',
			},
			{
				method: 'GET',
				path: '/v1/transactions',
				summary: 'Ledger of transactions',
				auth: 'server',
				permission: 'payments.read',
				feature: 'review',
				description: 'List all payment transactions and settlement records.',
			},
		],
	},
	{
		productId: 'notifications',
		name: 'Notifications',
		version: '1.0.0',
		description: 'Multi-channel notifications via WhatsApp, SMS, email, and push.',
		status: 'active',
		features: [
			{ key: 'push', name: 'Push Delivery', description: 'Visitor push notification registration.' },
			{ key: 'dispatch', name: 'Outbound Messaging', description: 'Server-to-person notifications.' },
		],
		needs: { database: true, storage: 'none' },
		links: { offers: [], needs: [] },
		docsUrl: '/docs/notifications',
		openapiUrl: '/docs/notifications/openapi.json',
		operations: [
			{
				method: 'POST',
				path: '/v1/tokens',
				summary: 'Register visitor device for push',
				auth: 'browser',
				permission: '',
				feature: 'push',
				description: 'Saves device push token for visitor notifications.',
			},
			{
				method: 'POST',
				path: '/v1/messages',
				summary: 'Dispatch notification message',
				auth: 'server',
				permission: 'notifications.send',
				feature: 'dispatch',
				description: 'Send SMS, WhatsApp, Email, or Web Push notification.',
			},
		],
	},
	{
		productId: 'growth',
		name: 'Growth',
		version: '1.0.0',
		description: 'Cookie consent banner, SEO tags, and site event measurement.',
		status: 'active',
		features: [
			{ key: 'consent', name: 'Cookie Consent', description: 'Visitor consent preferences.' },
			{ key: 'analytics', name: 'Site Analytics', description: 'Measurement and page views.' },
		],
		needs: { database: true, storage: 'none' },
		links: { offers: [], needs: [] },
		docsUrl: '/docs/growth',
		openapiUrl: '/docs/growth/openapi.json',
		operations: [
			{
				method: 'POST',
				path: '/v1/consent',
				summary: 'Save visitor cookie consent preferences',
				auth: 'browser',
				permission: '',
				feature: 'consent',
				description: 'Records visitor consent categories for analytics and tracking.',
			},
			{
				method: 'POST',
				path: '/v1/events',
				summary: 'Record visitor conversion event',
				auth: 'browser',
				permission: '',
				feature: 'analytics',
				description: 'Reports storefront conversion or custom visitor action.',
			},
			{
				method: 'GET',
				path: '/v1/analytics',
				summary: 'Query site analytics metrics',
				auth: 'server',
				permission: 'growth.read',
				feature: 'analytics',
				description: 'Retrieve aggregated page views, visitors, and conversion metrics.',
			},
		],
	},
];

/**
 * @param {{
 *   branding?: { name: string, accent?: string, logoUrl?: string | null },
 *   items?: DocCatalogProduct[],
 *   activeProductDetail?: any,
 *   actor?: any,
 *   initialProductId?: string,
 *   initialOpKey?: string,
 *   initialView?: string,
 *   initialSection?: string,
 *   initialToken?: string,
 *   initialWebsite?: string,
 *   initialProductDetails?: Record<string, any>,
 * }} props
 */
export function DocsHubView({
	branding,
	items = [],
	actor = null,
	initialProductId = '',
	initialOpKey = '',
	initialView = 'store',
	initialSection = '',
	initialToken = '',
	initialWebsite = '',
	initialProductDetails = {},
}) {
	const brandName = branding?.name || 'Shelfway';
	const [activeSection, setActiveSection] = useState(
		initialSection ||
			(initialProductId
				? 'products'
				: initialView === 'product' || initialSection?.startsWith('sdk-')
					? 'sdk-cli'
					: 'quickstart'),
	);
	const [selectedProductId, setSelectedProductId] = useState(initialProductId || items[0]?.productId || 'chat');
	const [selectedOpKey, setSelectedOpKey] = useState(/** @type {string | null} */ (initialOpKey || null));
	const [token, setToken] = useState(initialToken || '');
	const [website, setWebsite] = useState(initialWebsite || '');
	const [tokenInput, setTokenInput] = useState('');
	const [activeSnippetTab, setActiveSnippetTab] = useState('curl');
	const [activeResponseStatus, setActiveResponseStatus] = useState('200');
	const [searchQuery, setSearchQuery] = useState('');
	const [copiedNotice, setCopiedNotice] = useState('');
	const [clientActor, setClientActor] = useState(/** @type {any} */ (null));
	const [liveCatalogItems, setLiveCatalogItems] = useState(items || []);
	const [liveProductDetails, setLiveProductDetails] = useState(/** @type {Record<string, any>} */ (initialProductDetails || {}));
	const [expandedProductIds, setExpandedProductIds] = useState(
		() => new Set(initialProductId ? [initialProductId] : [items[0]?.productId || 'chat']),
	);

	useEffect(() => {
		if (items && items.length > 0) {
			setLiveCatalogItems(items);
		}
	}, [items]);

	useEffect(() => {
		let cancelled = false;
		apiFetch('/v1/docs', { redirectOn401: false })
			.then((res) => {
				if (!cancelled && res.ok && res.data?.items?.length) {
					setLiveCatalogItems(res.data.items);
				}
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!selectedProductId) return;
		let cancelled = false;
		apiFetch(`/v1/docs/${selectedProductId}`, { redirectOn401: false })
			.then((res) => {
				if (!cancelled && res.ok && res.data?.product) {
					setLiveProductDetails((prev) => ({
						...prev,
						[selectedProductId]: res.data.product,
					}));
				}
			})
			.catch(() => {});
		return () => {
			cancelled = true;
		};
	}, [selectedProductId]);

	useEffect(() => {
		if (actor) return;
		let cancelled = false;
		apiFetch('/v1/me', { redirectOn401: false }).then(async (res) => {
			if (!cancelled && res.ok && res.data) {
				const d = res.data;
				const isAdm = d.kind === 'admin';
				const mId = d.merchant?.merchantId;
				setClientActor({
					role: isAdm ? d.admin?.role || 'owner' : d.actor?.role || 'owner',
					name: isAdm ? d.admin?.name || 'Admin' : d.actor?.name || d.merchant?.name || 'Merchant',
					admin: isAdm,
					merchantId: mId,
				});
				if (!initialToken && mId) {
					try {
						const webRes = await apiFetch(`/v1/merchants/${mId}/websites`, { redirectOn401: false });
						if (!cancelled && webRes.ok && Array.isArray(webRes.data?.items) && webRes.data.items.length > 0) {
							const firstWeb = webRes.data.items[0];
							const webDomain = firstWeb.domain || '';
							const webId = firstWeb.websiteId || firstWeb.id;
							if (webDomain) setWebsite((prev) => prev || webDomain);
							if (webId) {
								const tokRes = await apiFetch(`/v1/merchants/${mId}/websites/${webId}/tokens`, {
									redirectOn401: false,
								});
								if (!cancelled && tokRes.ok && Array.isArray(tokRes.data?.items) && tokRes.data.items.length > 0) {
									const bTok =
										tokRes.data.items.find((/** @type {any} */ t) => t.browserToken)?.browserToken ||
										tokRes.data.items[0].browserToken;
									if (bTok) {
										setToken((prev) => prev || bTok);
									}
								}
							}
						}
					} catch {
						// best effort token loading
					}
				}
			}
		});
		return () => {
			cancelled = true;
		};
	}, [actor, initialToken]);

	const effectiveActor = actor || clientActor;
	const userRole = effectiveActor?.role || (effectiveActor?.admin ? 'owner' : null);
	const isUnlocked = Boolean(token || effectiveActor);
	const isProductRoleAllowed = !userRole || ['owner', 'developer', 'support', 'admin'].includes(userRole);

	const catalogItems = useMemo(() => {
		const sourceList = liveCatalogItems && liveCatalogItems.length > 0 ? liveCatalogItems : items;
		if (sourceList && sourceList.length > 0) {
			const map = new Map();
			for (const p of UNIVERSAL_PRODUCTS) map.set(p.productId, { ...p });
			for (const item of sourceList) {
				const existing = map.get(item.productId);
				if (existing) {
					map.set(item.productId, {
						...existing,
						...item,
						operations: item.operations && item.operations.length > 0 ? item.operations : existing.operations,
					});
				} else {
					map.set(item.productId, item);
				}
			}
			return Array.from(map.values());
		}
		return UNIVERSAL_PRODUCTS;
	}, [items, liveCatalogItems]);

	// Synchronize URL query params seamlessly without page reloads
	/**
	 * @param {string | null} [pId]
	 * @param {string | null} [op]
	 * @param {string} [sec]
	 * @param {string} [tok]
	 * @param {string} [web]
	 */
	const syncUrl = (pId, op, sec, tok = token, web = website) => {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams(window.location.search);
		if (pId) params.set('product', pId);
		else params.delete('product');
		if (op) params.set('op', op);
		else params.delete('op');
		if (sec && sec !== 'products' && sec !== 'quickstart') params.set('section', sec);
		else params.delete('section');
		params.delete('view');
		if (tok) params.set('token', tok);
		else params.delete('token');
		if (web) params.set('website', web);
		else params.delete('website');
		const qs = params.toString();
		const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
		if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
			window.history.replaceState(null, '', nextUrl);
		}
	};

	/** @param {string} rawInput */
	const applyToken = (rawInput) => {
		const raw = rawInput.trim();
		if (!raw) return;
		let extractedToken = raw;
		let extractedWebsite = website;
		if (raw.includes('token=')) {
			try {
				const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
				extractedToken = url.searchParams.get('token') || raw;
				extractedWebsite = url.searchParams.get('website') || extractedWebsite;
			} catch {
				// not a parseable URL, keep raw
			}
		}
		setToken(extractedToken);
		if (extractedWebsite) setWebsite(extractedWebsite);
		setTokenInput('');
		syncUrl(selectedProductId, selectedOpKey, activeSection, extractedToken, extractedWebsite);
	};

	// Listen for browser forward/back buttons
	useEffect(() => {
		const onPopState = () => {
			const params = new URLSearchParams(window.location.search);
			const p = params.get('product') || items[0]?.productId || 'chat';
			const o = params.get('op') || null;
			const s = params.get('section') || 'products';
			const t = params.get('token') || '';
			const w = params.get('website') || '';
			setSelectedProductId(p);
			setSelectedOpKey(o);
			setActiveSection(s);
			setToken(t);
			setWebsite(w);
		};
		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	}, [items]);

	const currentProduct = useMemo(() => {
		const baseProd = catalogItems.find((p) => p.productId === selectedProductId) || catalogItems[0] || null;
		if (!baseProd) return null;
		const liveDetail = liveProductDetails[baseProd.productId];
		if (!liveDetail) return baseProd;
		return {
			...baseProd,
			...liveDetail,
			operations: liveDetail.operations && liveDetail.operations.length > 0 ? liveDetail.operations : baseProd.operations,
		};
	}, [selectedProductId, catalogItems, liveProductDetails]);

	const operations = useMemo(() => {
		return /** @type {any[]} */ (currentProduct?.operations || []);
	}, [currentProduct]);

	const handleShareDocs = () => {
		if (typeof window === 'undefined') return;
		const url = new URL(window.location.href);
		if (!url.pathname || url.pathname === '/') {
			url.pathname = '/docs';
		}
		url.hash = '';
		if (token) url.searchParams.set('token', token);
		else url.searchParams.delete('token');
		if (website) url.searchParams.set('website', website);
		else url.searchParams.delete('website');
		if (selectedProductId) url.searchParams.set('product', selectedProductId);
		else url.searchParams.delete('product');
		if (selectedOpKey) url.searchParams.set('op', selectedOpKey);
		else url.searchParams.delete('op');
		if (activeSection && activeSection !== 'products' && activeSection !== 'quickstart') {
			url.searchParams.set('section', activeSection);
		} else {
			url.searchParams.delete('section');
		}
		url.searchParams.delete('view');
		copyText(url.toString());
		setCopiedNotice('Copied Share Link');
		setTimeout(() => setCopiedNotice(''), 2500);
	};

	const currentOperation = useMemo(() => {
		if (!selectedOpKey) return null;
		return operations.find((/** @type {any} */ op) => `${op.method}:${op.path}` === selectedOpKey) || null;
	}, [operations, selectedOpKey]);

	const sampleRequestPayload = useMemo(() => {
		const reqSchema = currentOperation?.requestBody?.content?.['application/json']?.schema;
		return reqSchema ? sampleFromSchema(reqSchema, currentProduct?.components) : {};
	}, [currentOperation, currentProduct]);

	const sampleResponsePayload = useMemo(() => {
		if (!currentOperation?.responses) return null;
		const resp = currentOperation.responses[activeResponseStatus] || Object.values(currentOperation.responses)[0];
		if (!resp) return null;
		const respSchema = resp.content?.['application/json']?.schema || resp.content?.['application/problem+json']?.schema;
		return {
			description: resp.description,
			payload: respSchema
				? sampleFromSchema(respSchema, currentProduct?.components)
				: { message: resp.description || 'Success' },
		};
	}, [currentOperation, currentProduct, activeResponseStatus]);

	// Filtered operations based on search query
	const filteredOperations = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return operations;
		const prodMatches = currentProduct?.name?.toLowerCase().includes(q) || currentProduct?.productId?.toLowerCase().includes(q);
		if (prodMatches) return operations;
		return operations.filter(
			(/** @type {any} */ op) =>
				op.path.toLowerCase().includes(q) ||
				op.method.toLowerCase().includes(q) ||
				(op.summary && op.summary.toLowerCase().includes(q)) ||
				(op.description && op.description.toLowerCase().includes(q)),
		);
	}, [currentProduct, operations, searchQuery]);

	const filteredProducts = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return catalogItems;
		return catalogItems.filter((p) => {
			if (
				p.name?.toLowerCase().includes(q) ||
				p.productId?.toLowerCase().includes(q) ||
				(p.description && p.description.toLowerCase().includes(q))
			) {
				return true;
			}
			const prodDetail = liveProductDetails[p.productId];
			const ops = (prodDetail?.operations && prodDetail.operations.length > 0 ? prodDetail.operations : p.operations) || [];
			return ops.some(
				(/** @type {any} */ op) =>
					op.path?.toLowerCase().includes(q) ||
					op.method?.toLowerCase().includes(q) ||
					(op.summary && op.summary.toLowerCase().includes(q)) ||
					(op.description && op.description.toLowerCase().includes(q)),
			);
		});
	}, [catalogItems, liveProductDetails, searchQuery]);

	/** @param {string} productId */
	const selectProduct = (productId) => {
		setSelectedProductId(productId);
		setSelectedOpKey(null);
		setActiveSection('products');
		setExpandedProductIds((prev) => {
			const next = new Set(prev);
			if (next.has(productId) && selectedProductId === productId) {
				next.delete(productId);
			} else {
				next.add(productId);
			}
			return next;
		});
		syncUrl(productId, null, 'products');
	};

	/**
	 * @param {string | null} opKey
	 * @param {string} [productId]
	 */
	const selectOperation = (opKey, productId) => {
		const targetProductId = productId || selectedProductId;
		if (productId && productId !== selectedProductId) {
			setSelectedProductId(productId);
		}
		const normalizedOpKey = opKey || null;
		setSelectedOpKey(normalizedOpKey);
		setActiveSection('products');
		if (targetProductId) {
			setExpandedProductIds((prev) => new Set(prev).add(targetProductId));
		}
		syncUrl(targetProductId, normalizedOpKey, 'products');
	};

	/** @param {string} section */
	const selectSection = (section) => {
		setActiveSection(section);
		setSelectedOpKey(null);
		syncUrl(selectedProductId, null, section);
	};

	const widgetScriptUrl = currentProduct?.widgetScriptUrl || '';
	const widgetSnippet = widgetScriptUrl
		? `<!-- Embed ${currentProduct.name} Widget on your site -->\n<script\n  src="${widgetScriptUrl}"\n  data-token="${token || 'YOUR_WEBSITE_BROWSER_TOKEN'}"\n  ${currentProduct.widgetScriptLoading || 'async'}\n></script>`
		: null;

	const apiBase = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://api.shelfway.com';

	if (!isUnlocked) {
		return (
			<ToastProvider>
				<div className="docs-container flex flex-col items-center justify-center min-h-[60vh] py-12 px-4">
					<div className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-card space-y-5">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
								<Icon name="key" size={20} />
							</div>
							<div>
								<h1 className="text-base font-semibold text-fg">Documentation Access Restricted</h1>
								<p className="text-xs text-muted">Authentication Required</p>
							</div>
						</div>

						<p className="text-xs text-muted leading-relaxed">
							Shelfway universal Swagger documentation and API specifications are restricted to authenticated users. Enter
							your user unique token or setup link to access the documentation.
						</p>

						<div className="space-y-3">
							<Input
								label="User unique token"
								hideLabel
								placeholder="Paste user unique token or setup link..."
								value={tokenInput}
								onChange={(e) => setTokenInput(e.currentTarget.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter') applyToken(tokenInput);
								}}
								prefix={<Icon name="key" size={14} />}
								className="text-xs h-9"
							/>
							<Button
								type="button"
								variant="primary"
								size="md"
								className="w-full justify-center"
								disabled={!tokenInput.trim()}
								onClick={() => applyToken(tokenInput)}>
								Unlock Documentation
							</Button>
						</div>

						<div className="pt-4 border-t border-line flex items-center justify-between text-xs text-muted">
							<span>Have an account?</span>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								onClick={() => {
									if (typeof window !== 'undefined') {
										window.dispatchEvent(new CustomEvent('shelfway:open-signin', { detail: { next: null } }));
									}
								}}>
								Sign In
							</Button>
						</div>
					</div>
				</div>
			</ToastProvider>
		);
	}

	return (
		<ToastProvider>
			<div className="docs-container flex flex-col flex-1">
				{/* Two-Column Docs Explorer Layout */}
				<div className="relative z-10 flex flex-col md:flex-row gap-6 flex-1 items-start">
					{/* Left Mega-Menu Sticky Sidebar */}
					<aside className="w-full md:w-72 lg:w-80 shrink-0 rounded-card border border-line bg-surface flex flex-col md:sticky md:top-20 self-start max-h-[calc(100vh-6rem)] shadow-card overflow-hidden">
						{/* Scrollable menu body */}
						<div className="flex-1 overflow-y-auto shelfway-scroll p-4 space-y-6">
							{/* Search Bar */}
							<div>
								<Input
									label="Search endpoints or guides"
									hideLabel
									type="search"
									placeholder="Search endpoints or guides..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.currentTarget.value)}
									prefix={<Icon name="search" size={14} />}
									className="text-xs h-9 bg-surface"
								/>
							</div>

							{/* Section: Getting Started */}
							<div className="space-y-1">
								<p className="px-2 text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
									Getting Started
								</p>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => selectSection('quickstart')}
									className={`flex w-full items-center justify-start gap-2 rounded-control px-2.5 py-2 text-xs font-medium transition shelfway-motion ${
										activeSection === 'quickstart'
											? 'bg-primary/10 text-primary font-semibold shadow-xs'
											: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
									}`}>
									<Icon name="info" size={15} />
									<span>Quickstart Guide</span>
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => selectSection('tokens')}
									className={`flex w-full items-center justify-start gap-2 rounded-control px-2.5 py-2 text-xs font-medium transition shelfway-motion ${
										activeSection === 'tokens'
											? 'bg-primary/10 text-primary font-semibold shadow-xs'
											: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
									}`}>
									<Icon name="key" size={15} />
									<span>Authentication &amp; Tokens</span>
								</Button>
							</div>

							{/* Section: Catalog Products & Endpoints */}
							<div className="space-y-2">
								<div className="flex items-center justify-between px-2">
									<p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
										Storefront APIs &amp; Endpoints
									</p>
									<span className="text-[10px] text-muted font-mono">{catalogItems.length} products</span>
								</div>

								<div className="space-y-1">
									{filteredProducts.length === 0 ? (
										<div className="rounded border border-dashed border-line px-2.5 py-3 text-center space-y-1">
											<p className="text-[11px] font-medium text-fg">No products connected</p>
											{effectiveActor?.admin ? (
												<a
													href="/admin/products"
													className="text-[10px] text-primary hover:underline block font-semibold">
													+ Connect product
												</a>
											) : null}
										</div>
									) : null}
									{filteredProducts.map((prod) => {
										const isSelected = selectedProductId === prod.productId;
										const prodDetail = liveProductDetails[prod.productId];
										const prodRawOps =
											(prodDetail?.operations && prodDetail.operations.length > 0
												? prodDetail.operations
												: prod.operations) || [];
										const q = searchQuery.trim().toLowerCase();
										const prodMatches =
											prod.name?.toLowerCase().includes(q) || prod.productId?.toLowerCase().includes(q);
										const prodFilteredOps =
											q && !prodMatches
												? prodRawOps.filter(
														(/** @type {any} */ op) =>
															op.path?.toLowerCase().includes(q) ||
															op.method?.toLowerCase().includes(q) ||
															(op.summary && op.summary.toLowerCase().includes(q)) ||
															(op.description && op.description.toLowerCase().includes(q)),
													)
												: prodRawOps;
										const isExpanded =
											expandedProductIds.has(prod.productId) ||
											(Boolean(q) && (prodMatches || prodFilteredOps.length > 0));

										return (
											<div key={prod.productId} className="space-y-0.5">
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => selectProduct(prod.productId)}
													className={`flex w-full items-center justify-between rounded-control px-2.5 py-2 text-xs font-medium transition shelfway-motion ${
														isSelected && !selectedOpKey && activeSection === 'products'
															? 'bg-primary/10 text-primary font-semibold shadow-xs'
															: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
													}`}>
													<div className="flex items-center gap-2 truncate">
														<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-surface-2 font-mono text-[10px] text-primary font-bold border border-line">
															{prod.name.slice(0, 1)}
														</span>
														<span className="truncate">{prod.name}</span>
													</div>
													<div className="flex items-center gap-1.5 shrink-0">
														<span className="text-[10px] text-muted font-mono">{`v${prod.version}`}</span>
														<Icon
															name={isExpanded ? 'chevronDown' : 'chevronRight'}
															size={12}
															className="text-muted"
														/>
													</div>
												</Button>

												{/* Product operations accordion group */}
												{isExpanded ? (
													<div className="space-y-0.5 py-1">
														<Button
															type="button"
															variant="ghost"
															size="sm"
															onClick={() => selectOperation('', prod.productId)}
															className={`flex w-full items-center justify-start gap-1.5 rounded px-2.5 py-1.5 text-[11px] transition ${
																isSelected && !selectedOpKey && activeSection === 'products'
																	? 'bg-surface-2 text-primary font-semibold'
																	: 'text-muted hover:text-fg'
															}`}>
															<Icon name="info" size={13} />
															<span>Overview &amp; Embed</span>
														</Button>

														{prodFilteredOps.map((/** @type {any} */ op) => {
															const opKey = `${op.method}:${op.path}`;
															const isOpActive =
																isSelected && selectedOpKey === opKey && activeSection === 'products';
															const isStorefront = op.auth === 'browser' || op.auth === 'visitor' || !op.auth;
															const hasAccess = isStorefront || isProductRoleAllowed;
															return (
																<Button
																	key={opKey}
																	type="button"
																	variant="ghost"
																	size="sm"
																	onClick={() => selectOperation(opKey, prod.productId)}
																	className={`flex w-full items-center justify-between gap-1.5 rounded px-2.5 py-1.5 text-[11px] truncate transition ${
																		isOpActive
																			? 'bg-surface-2 text-primary font-semibold shadow-xs'
																			: 'text-muted hover:text-fg'
																	}`}
																	title={`${op.method} ${op.path}`}>
																	<div className="flex items-center gap-1.5 truncate">
																		<span
																			className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-bold ${methodColor(
																				op.method,
																			)}`}>
																			{op.method}
																		</span>
																		<span className="truncate font-mono">{op.path.replace(/^\/v1/, '')}</span>
																	</div>
																	<span
																		className={`font-mono text-[8px] px-1 rounded uppercase font-bold shrink-0 ${
																			isStorefront
																				? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
																				: hasAccess
																					? 'text-primary bg-primary/10'
																					: 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
																		}`}>
																		{isStorefront ? 'Store' : hasAccess ? 'Staff' : 'Restricted'}
																	</span>
																</Button>
															);
														})}

														{prodFilteredOps.length > 40 ? (
															<p className="px-2.5 py-1 text-[10px] text-muted italic">
																+{prodFilteredOps.length - 40} more endpoints in spec
															</p>
														) : null}
													</div>
												) : null}
											</div>
										);
									})}
								</div>
							</div>

							{/* Section: Product Developer SDK */}
							<div className="space-y-1 pt-3 border-t border-line">
								<div className="flex items-center justify-between px-2">
									<p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
										Product Developer SDK
									</p>
									<span
										className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
											isProductRoleAllowed
												? 'text-primary bg-primary/10'
												: 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
										}`}>
										{isProductRoleAllowed ? 'CORE' : 'RESTRICTED'}
									</span>
								</div>
								{STATIC_SDK_GUIDES.map((guide) => (
									<Button
										key={guide.id}
										type="button"
										variant="ghost"
										size="sm"
										onClick={() => selectSection(`sdk-${guide.id}`)}
										className={`flex w-full items-center justify-between rounded-control px-2.5 py-2 text-xs font-medium transition shelfway-motion ${
											activeSection === `sdk-${guide.id}`
												? 'bg-primary/10 text-primary font-semibold shadow-xs'
												: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
										}`}>
										<div className="flex items-center gap-2">
											<Icon name="code" size={15} />
											<span className="truncate">{guide.title.split(' ')[0]}</span>
										</div>
										<span
											className={`text-[9px] font-mono font-semibold ${
												isProductRoleAllowed ? 'text-primary' : 'text-amber-600 dark:text-amber-400'
											}`}>
											{isProductRoleAllowed ? 'Dev' : 'Restricted'}
										</span>
									</Button>
								))}
							</div>
						</div>

						{/* Fixed Footer in Sidebar with Share Button */}
						<div className="p-3 border-t border-line mt-auto shrink-0 bg-surface">
							<Button
								type="button"
								size="sm"
								variant="primary"
								className="w-full justify-center"
								onClick={handleShareDocs}
								icon={<Icon name={copiedNotice === 'Copied Share Link' ? 'check' : 'link'} size={14} />}>
								{copiedNotice === 'Copied Share Link' ? 'Copied Share Link!' : 'Share Docs'}
							</Button>
						</div>
					</aside>

					{/* Right Content Area: Interactive Swagger & Guides */}
					<div className="flex-1 min-w-0 w-full space-y-8">
						{/* Detail Header Container */}
						<div className="rounded-card border border-primary/30 bg-primary/5 p-4 shadow-card">
							<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
								<div className="space-y-1.5 flex-1 min-w-0">
									{activeSection === 'products' && currentOperation ? (
										<>
											<div className="flex flex-wrap items-center gap-2.5">
												<span
													className={`font-mono text-xs px-2.5 py-1 rounded font-bold ${methodColor(
														currentOperation.method,
													)}`}>
													{currentOperation.method}
												</span>
												<code className="font-mono text-base font-semibold text-fg">{currentOperation.path}</code>
												{currentOperation.permission ? (
													<span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary font-semibold">
														Perm: {currentOperation.permission}
													</span>
												) : null}
												{effectiveActor ? (
													<span className="font-mono text-[11px] text-muted px-2 py-0.5 rounded bg-surface border border-line">
														{effectiveActor.name} (Role: {userRole || 'user'})
													</span>
												) : !website ? (
													<span className="font-mono text-[11px] text-muted px-2 py-0.5 rounded bg-surface border border-line">
														User Token
													</span>
												) : null}
												{website ? (
													<span className="font-mono text-[11px] text-muted px-2 py-0.5 rounded bg-surface border border-line">
														{website}
													</span>
												) : null}
											</div>
											{currentOperation.summary ? (
												<h1 className="text-lg font-bold text-fg tracking-tight">{currentOperation.summary}</h1>
											) : null}
											{currentOperation.description ? (
												<p className="text-xs text-muted leading-relaxed">{currentOperation.description}</p>
											) : null}
										</>
									) : (
										<>
											<div className="flex flex-wrap items-center gap-2">
												<span className="text-xs font-semibold text-fg tracking-tight">
													{brandName} Documentation Hub
												</span>
												<span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface border border-line text-fg">
													{effectiveActor
														? `${effectiveActor.name} (Role: ${userRole || 'user'})`
														: website || 'User Token'}
												</span>
												{website && effectiveActor ? (
													<span className="font-mono text-xs text-muted px-2 py-0.5 rounded bg-surface border border-line">
														{website}
													</span>
												) : null}
											</div>
											<p className="text-xs text-muted">
												Interactive code snippets below are pre-filled with your scoped credentials.
											</p>
										</>
									)}
								</div>
							</div>
						</div>
						{/* Role Restricted Banner when accessing restricted SDK guides without permissions */}
						{activeSection.startsWith('sdk-') && !isProductRoleAllowed ? (
							<div className="rounded-card border border-warning/40 bg-surface p-6 space-y-3 shadow-card">
								<div className="flex items-center gap-2 text-warning font-semibold text-sm">
									<Icon name="shield" size={18} />
									<span>Role Restricted Access</span>
								</div>
								<p className="text-xs text-muted leading-relaxed">
									Product integration APIs and developer tools require <strong>Developer</strong> or{' '}
									<strong>Owner</strong> privileges. Your current role is{' '}
									<code className="font-mono text-fg">{userRole}</code>.
								</p>
								<div className="pt-2">
									<Button
										size="sm"
										variant="secondary"
										onClick={() => {
											selectSection('quickstart');
										}}>
										Back to Quickstart
									</Button>
								</div>
							</div>
						) : null}

						{/* 1. Quickstart Section */}
						{activeSection === 'quickstart' ? (
							<section className="space-y-6">
								<div className="space-y-2">
									<p className="font-mono text-xs font-bold tracking-widest uppercase text-primary">
										STOREFRONT &amp; BUILDER GUIDE
									</p>
									<h1 className="font-display text-3xl font-bold tracking-tight text-fg">Quickstart Guide</h1>
									<p className="text-sm text-muted leading-relaxed max-w-3xl">
										Shelfway connects modular products (Accounts, Notifications, Chat, Payments, Ecommerce, Growth) to
										merchants' websites. Storefront builders connect directly to our public widget scripts and backend
										REST APIs using credentials from the merchant's setup link or website tokens.
									</p>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<div className="rounded-card border border-line bg-surface p-5 space-y-2 shadow-card shelfway-lift">
										<div className="flex items-center gap-2 text-primary font-semibold text-sm">
											<Icon name="globe" size={16} />
											<span>1. Merchant Onboarding</span>
										</div>
										<p className="text-xs text-muted leading-relaxed">
											Merchants add their website domain in the Shelfway Portal, place desired products, and generate a
											single-file <strong>Developer Pack</strong> or 1-click setup link.
										</p>
									</div>

									<div className="rounded-card border border-line bg-surface p-5 space-y-2 shadow-card shelfway-lift">
										<div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
											<Icon name="shield" size={16} />
											<span>2. Isolated Credentials</span>
										</div>
										<p className="text-xs text-muted leading-relaxed">
											Builders receive website-bound tokens. They build the storefront and <strong>never</strong> need
											Portal logins or merchant passwords.
										</p>
									</div>
								</div>

								<div className="rounded-card border border-line bg-surface p-6 space-y-4 shadow-card">
									<h2 className="text-base font-semibold text-fg">Everyday Development Path</h2>
									<ol className="list-decimal list-inside space-y-2.5 text-xs text-muted leading-relaxed">
										<li>
											Merchant opens Portal:{' '}
											<code className="font-mono text-fg">Websites -&gt; [Your Website] -&gt; Developer Pack</code>.
										</li>
										<li>Merchant copies the setup link or credentials and provides it to whoever builds their site.</li>
										<li>Paste client-side widget scripts into your HTML layout with your public Browser Token.</li>
										<li>Call backend REST APIs from your server backend using your private Server Bearer Token.</li>
									</ol>
								</div>

								{/* Ready Storefront Products */}
								{catalogItems.length > 0 ? (
									<div className="space-y-4 pt-2">
										<div className="flex items-center justify-between">
											<h2 className="text-base font-semibold text-fg">Ready Storefront Products</h2>
											<span className="text-xs text-muted font-mono">{catalogItems.length} products available</span>
										</div>
										<div className="grid gap-3 sm:grid-cols-2">
											{catalogItems.map((/** @type {any} */ p) => (
												<div
													key={p.productId}
													className="rounded-card border border-line bg-surface p-4 space-y-3 shadow-card hard flex flex-col justify-between">
													<div className="space-y-2">
														<div className="flex items-center justify-between">
															<span className="font-semibold text-sm text-fg">{p.name}</span>
															<span className="text-[10px] font-mono text-muted">{`v${p.version}`}</span>
														</div>
														<p className="text-xs text-muted leading-relaxed line-clamp-2">{p.description}</p>
														{p.features && p.features.length > 0 ? (
															<div className="flex flex-wrap gap-1.5 pt-1">
																{p.features.slice(0, 3).map((/** @type {any} */ f) => (
																	<span
																		key={f.key}
																		className="text-[10px] font-mono bg-surface-2 text-fg/80 border border-line px-1.5 py-0.5 rounded">
																		{f.name}
																	</span>
																))}
															</div>
														) : null}
													</div>
													<div className="flex items-center justify-between pt-2 border-t border-line text-xs">
														<Button
															type="button"
															variant="ghost"
															size="sm"
															onClick={() => selectProduct(p.productId)}
															className="text-primary hover:underline font-medium cursor-pointer p-0 h-auto">
															{`Explore ${p.name} APIs ->`}
														</Button>
														<span className="font-mono text-[11px] text-muted">{`v${p.version}`}</span>
													</div>
												</div>
											))}
										</div>
									</div>
								) : (
									<div className="rounded-card border border-line bg-surface p-6 text-center space-y-3 shadow-card">
										<p className="text-sm font-medium text-fg">No products placed in the catalog yet</p>
										<p className="text-xs text-muted max-w-md mx-auto">
											Once micro-products (Accounts, Chat, Payments, Ecommerce, Notifications, Growth) are connected in
											the Admin Console, their specifications, widget scripts, and endpoints will appear here.
										</p>
										{effectiveActor?.admin ? (
											<div className="pt-1">
												<ButtonLink href="/admin/products" variant="primary" size="sm">
													Connect your first product
												</ButtonLink>
											</div>
										) : null}
									</div>
								)}
							</section>
						) : null}

						{/* 2. Authentication & Tokens Section */}
						{activeSection === 'tokens' ? (
							<section className="space-y-6">
								<div className="space-y-2">
									<p className="font-mono text-xs font-bold tracking-widest uppercase text-primary">
										Credentials Architecture
									</p>
									<h1 className="font-display text-3xl font-bold tracking-tight text-fg">Authentication &amp; Tokens</h1>
									<p className="text-sm text-muted leading-relaxed max-w-3xl">
										Shelfway connects storefront widgets and backend APIs using two scoped tokens. You never share your
										merchant portal passwords or database credentials with frontend code.
									</p>
								</div>

								{/* Action Card: Where to find tokens */}
								<div className="rounded-card border border-primary/20 bg-primary/5 p-5 space-y-3 shadow-card">
									<div className="flex items-center gap-2 text-primary font-semibold text-sm">
										<Icon name="key" size={16} />
										<span>Where to find your tokens</span>
									</div>
									<p className="text-xs text-muted leading-relaxed">
										Every website you create in Shelfway receives its own unique pair of tokens. In the console, go to{' '}
										<strong>Websites</strong>, select your website, and click <strong>Share with developer</strong> (or
										download your <strong>Developer Pack</strong>) to reveal your scoped Browser and Server tokens.
									</p>
									<div className="pt-1">
										<ButtonLink href="/websites" variant="secondary" size="sm">
											View your Websites &amp; Tokens
										</ButtonLink>
									</div>
								</div>

								<div className="space-y-4">
									<div className="rounded-card border border-line bg-surface p-5 space-y-3 shadow-card hard">
										<div className="flex items-center justify-between">
											<span className="font-semibold text-sm text-primary">Browser Token (Public Client-side)</span>
											<span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
												Safe for HTML
											</span>
										</div>
										<p className="text-xs text-muted leading-relaxed">
											Public token embedded into frontend HTML &lt;script&gt; tags. It authorizes visitor widgets
											(Chat, Cart, Signup forms) and is restricted to your website domain.
										</p>
										<CodeBlock
											code={`<script src="${apiBase}/widget.js" data-token="${token || 'YOUR_WEBSITE_BROWSER_TOKEN'}" async></script>`}
											label="HTML Widget Snippet"
										/>
									</div>

									<div className="rounded-card border border-line bg-surface p-5 space-y-3 shadow-card hard">
										<div className="flex items-center justify-between">
											<span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
												Server Token (Private Backend Secret)
											</span>
											<span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded font-bold">
												Backend .env Only
											</span>
										</div>
										<p className="text-xs text-muted leading-relaxed">
											Private secret stored exclusively in server environment variables. Sent in HTTP Authorization
											headers for server-to-server operations (order creation, user management, inventory sync).
										</p>
										<CodeBlock
											code={`curl -X GET "${apiBase}/v1/products" \\\n  -H "Authorization: Bearer ${token || 'YOUR_WEBSITE_SERVER_TOKEN'}" \\\n  -H "Content-Type: application/json"`}
											label="Backend cURL Header"
										/>
									</div>
								</div>
							</section>
						) : null}

						{/* 3. Product Empty State (When no product is connected) */}
						{activeSection === 'products' && !currentProduct ? (
							<section className="space-y-6">
								<div className="rounded-card border border-line bg-surface p-8 text-center space-y-3 shadow-card">
									<div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-muted">
										<Icon name="info" size={20} />
									</div>
									<h2 className="text-base font-semibold text-fg">No products connected yet</h2>
									<p className="text-xs text-muted max-w-md mx-auto">
										Connect a product in the Admin Console to view its interactive OpenAPI specifications, endpoints,
										and widget embed guides.
									</p>
									{effectiveActor?.admin ? (
										<div className="pt-2">
											<ButtonLink href="/admin/products" variant="primary" size="sm">
												Connect product
											</ButtonLink>
										</div>
									) : null}
								</div>
							</section>
						) : null}

						{/* 4. Product Overview (When no specific operation is selected) */}
						{activeSection === 'products' && !selectedOpKey && currentProduct ? (
							<section className="space-y-6">
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-line pb-6">
									<div className="space-y-1">
										<p className="font-mono text-xs font-bold tracking-widest uppercase text-primary">
											PRODUCT SPECIFICATION
										</p>
										<div className="flex items-center gap-2.5">
											<h1 className="font-display text-3xl font-bold tracking-tight text-fg">{currentProduct.name}</h1>
											<span className="font-mono text-xs bg-surface-2 text-muted px-2 py-0.5 rounded border border-line">
												v{currentProduct.version}
											</span>
											<span className="font-mono text-xs bg-success-soft text-on-success-soft px-2 py-0.5 rounded font-semibold border border-success/30">
												active
											</span>
										</div>
										<p className="text-sm text-muted">{currentProduct.description}</p>
									</div>

									<div className="flex items-center gap-2">
										<span className="font-mono text-xs bg-surface-2 text-muted px-2 py-0.5 rounded border border-line">
											Universal Spec
										</span>
									</div>
								</div>

								{/* Client-Side Widget Snippet */}
								{widgetSnippet ? (
									<div className="space-y-2">
										<h2 className="text-sm font-semibold flex items-center gap-2">
											<Icon name="code" size={16} className="text-primary" />
											<span>Storefront Widget Embed</span>
										</h2>
										<p className="text-xs text-muted">
											Add this script to your storefront layout HTML to embed the {currentProduct.name} widget.
										</p>
										<CodeBlock code={widgetSnippet} label="Storefront HTML" />
									</div>
								) : null}

								{/* Features & Capabilities */}
								{currentProduct.features && currentProduct.features.length > 0 ? (
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<h2 className="text-sm font-semibold">Capabilities &amp; Feature Switches</h2>
											{token ? (
												<span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
													Active on {website || 'connected website'}
												</span>
											) : null}
										</div>
										<div className="grid gap-2.5 sm:grid-cols-2">
											{currentProduct.features.map((/** @type {any} */ f) => (
												<div
													key={f.key}
													className="rounded-card border border-line bg-surface p-3.5 space-y-1 shadow-card hard">
													<div className="flex items-center justify-between gap-2">
														<span className="text-xs font-semibold text-fg">{f.name}</span>
														{token ? (
															<Badge tone="success" dot>
																Active
															</Badge>
														) : (
															<code className="text-[10px] text-muted font-mono bg-surface-2 px-1.5 py-0.5 rounded">
																{f.key}
															</code>
														)}
													</div>
													{f.description ? <p className="text-xs text-muted">{f.description}</p> : null}
												</div>
											))}
										</div>
									</div>
								) : null}

								{/* AI Assistant Context & Prompt */}
								<div className="rounded-card border border-primary/40 bg-surface p-4 space-y-3 shadow-card hard">
									<div className="flex flex-wrap items-center justify-between gap-2">
										<div className="flex items-center gap-2">
											<Icon name="sparkle" size={16} className="text-primary" />
											<span className="font-semibold text-sm text-fg">AI Assistant &amp; Developer Prompt</span>
										</div>
										<Button
											size="sm"
											variant="secondary"
											onClick={() => {
												const aiContext = [
													`# Shelfway ${currentProduct.name} API Integration Guide`,
													`Website Domain: ${website || 'your-store.shelfway.com'}`,
													`API Base: ${apiBase}`,
													`Product ID: ${currentProduct.productId}`,
													`Docs URL: ${apiBase}/docs?product=${currentProduct.productId}`,
													'',
													'## Active Capabilities',
													...(currentProduct.features || []).map(
														(/** @type {any} */ f) => `- ${f.name} (${f.key}): ${f.description || ''}`,
													),
													'',
													'## Authentication',
													`Authorization Header: Bearer ${token || 'YOUR_WEBSITE_SERVER_TOKEN'}`,
													`Browser Client Token: ${token || 'YOUR_WEBSITE_BROWSER_TOKEN'}`,
													'',
													'## Integration Rules',
													'1. All endpoints return RFC 7807/9457 problems on failure.',
													'2. Always send Content-Type: application/json.',
													'3. Use exact casing for JSON keys matching the OpenAPI spec.',
												].join('\n');
												copyText(aiContext);
											}}>
											Copy AI Prompt
										</Button>
									</div>
									<p className="text-xs text-muted leading-relaxed">
										Copy full capability context, token authorization headers, and schema specification to paste into
										Claude, Cursor, or AI coding assistants.
									</p>
								</div>

								{/* Endpoints Table Overview (Swagger-style) */}
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<h2 className="text-sm font-semibold">Available API Operations ({filteredOperations.length})</h2>
										<span className="text-xs text-muted">Click any operation to view interactive Swagger docs</span>
									</div>

									<div className="rounded-card border border-line bg-surface overflow-hidden divide-y divide-line shadow-card">
										{filteredOperations.map((/** @type {any} */ op) => {
											const opKey = `${op.method}:${op.path}`;
											return (
												<Button
													key={opKey}
													type="button"
													variant="ghost"
													onClick={() => selectOperation(opKey)}
													className="flex w-full items-center justify-between p-3.5 text-left hover:bg-surface-2 transition group rounded-none h-auto">
													<div className="flex items-center gap-3 truncate">
														<span
															className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${methodColor(
																op.method,
															)}`}>
															{op.method}
														</span>
														<span className="font-mono text-xs text-fg group-hover:text-primary transition truncate font-medium">
															{op.path}
														</span>
													</div>
													<span className="text-xs text-muted truncate ml-4 max-w-sm">{op.summary}</span>
												</Button>
											);
										})}
									</div>
								</div>
							</section>
						) : null}

						{/* 5. Single Operation Interactive Swagger Documentation */}
						{activeSection === 'products' && currentOperation ? (
							<section className="space-y-6">
								{(() => {
									const isStorefront =
										currentOperation.auth === 'browser' ||
										currentOperation.auth === 'visitor' ||
										!currentOperation.auth;
									if (!isStorefront && !isProductRoleAllowed) {
										return (
											<div className="rounded-card border border-warning/40 bg-surface p-4 space-y-2 shadow-card">
												<div className="flex items-center gap-2 text-warning font-semibold text-xs">
													<Icon name="shield" size={15} />
													<span>Role Restricted Access</span>
												</div>
												<p className="text-xs text-muted leading-relaxed">
													This operation requires <strong>Developer</strong> or <strong>Owner</strong> privileges.
													Your current role is <code className="font-mono text-fg">{userRole}</code>.
												</p>
											</div>
										);
									}
									return null;
								})()}

								{/* Parameters List */}
								{currentOperation.parameters && currentOperation.parameters.length > 0 ? (
									<div className="space-y-3">
										<h3 className="text-sm font-semibold">Parameters</h3>
										<div
											className="rounded-card border border-line bg-surface overflow-hidden shadow-card"
											role="table"
											aria-label="Parameters">
											<div
												className="grid grid-cols-12 border-b border-line bg-surface-2 p-2.5 text-xs font-semibold text-muted"
												role="row">
												<div className="col-span-3" role="columnheader">
													Name
												</div>
												<div className="col-span-2" role="columnheader">
													In
												</div>
												<div className="col-span-2" role="columnheader">
													Type
												</div>
												<div className="col-span-2" role="columnheader">
													Required
												</div>
												<div className="col-span-3" role="columnheader">
													Description
												</div>
											</div>
											<div className="divide-y divide-line text-xs" role="rowgroup">
												{currentOperation.parameters.map((/** @type {any} */ p, /** @type {number} */ idx) => {
													const paramObj = p.name ? p : p.$ref ? { name: p.$ref.split('/').pop(), in: 'ref' } : p;
													return (
														<div
															key={paramObj.name || idx}
															className="grid grid-cols-12 p-2.5 items-center hover:bg-surface-2/50 transition"
															role="row">
															<div className="col-span-3 font-mono font-medium text-fg" role="cell">
																{paramObj.name}
															</div>
															<div className="col-span-2 font-mono text-muted" role="cell">
																{paramObj.in || 'query'}
															</div>
															<div className="col-span-2 font-mono text-primary font-medium" role="cell">
																{paramObj.schema?.type || 'string'}
															</div>
															<div className="col-span-2" role="cell">
																{paramObj.required ? (
																	<span className="text-danger font-bold">required</span>
																) : (
																	<span className="text-muted">optional</span>
																)}
															</div>
															<div className="col-span-3 text-muted" role="cell">
																{paramObj.description || '-'}
															</div>
														</div>
													);
												})}
											</div>
										</div>
									</div>
								) : null}

								{/* Request Body Specification (for mutations) */}
								{currentOperation.requestBody ? (
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<h3 className="text-sm font-semibold">Request Body (application/json)</h3>
											<span className="text-xs text-muted">JSON Schema &amp; Example</span>
										</div>
										<CodeBlock code={JSON.stringify(sampleRequestPayload, null, 2)} label="Example JSON Request" />
									</div>
								) : null}

								{/* Responses Specification (Swagger tabs) */}
								{currentOperation.responses ? (
									<div className="space-y-3">
										<h3 className="text-sm font-semibold">Responses</h3>
										<div className="flex items-center gap-1.5 border-b border-line pb-2">
											{Object.keys(currentOperation.responses).map((status) => (
												<Button
													key={status}
													type="button"
													size="sm"
													variant={activeResponseStatus === status ? 'primary' : 'secondary'}
													onClick={() => setActiveResponseStatus(status)}
													className="font-mono text-xs">
													{status}
												</Button>
											))}
										</div>

										{sampleResponsePayload ? (
											<div className="space-y-2">
												<p className="text-xs text-muted">{sampleResponsePayload.description || 'Response'}</p>
												<CodeBlock
													code={JSON.stringify(sampleResponsePayload.payload, null, 2)}
													label={`HTTP ${activeResponseStatus} Response Payload`}
												/>
											</div>
										) : null}
									</div>
								) : null}

								{/* Ready-to-Run Code Snippets */}
								<div className="space-y-3 pt-4 border-t border-line">
									<div className="flex items-center justify-between">
										<h3 className="text-sm font-semibold">Ready-to-Use Code Snippet</h3>
										<div className="flex items-center rounded bg-surface-2 p-0.5 text-xs border border-line">
											<Button
												type="button"
												size="sm"
												variant={activeSnippetTab === 'curl' ? 'secondary' : 'ghost'}
												onClick={() => setActiveSnippetTab('curl')}
												className="font-medium text-xs">
												cURL
											</Button>
											<Button
												type="button"
												size="sm"
												variant={activeSnippetTab === 'fetch' ? 'secondary' : 'ghost'}
												onClick={() => setActiveSnippetTab('fetch')}
												className="font-medium text-xs">
												JavaScript
											</Button>
											<Button
												type="button"
												size="sm"
												variant={activeSnippetTab === 'python' ? 'secondary' : 'ghost'}
												onClick={() => setActiveSnippetTab('python')}
												className="font-medium text-xs">
												Python
											</Button>
										</div>
									</div>

									{activeSnippetTab === 'curl' ? (
										<CodeBlock
											code={`curl -X ${currentOperation.method} "${apiBase}${currentOperation.path}" \\\n  -H "Authorization: ${token ? `Bearer ${token}` : 'Bearer YOUR_WEBSITE_SERVER_TOKEN'}" \\\n  -H "Content-Type: application/json"${
												website ? ` \\\n  -H "Origin: https://${website}"` : ''
											}${
												currentOperation.requestBody
													? ` \\\n  -d '${JSON.stringify(sampleRequestPayload || {})}'`
													: ''
											}`}
											label="cURL Command"
										/>
									) : activeSnippetTab === 'fetch' ? (
										<CodeBlock
											code={`const response = await fetch("${apiBase}${currentOperation.path}", {\n  method: "${currentOperation.method}",\n  headers: {\n    "Authorization": "${token ? `Bearer ${token}` : 'Bearer YOUR_WEBSITE_SERVER_TOKEN'}",\n    "Content-Type": "application/json"${website ? `,\n    "Origin": "https://${website}"` : ''}\n  }${
												currentOperation.requestBody
													? `,\n  body: JSON.stringify(${JSON.stringify(sampleRequestPayload || {}, null, 2)})`
													: ''
											}\n});\nconst data = await response.json();\nconsole.log(data);`}
											label="JavaScript Fetch Example"
										/>
									) : (
										<CodeBlock
											code={`import requests\n\nurl = "${apiBase}${currentOperation.path}"\nheaders = {\n    "Authorization": "${token ? `Bearer ${token}` : 'Bearer YOUR_WEBSITE_SERVER_TOKEN'}",\n    "Content-Type": "application/json"\n}\n${
												currentOperation.requestBody
													? `payload = ${JSON.stringify(
															sampleRequestPayload || {},
															null,
															4,
														)}\nresponse = requests.${currentOperation.method.toLowerCase()}(url, json=payload, headers=headers)`
													: `response = requests.${currentOperation.method.toLowerCase()}(url, headers=headers)`
											}\nprint(response.json())`}
											label="Python Requests Example"
										/>
									)}
								</div>
							</section>
						) : null}

						{/* 5. Product Developer SDK Sections */}
						{activeSection.startsWith('sdk-') ? (
							<section className="space-y-6">
								{(() => {
									const guideId = activeSection.replace('sdk-', '');
									const guide = STATIC_SDK_GUIDES.find((g) => g.id === guideId) ?? STATIC_SDK_GUIDES[0];
									if (!guide) return null;
									return (
										<div className="space-y-6">
											<div className="space-y-1 border-b border-line pb-4">
												<p className="font-mono text-xs font-bold tracking-widest uppercase text-primary">
													PRODUCT DEVELOPER SDK
												</p>
												<h1 className="font-display text-3xl font-bold tracking-tight text-fg">{guide.title}</h1>
												<p className="text-sm text-muted">{guide.summary}</p>
											</div>

											{guide.commands ? (
												<div className="space-y-3">
													<h2 className="text-sm font-semibold">Commands</h2>
													{guide.commands.map((c) => (
														<div
															key={c.cmd}
															className="rounded-card border border-line bg-surface p-4 space-y-2 shadow-card">
															<code className="text-xs font-mono font-bold text-primary block">{c.cmd}</code>
															<p className="text-xs text-muted">{c.desc}</p>
														</div>
													))}
												</div>
											) : null}

											{guide.points ? (
												<div className="rounded-card border border-line bg-surface p-5 space-y-3 shadow-card">
													<h2 className="text-sm font-semibold">Key Architecture Invariants</h2>
													<ul className="list-disc list-inside space-y-2 text-xs text-muted leading-relaxed">
														{guide.points.map((p, idx) => (
															<li key={idx}>{p}</li>
														))}
													</ul>
												</div>
											) : null}
										</div>
									);
								})()}
							</section>
						) : null}
					</div>
				</div>
			</div>
		</ToastProvider>
	);
}
