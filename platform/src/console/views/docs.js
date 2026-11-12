'use client';
/**
 * Documentation Hub view: unified single-page API explorer with a sticky sidebar,
 * full Swagger / OpenAPI 3.1 interactive inspection, query parameter deep-linking,
 * role-based visibility, and client/server token integration guides.
 * Grounded 100% in the website theme with frosted glass and geometric offset teal shadows.
 * @module
 */
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, CodeBlock, Icon, Input, ToastProvider, copyText } from '@shelfway/ui';
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
 * @param {any} schema
 * @param {any} [components]
 * @returns {any}
 */
function sampleFromSchema(schema, components) {
	if (!schema || typeof schema !== 'object') return null;
	if (schema.$ref && typeof schema.$ref === 'string') {
		const refName = schema.$ref.replace('#/components/schemas/', '');
		const resolved = components?.schemas?.[refName];
		if (resolved) return sampleFromSchema(resolved, components);
		return {};
	}
	if (schema.example !== undefined) return schema.example;
	if (schema.default !== undefined) return schema.default;
	if (schema.type === 'object' || schema.properties) {
		/** @type {Record<string, any>} */
		const result = {};
		for (const [key, prop] of Object.entries(schema.properties || {})) {
			result[key] = sampleFromSchema(prop, components);
		}
		return result;
	}
	if (schema.type === 'array') {
		return [sampleFromSchema(schema.items || {}, components)];
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

/**
 * @param {{
 *   branding?: { name: string, accent?: string, logoUrl?: string | null },
 *   items?: DocCatalogProduct[],
 *   activeProductDetail?: any,
 *   actor?: any,
 *   initialProductId?: string,
 *   initialOpKey?: string,
 *   initialSection?: string,
 *   initialToken?: string,
 *   initialWebsite?: string,
 * }} props
 */
export function DocsHubView({
	branding,
	items = [],
	activeProductDetail = null,
	actor = null,
	initialProductId = '',
	initialOpKey = '',
	initialSection = 'quickstart',
	initialToken = '',
	initialWebsite = '',
}) {
	const brandName = branding?.name || 'Shelfway';
	const [activeSection, setActiveSection] = useState(initialSection || (initialProductId ? 'products' : 'quickstart'));
	const [selectedProductId, setSelectedProductId] = useState(initialProductId || items[0]?.productId || 'chat');
	const [selectedOpKey, setSelectedOpKey] = useState(/** @type {string | null} */ (initialOpKey || null));
	const [token, setToken] = useState(initialToken || '');
	const [website, setWebsite] = useState(initialWebsite || '');
	const [tokenInput, setTokenInput] = useState('');
	const [activeSnippetTab, setActiveSnippetTab] = useState('curl');
	const [activeResponseStatus, setActiveResponseStatus] = useState('200');
	const [searchQuery, setSearchQuery] = useState('');
	const [cachedDetails, setCachedDetails] = useState(/** @type {Record<string, any>} */ ({}));
	const [copiedNotice, setCopiedNotice] = useState('');

	const userRole = actor?.role || (actor?.admin ? 'owner' : null);
	const isDeveloperRole = Boolean(userRole === 'owner' || userRole === 'developer' || userRole === 'support');
	const [roleViewMode, setRoleViewMode] = useState(isDeveloperRole ? 'developer' : 'storefront');

	const openSignIn = () => {
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('shelfway:open-signin'));
		}
	};

	const isUnlocked = Boolean(actor || token);

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
		if (sec && sec !== 'products') params.set('section', sec);
		else params.delete('section');
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

	// Populate initial cached detail if passed from server
	useEffect(() => {
		if (activeProductDetail?.productId) {
			setCachedDetails((prev) => ({ ...prev, [activeProductDetail.productId]: activeProductDetail }));
		}
	}, [activeProductDetail]);

	// Fetch product detail (with operations & components) when selected if not yet cached
	useEffect(() => {
		if (!selectedProductId || cachedDetails[selectedProductId]) return;
		let cancelled = false;
		apiFetch(`/v1/docs/${encodeURIComponent(selectedProductId)}`).then((res) => {
			if (!cancelled && res.ok && res.data?.product) {
				setCachedDetails((prev) => ({ ...prev, [selectedProductId]: res.data.product }));
			}
		});
		return () => {
			cancelled = true;
		};
	}, [selectedProductId, cachedDetails]);

	const currentProduct = useMemo(() => {
		return cachedDetails[selectedProductId] || items.find((p) => p.productId === selectedProductId) || items[0] || null;
	}, [cachedDetails, selectedProductId, items]);

	const operations = useMemo(() => {
		return /** @type {any[]} */ (currentProduct?.operations || []);
	}, [currentProduct]);

	const currentOperation = useMemo(() => {
		if (!selectedOpKey) return null;
		return operations.find((/** @type {any} */ op) => `${op.method}:${op.path}` === selectedOpKey) || null;
	}, [operations, selectedOpKey]);

	// Filtered operations based on search query
	const filteredOperations = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return operations;
		return operations.filter(
			(/** @type {any} */ op) =>
				op.path.toLowerCase().includes(q) ||
				op.method.toLowerCase().includes(q) ||
				(op.summary && op.summary.toLowerCase().includes(q)) ||
				(op.description && op.description.toLowerCase().includes(q)),
		);
	}, [operations, searchQuery]);

	const filteredProducts = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return items;
		return items.filter(
			(p) =>
				p.name.toLowerCase().includes(q) ||
				p.productId.toLowerCase().includes(q) ||
				(p.description && p.description.toLowerCase().includes(q)),
		);
	}, [items, searchQuery]);

	/** @param {string} productId */
	const selectProduct = (productId) => {
		setSelectedProductId(productId);
		setSelectedOpKey(null);
		setActiveSection('products');
		syncUrl(productId, null, 'products');
	};

	/** @param {string | null} opKey */
	const selectOperation = (opKey) => {
		setSelectedOpKey(opKey);
		setActiveSection('products');
		syncUrl(selectedProductId, opKey, 'products');
	};

	/** @param {string} section */
	const selectSection = (section) => {
		setActiveSection(section);
		setSelectedOpKey(null);
		syncUrl(selectedProductId, null, section);
	};

	/**
	 * @param {string} key
	 * @param {string} text
	 */
	const copyCode = (key, text) => {
		copyText(text);
		setCopiedNotice(key);
		setTimeout(() => setCopiedNotice(''), 2000);
	};

	const widgetScriptUrl = currentProduct?.widgetScriptUrl || '';
	const widgetSnippet = widgetScriptUrl
		? `<!-- Embed ${currentProduct.name} Widget on your site -->\n<script\n  src="${widgetScriptUrl}"\n  data-token="${token || 'YOUR_WEBSITE_BROWSER_TOKEN'}"\n  ${currentProduct.widgetScriptLoading || 'async'}\n></script>`
		: null;

	const apiBase = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://api.shelfway.com';

	if (!isUnlocked) {
		return (
			<ToastProvider>
				<div className="docs-container flex flex-col flex-1">
					{/* Top Docs Toolbar */}
					<div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-surface/80 p-3.5 backdrop-blur-md mb-6">
						<div className="flex items-center gap-3">
							<p className="font-mono text-xs font-bold tracking-widest uppercase text-primary">API REFERENCE</p>
							<span className="text-muted/60" aria-hidden="true">
								|
							</span>
							<span className="text-sm font-semibold text-fg tracking-tight">{brandName} Documentation Hub</span>
						</div>

						<div className="flex items-center gap-3">
							<div className="hidden sm:flex items-center gap-1.5 text-xs text-muted border-l border-line pl-3">
								<Icon name="lock" size={14} />
								<span>Private Documentation</span>
							</div>
							<Button size="sm" variant="primary" onClick={openSignIn}>
								Sign in
							</Button>
						</div>
					</div>

					{/* Locked Access Screen */}
					<div className="mx-auto max-w-xl w-full my-6 sm:my-10 space-y-6">
						<div className="rounded-card border border-line bg-surface/90 backdrop-blur-md p-6 sm:p-8 space-y-5 shadow-card text-center">
							<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary border border-primary/20">
								<Icon name="lock" size={24} />
							</div>
							<div className="space-y-2">
								<p className="font-mono text-xs font-bold tracking-widest uppercase text-primary">
									PRIVATE DOCUMENTATION
								</p>
								<h1 className="font-display text-2xl font-bold tracking-tight text-fg">Sign in to view documentation</h1>
								<p className="text-xs sm:text-sm text-muted leading-relaxed max-w-md mx-auto">
									Shelfway documentation is private and accessible to registered merchants and authorized website
									developers.
								</p>
							</div>
							<div className="pt-2">
								<Button variant="primary" size="lg" className="w-full sm:w-auto px-8 font-semibold" onClick={openSignIn}>
									Sign in with merchant account
								</Button>
							</div>
						</div>

						{/* Developer Token Unlock Card */}
						<div className="rounded-card border border-line bg-surface/80 backdrop-blur-md p-6 space-y-4 shadow-card">
							<div className="space-y-1">
								<div className="flex items-center gap-2">
									<Icon name="key" size={16} className="text-primary" />
									<h2 className="text-sm font-semibold text-fg">Are you building a site for a merchant?</h2>
								</div>
								<p className="text-xs text-muted leading-relaxed">
									Documentation can only be shared by merchants using their own website token. Paste your setup link or
									website token below to unlock clean and secure documentation for your site without needing merchant
									passwords:
								</p>
							</div>
							<div className="flex flex-col sm:flex-row gap-2.5">
								<Input
									hideLabel
									label="Website token or setup link"
									placeholder="Paste website token or setup link..."
									value={tokenInput}
									onChange={(e) => setTokenInput(e.currentTarget.value)}
									onKeyDown={(e) => {
										if (e.key === 'Enter') applyToken(tokenInput);
									}}
									className="flex-1 text-xs h-10"
								/>
								<Button
									variant="secondary"
									disabled={!tokenInput.trim()}
									onClick={() => applyToken(tokenInput)}
									className="font-medium shrink-0">
									Unlock with token
								</Button>
							</div>
							<p className="text-[11px] text-muted">
								Merchants generate this token directly from:{' '}
								<strong>Websites -&gt; [Website] -&gt; Share with developer</strong>.
							</p>
						</div>

						<div className="text-center text-xs text-muted space-x-1.5">
							<span>Need an account or assistance?</span>
							<a href="/#contact" className="text-primary hover:underline font-semibold">
								Contact us
							</a>
						</div>
					</div>
				</div>
			</ToastProvider>
		);
	}

	return (
		<ToastProvider>
			<div className="docs-container flex flex-col flex-1">
				{/* Top Docs Toolbar */}
				<div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-line bg-surface/80 p-3.5 backdrop-blur-md mb-6">
					<div className="flex items-center gap-3">
						<p className="font-mono text-xs font-bold tracking-widest uppercase text-primary">API REFERENCE</p>
						<span className="text-muted/60" aria-hidden="true">
							|
						</span>
						<span className="text-sm font-semibold text-fg tracking-tight">{brandName} Documentation Hub</span>
					</div>

					<div className="flex items-center gap-3">
						{/* Role view switcher */}
						<div className="flex items-center rounded-control bg-surface-2 p-0.5 text-xs border border-line">
							<button
								type="button"
								onClick={() => setRoleViewMode('storefront')}
								className={`rounded-[calc(var(--radius-control)-2px)] px-3 py-1 font-medium transition ${
									roleViewMode === 'storefront'
										? 'bg-surface text-fg shadow-xs font-semibold'
										: 'text-muted hover:text-fg'
								}`}>
								Storefront APIs
							</button>
							<button
								type="button"
								onClick={() => setRoleViewMode('developer')}
								className={`rounded-[calc(var(--radius-control)-2px)] px-3 py-1 font-medium transition ${
									roleViewMode === 'developer'
										? 'bg-surface text-fg shadow-xs font-semibold'
										: 'text-muted hover:text-fg'
								}`}>
								Product Developer SDK
							</button>
						</div>

						{actor && userRole ? (
							<div className="hidden sm:flex items-center gap-1.5 text-xs text-muted border-l border-line pl-3">
								<Icon name="user" size={14} />
								<span>Role:</span>
								<strong className="text-fg capitalize font-medium">{userRole}</strong>
							</div>
						) : token ? (
							<div className="hidden sm:flex items-center gap-2 text-xs text-muted border-l border-line pl-3">
								<Icon name="key" size={14} className="text-primary" />
								<Badge tone="success" dot>
									{website || 'Website Token'}
								</Badge>
							</div>
						) : null}
					</div>
				</div>

				{/* Two-Column Docs Explorer Layout */}
				<div className="relative z-10 flex flex-col md:flex-row gap-6 flex-1 items-start">
					{/* Left Mega-Menu Sticky Sidebar */}
					<aside className="w-full md:w-72 lg:w-80 shrink-0 rounded-card border border-line bg-surface/80 backdrop-blur-xl overflow-y-auto shelfway-scroll flex flex-col p-4 space-y-6 md:sticky md:top-20 self-start max-h-[calc(100vh-6rem)] shadow-card">
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
								className="text-xs h-9 bg-surface/90"
							/>
						</div>

						{/* Section: Getting Started */}
						<div className="space-y-1">
							<p className="px-2 text-[10px] font-mono font-bold uppercase tracking-widest text-muted">Getting Started</p>
							<button
								type="button"
								onClick={() => selectSection('quickstart')}
								className={`flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-xs font-medium transition shelfway-motion ${
									activeSection === 'quickstart'
										? 'bg-primary/10 text-primary font-semibold shadow-xs'
										: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
								}`}>
								<Icon name="info" size={15} />
								<span>Quickstart Guide</span>
							</button>
							<button
								type="button"
								onClick={() => selectSection('tokens')}
								className={`flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-xs font-medium transition shelfway-motion ${
									activeSection === 'tokens'
										? 'bg-primary/10 text-primary font-semibold shadow-xs'
										: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
								}`}>
								<Icon name="key" size={15} />
								<span>Authentication &amp; Tokens</span>
							</button>
						</div>

						{/* Section: Catalog Products & Endpoints (Storefront View) */}
						<div className="space-y-2">
							<div className="flex items-center justify-between px-2">
								<p className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted">
									Products &amp; APIs
								</p>
								<span className="text-[10px] text-muted font-mono">{items.length} products</span>
							</div>

							<div className="space-y-1">
								{filteredProducts.map((prod) => {
									const isSelected = selectedProductId === prod.productId;
									const isExpanded = isSelected && activeSection === 'products';
									return (
										<div key={prod.productId} className="space-y-0.5">
											<button
												type="button"
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
												<span className="text-[10px] text-muted font-mono">{`v${prod.version}`}</span>
											</button>

											{/* Mega-menu sub-list of product operations */}
											{isExpanded ? (
												<div className="ml-4 pl-2 border-l border-line space-y-0.5 py-1">
													<button
														type="button"
														onClick={() => selectOperation('')}
														className={`flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-[11px] transition ${
															!selectedOpKey
																? 'bg-surface-2 text-primary font-semibold'
																: 'text-muted hover:text-fg'
														}`}>
														<Icon name="info" size={13} />
														<span>Overview &amp; Embed</span>
													</button>

													{filteredOperations.map((/** @type {any} */ op) => {
														const opKey = `${op.method}:${op.path}`;
														const isOpActive = selectedOpKey === opKey;
														return (
															<button
																key={opKey}
																type="button"
																onClick={() => selectOperation(opKey)}
																className={`flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-[11px] truncate transition ${
																	isOpActive
																		? 'bg-surface-2 text-primary font-semibold shadow-xs'
																		: 'text-muted hover:text-fg'
																}`}
																title={`${op.method} ${op.path}`}>
																<span
																	className={`font-mono text-[9px] px-1.5 py-0.5 rounded font-bold ${methodColor(
																		op.method,
																	)}`}>
																	{op.method}
																</span>
																<span className="truncate font-mono">{op.path.replace(/^\/v1/, '')}</span>
															</button>
														);
													})}

													{filteredOperations.length > 40 ? (
														<p className="px-2 py-1 text-[10px] text-muted italic">
															+{filteredOperations.length - 40} more endpoints in spec
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
						{roleViewMode === 'developer' || isDeveloperRole ? (
							<div className="space-y-1 pt-3 border-t border-line">
								<div className="flex items-center justify-between px-2">
									<p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">
										Product Developer SDK
									</p>
									<span className="text-[9px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">
										CORE
									</span>
								</div>
								{STATIC_SDK_GUIDES.map((guide) => (
									<button
										key={guide.id}
										type="button"
										onClick={() => selectSection(`sdk-${guide.id}`)}
										className={`flex w-full items-center gap-2 rounded-control px-2.5 py-2 text-xs font-medium transition shelfway-motion ${
											activeSection === `sdk-${guide.id}`
												? 'bg-primary/10 text-primary font-semibold shadow-xs'
												: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
										}`}>
										<Icon name="code" size={15} />
										<span className="truncate">{guide.title.split(' ')[0]}</span>
									</button>
								))}
							</div>
						) : null}

						{/* Sidebar Footer Link to Catalog OpenAPI */}
						<div className="pt-4 border-t border-line text-xs space-y-1">
							<a
								href="/docs/openapi.json"
								target="_blank"
								rel="noopener noreferrer"
								className="flex items-center justify-between text-muted hover:text-fg px-2 py-1.5 rounded hover:bg-surface-2 transition">
								<span className="font-mono text-xs">Catalog OpenAPI 3.1</span>
								<Icon name="external" size={12} />
							</a>
						</div>
					</aside>

					{/* Right Content Area: Interactive Swagger & Guides */}
					<div className="flex-1 min-w-0 w-full space-y-8">
						{token ? (
							<div className="rounded-card border border-primary/30 bg-primary-soft/10 p-4 shadow-card">
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<span className="font-mono text-xs font-bold uppercase tracking-wider text-primary">
												Authenticated Documentation
											</span>
											{website ? (
												<span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-surface border border-line text-fg">
													{website}
												</span>
											) : null}
										</div>
										<p className="text-xs text-muted">
											Interactive code snippets below are pre-filled with your scoped credentials. No login required.
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Button
											size="sm"
											variant="secondary"
											onClick={() => {
												copyText(token);
												setCopiedNotice('Copied Token');
												setTimeout(() => setCopiedNotice(''), 2000);
											}}>
											{copiedNotice === 'Copied Token' ? 'Copied Token!' : 'Copy Token'}
										</Button>
										<Button
											size="sm"
											variant="ghost"
											onClick={() => {
												setToken('');
												syncUrl(selectedProductId, selectedOpKey, activeSection, '', website);
											}}>
											Change
										</Button>
									</div>
								</div>
							</div>
						) : (
							<div className="rounded-card border border-line bg-surface/90 backdrop-blur-md p-4 shadow-card">
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
									<div className="space-y-1">
										<span className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
											Interactive Playground
										</span>
										<p className="text-xs text-muted">
											Paste your website token or setup link to pre-fill live examples, widget embeds, and API snippets
											without signing in.
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Input
											hideLabel
											label="Website token or setup link"
											placeholder="Paste website token or link..."
											value={tokenInput}
											onChange={(e) => setTokenInput(e.currentTarget.value)}
											onKeyDown={(e) => {
												if (e.key === 'Enter') applyToken(tokenInput);
											}}
											className="w-60 text-xs h-8"
										/>
										<Button
											size="sm"
											variant="secondary"
											disabled={!tokenInput.trim()}
											onClick={() => applyToken(tokenInput)}>
											Apply
										</Button>
									</div>
								</div>
							</div>
						)}

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
										REST APIs using credentials from the merchant's setup link or Developer Pack.
									</p>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<div className="rounded-card border border-line bg-surface/95 backdrop-blur-md p-5 space-y-2 shadow-card shelfway-lift">
										<div className="flex items-center gap-2 text-primary font-semibold text-sm">
											<Icon name="globe" size={16} />
											<span>1. Merchant Onboarding</span>
										</div>
										<p className="text-xs text-muted leading-relaxed">
											Merchants add their website domain in the Shelfway Portal, place desired products, and generate a
											single-file <strong>Developer Pack</strong> or 1-click setup link.
										</p>
									</div>

									<div className="rounded-card border border-line bg-surface/95 backdrop-blur-md p-5 space-y-2 shadow-card shelfway-lift">
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

								<div className="rounded-card border border-line bg-surface/95 backdrop-blur-md p-6 space-y-4 shadow-card">
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
								{items.length > 0 ? (
									<div className="space-y-4 pt-2">
										<div className="flex items-center justify-between">
											<h2 className="text-base font-semibold text-fg">Ready Storefront Products</h2>
											<span className="text-xs text-muted font-mono">{items.length} products available</span>
										</div>
										<div className="grid gap-3 sm:grid-cols-2">
											{items.map((p) => (
												<div
													key={p.productId}
													className="rounded-card border border-line bg-surface/80 backdrop-blur-xl p-4 space-y-3 shadow-card hard flex flex-col justify-between">
													<div className="space-y-2">
														<div className="flex items-center justify-between">
															<span className="font-semibold text-sm text-fg">{p.name}</span>
															<span className="text-[10px] font-mono text-muted">{`v${p.version}`}</span>
														</div>
														<p className="text-xs text-muted leading-relaxed line-clamp-2">{p.description}</p>
														{p.features && p.features.length > 0 ? (
															<div className="flex flex-wrap gap-1.5 pt-1">
																{p.features.slice(0, 3).map((f) => (
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
														<button
															type="button"
															onClick={() => selectProduct(p.productId)}
															className="text-primary hover:underline font-medium cursor-pointer">
															{`Explore ${p.name} APIs ->`}
														</button>
														<a
															href={`/docs/${p.productId}/openapi.json`}
															target="_blank"
															rel="noopener noreferrer"
															className="font-mono text-[11px] text-muted hover:text-fg">
															OpenAPI
														</a>
													</div>
												</div>
											))}
										</div>
									</div>
								) : null}
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
										Shelfway enforces strictly typed credentials. Browser tokens, server tokens, configure sessions, and
										staff tickets are mutually exclusive and never cross-authorized.
									</p>
								</div>

								<div className="space-y-4">
									<div className="rounded-card border border-line bg-surface/80 backdrop-blur-xl p-5 space-y-3 shadow-card hard">
										<div className="flex items-center justify-between">
											<span className="font-semibold text-sm text-primary">Browser Token (Public Client-side)</span>
											<span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">
												Safe for HTML
											</span>
										</div>
										<p className="text-xs text-muted leading-relaxed">
											Public token embedded into frontend HTML &lt;script&gt; tags. It authorizes visitor widgets
											(Chat, Cart, Signup forms) and is restricted to the merchant's verified domain origin.
										</p>
										<CodeBlock
											code={`<script src="${apiBase}/widget.js" data-token="YOUR_WEBSITE_BROWSER_TOKEN" async></script>`}
											label="HTML Widget Snippet"
										/>
									</div>

									<div className="rounded-card border border-line bg-surface/80 backdrop-blur-xl p-5 space-y-3 shadow-card hard">
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
											code={`curl -X GET "${apiBase}/v1/products" \\\n  -H "Authorization: Bearer YOUR_WEBSITE_SERVER_TOKEN" \\\n  -H "Content-Type: application/json"`}
											label="Backend cURL Header"
										/>
									</div>
								</div>
							</section>
						) : null}

						{/* 3. Product Overview (When no specific operation is selected) */}
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
										<a
											href={currentProduct.docsUrl || `/docs?product=${currentProduct.productId}`}
											className="hidden"
											tabIndex={-1}>
											{currentProduct.docsUrl}
										</a>
										<a
											href={currentProduct.openapiUrl || `/docs/${currentProduct.productId}/openapi.json`}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface/90 px-3.5 py-2 text-xs font-medium text-fg hover:bg-surface-2 transition shadow-xs">
											<Icon name="external" size={14} />
											<span>OpenAPI Spec</span>
										</a>
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
													className="rounded-card border border-line bg-surface/80 backdrop-blur-xl p-3.5 space-y-1 shadow-card hard">
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
								<div className="rounded-card border border-primary/40 bg-surface/80 backdrop-blur-xl p-4 space-y-3 shadow-card hard">
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
													`OpenAPI Spec: ${apiBase}/docs/${currentProduct.productId}/openapi.json`,
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
										<h2 className="text-sm font-semibold">Available API Operations ({operations.length})</h2>
										<span className="text-xs text-muted">Click any operation to view interactive Swagger docs</span>
									</div>

									<div className="rounded-card border border-line bg-surface/95 backdrop-blur-md overflow-hidden divide-y divide-line shadow-card">
										{operations.map((/** @type {any} */ op) => {
											const opKey = `${op.method}:${op.path}`;
											return (
												<button
													key={opKey}
													type="button"
													onClick={() => selectOperation(opKey)}
													className="flex w-full items-center justify-between p-3.5 text-left hover:bg-surface-2 transition group">
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
												</button>
											);
										})}
									</div>
								</div>
							</section>
						) : null}

						{/* 4. Single Operation Interactive Swagger Documentation */}
						{activeSection === 'products' && currentOperation ? (
							<section className="space-y-6">
								{/* Operation Header */}
								<div className="space-y-3 border-b border-line pb-6">
									<div className="flex items-center gap-2">
										<button
											type="button"
											onClick={() => selectOperation('')}
											className="text-xs text-muted hover:text-fg flex items-center gap-1.5 transition font-medium">
											&lt;- Back to {currentProduct?.name || 'Product'} Overview
										</button>
									</div>

									<div className="flex flex-wrap items-center gap-2.5">
										<span
											className={`font-mono text-xs px-2.5 py-1 rounded font-bold ${methodColor(
												currentOperation.method,
											)}`}>
											{currentOperation.method}
										</span>
										<code className="font-mono text-base font-semibold text-fg">{currentOperation.path}</code>
										<button
											type="button"
											onClick={() => copyCode('path', currentOperation.path)}
											className="text-xs text-muted hover:text-fg px-2 py-0.5 rounded border border-line bg-surface hover:bg-surface-2 transition">
											{copiedNotice === 'path' ? 'Copied' : 'Copy'}
										</button>
									</div>

									{currentOperation.summary ? (
										<h2 className="text-lg font-bold text-fg">{currentOperation.summary}</h2>
									) : null}

									{currentOperation.description ? (
										<p className="text-xs text-muted leading-relaxed">{currentOperation.description}</p>
									) : null}

									{/* Security & Authentication Notice */}
									<div className="flex flex-wrap items-center gap-2 pt-2">
										<span className="text-xs text-muted font-medium">Authorization:</span>
										<span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-fg border border-line">
											{currentOperation.auth === 'server'
												? 'Authorization: Bearer <serverToken>'
												: currentOperation.auth === 'browser'
													? 'Browser Token (Public)'
													: 'Staff Ticket'}
										</span>
										{currentOperation.permission ? (
											<span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary font-semibold">
												Perm: {currentOperation.permission}
											</span>
										) : null}
									</div>
								</div>

								{/* Parameters List */}
								{currentOperation.parameters && currentOperation.parameters.length > 0 ? (
									<div className="space-y-3">
										<h3 className="text-sm font-semibold">Parameters</h3>
										<div
											className="rounded-card border border-line bg-surface/95 backdrop-blur-md overflow-hidden shadow-card"
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
										{(() => {
											const reqSchema = currentOperation.requestBody?.content?.['application/json']?.schema;
											const samplePayload = reqSchema ? sampleFromSchema(reqSchema, currentProduct?.components) : {};
											return <CodeBlock code={JSON.stringify(samplePayload, null, 2)} label="Example JSON Request" />;
										})()}
									</div>
								) : null}

								{/* Responses Specification (Swagger tabs) */}
								{currentOperation.responses ? (
									<div className="space-y-3">
										<h3 className="text-sm font-semibold">Responses</h3>
										<div className="flex items-center gap-1.5 border-b border-line pb-2">
											{Object.keys(currentOperation.responses).map((status) => (
												<button
													key={status}
													type="button"
													onClick={() => setActiveResponseStatus(status)}
													className={`rounded px-2.5 py-1 text-xs font-mono transition shelfway-motion ${
														activeResponseStatus === status
															? 'bg-primary text-on-primary font-bold shadow-xs'
															: 'bg-surface-2 text-muted hover:text-fg'
													}`}>
													{status}
												</button>
											))}
										</div>

										{(() => {
											const resp =
												currentOperation.responses[activeResponseStatus] ||
												Object.values(currentOperation.responses)[0];
											if (!resp) return null;
											const respSchema =
												resp.content?.['application/json']?.schema ||
												resp.content?.['application/problem+json']?.schema;
											const sampleResp = respSchema
												? sampleFromSchema(respSchema, currentProduct?.components)
												: { message: resp.description || 'Success' };
											return (
												<div className="space-y-2">
													<p className="text-xs text-muted">{resp.description || 'Response'}</p>
													<CodeBlock
														code={JSON.stringify(sampleResp, null, 2)}
														label={`HTTP ${activeResponseStatus} Response Payload`}
													/>
												</div>
											);
										})()}
									</div>
								) : null}

								{/* Ready-to-Run Code Snippets */}
								<div className="space-y-3 pt-4 border-t border-line">
									<div className="flex items-center justify-between">
										<h3 className="text-sm font-semibold">Ready-to-Use Code Snippet</h3>
										<div className="flex items-center rounded bg-surface-2 p-0.5 text-xs border border-line">
											<button
												type="button"
												onClick={() => setActiveSnippetTab('curl')}
												className={`rounded px-2.5 py-1 font-medium transition ${
													activeSnippetTab === 'curl' ? 'bg-surface text-fg font-semibold shadow-xs' : 'text-muted'
												}`}>
												cURL
											</button>
											<button
												type="button"
												onClick={() => setActiveSnippetTab('fetch')}
												className={`rounded px-2.5 py-1 font-medium transition ${
													activeSnippetTab === 'fetch' ? 'bg-surface text-fg font-semibold shadow-xs' : 'text-muted'
												}`}>
												JavaScript
											</button>
											<button
												type="button"
												onClick={() => setActiveSnippetTab('python')}
												className={`rounded px-2.5 py-1 font-medium transition ${
													activeSnippetTab === 'python' ? 'bg-surface text-fg font-semibold shadow-xs' : 'text-muted'
												}`}>
												Python
											</button>
										</div>
									</div>

									{activeSnippetTab === 'curl' ? (
										<CodeBlock
											code={`curl -X ${currentOperation.method} "${apiBase}${currentOperation.path}" \\\n  -H "Authorization: ${token ? `Bearer ${token}` : 'Bearer YOUR_WEBSITE_SERVER_TOKEN'}" \\\n  -H "Content-Type: application/json"${
												website ? ` \\\n  -H "Origin: https://${website}"` : ''
											}${
												currentOperation.requestBody
													? ` \\\n  -d '${JSON.stringify(
															sampleFromSchema(
																currentOperation.requestBody?.content?.['application/json']?.schema,
																currentProduct?.components,
															) || {},
														)}'`
													: ''
											}`}
											label="cURL Command"
										/>
									) : activeSnippetTab === 'fetch' ? (
										<CodeBlock
											code={`const response = await fetch("${apiBase}${currentOperation.path}", {\n  method: "${currentOperation.method}",\n  headers: {\n    "Authorization": "${token ? `Bearer ${token}` : 'Bearer YOUR_WEBSITE_SERVER_TOKEN'}",\n    "Content-Type": "application/json"${website ? `,\n    "Origin": "https://${website}"` : ''}\n  }${
												currentOperation.requestBody
													? `,\n  body: JSON.stringify(${JSON.stringify(
															sampleFromSchema(
																currentOperation.requestBody?.content?.['application/json']?.schema,
																currentProduct?.components,
															) || {},
															null,
															2,
														)})`
													: ''
											}\n});\nconst data = await response.json();\nconsole.log(data);`}
											label="JavaScript Fetch Example"
										/>
									) : (
										<CodeBlock
											code={`import requests\n\nurl = "${apiBase}${currentOperation.path}"\nheaders = {\n    "Authorization": "${token ? `Bearer ${token}` : 'Bearer YOUR_WEBSITE_SERVER_TOKEN'}",\n    "Content-Type": "application/json"\n}\n${
												currentOperation.requestBody
													? `payload = ${JSON.stringify(
															sampleFromSchema(
																currentOperation.requestBody?.content?.['application/json']?.schema,
																currentProduct?.components,
															) || {},
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
															className="rounded-card border border-line bg-surface/95 backdrop-blur-md p-4 space-y-2 shadow-card">
															<code className="text-xs font-mono font-bold text-primary block">{c.cmd}</code>
															<p className="text-xs text-muted">{c.desc}</p>
														</div>
													))}
												</div>
											) : null}

											{guide.points ? (
												<div className="rounded-card border border-line bg-surface/95 backdrop-blur-md p-5 space-y-3 shadow-card">
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
