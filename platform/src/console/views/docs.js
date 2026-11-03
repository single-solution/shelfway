'use client';
/**
 * Documentation Hub view: professional API explorer with a sidebar mega menu,
 * full Swagger / OpenAPI 3.1 interactive documentation, role-based visibility,
 * and client/server token integration guides.
 * Gated behind Portal login. External storefront builders and AI agents use website-bound
 * tokens from the Developer Pack without access to internal platform/product source code.
 * @module
 */
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, CodeBlock, Icon, ToastProvider, copyText } from '@shelfway/ui';
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
 * @property {string} docsUrl
 * @property {string} openapiUrl
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
 * HTTP method badge styling helper.
 * @param {string} method
 */
function methodColor(method) {
	const m = String(method).toUpperCase();
	switch (m) {
		case 'GET':
			return 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30';
		case 'POST':
			return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
		case 'PUT':
			return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
		case 'PATCH':
			return 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30';
		case 'DELETE':
			return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
		default:
			return 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30';
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
 * }} props
 */
export function DocsHubView({ branding, items = [], activeProductDetail = null, actor = null, initialProductId = '' }) {
	const brandName = branding?.name || 'Shelfway';
	const [activeSection, setActiveSection] = useState('products');
	const [selectedProductId, setSelectedProductId] = useState(initialProductId || items[0]?.productId || 'chat');
	const [selectedOpKey, setSelectedOpKey] = useState(/** @type {string | null} */ (null));
	const [activeSnippetTab, setActiveSnippetTab] = useState('curl');
	const [activeResponseStatus, setActiveResponseStatus] = useState('200');
	const [searchQuery, setSearchQuery] = useState('');
	const [cachedDetails, setCachedDetails] = useState(/** @type {Record<string, any>} */ ({}));
	const [copiedNotice, setCopiedNotice] = useState('');

	const userRole = actor?.role || (actor?.admin ? 'owner' : 'merchant');
	const isDeveloperRole = userRole === 'owner' || userRole === 'developer' || userRole === 'support';
	const [roleViewMode, setRoleViewMode] = useState(isDeveloperRole ? 'developer' : 'storefront');

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
		? `<!-- Embed ${currentProduct.name} Widget on your site -->\n<script\n  src="${widgetScriptUrl}"\n  data-token="YOUR_WEBSITE_BROWSER_TOKEN"\n  ${currentProduct.widgetScriptLoading || 'async'}\n></script>`
		: null;

	const apiBase = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://api.shelfway.com';

	return (
		<ToastProvider>
			<div className="flex flex-col min-h-screen bg-canvas text-fg">
				{/* Top Global Docs Header */}
				<header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
					<div className="flex items-center gap-3">
						<a href="/overview" className="flex items-center gap-2 font-semibold text-fg hover:opacity-80">
							<span className="flex h-7 w-7 items-center justify-center rounded-control bg-primary text-white font-mono text-sm font-bold">
								S
							</span>
							<span>{brandName}</span>
						</a>
						<span className="text-muted/60">/</span>
						<span className="text-sm font-medium text-muted">Documentation Hub</span>
					</div>

					<div className="flex items-center gap-3">
						{/* Role view switcher */}
						<div className="flex items-center rounded-control bg-surface-2 p-0.5 text-xs">
							<button
								type="button"
								onClick={() => setRoleViewMode('storefront')}
								className={`rounded-[calc(var(--radius-control)-2px)] px-2.5 py-1 font-medium transition ${
									roleViewMode === 'storefront' ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
								}`}>
								Storefront APIs
							</button>
							<button
								type="button"
								onClick={() => setRoleViewMode('developer')}
								className={`rounded-[calc(var(--radius-control)-2px)] px-2.5 py-1 font-medium transition ${
									roleViewMode === 'developer' ? 'bg-surface text-fg shadow-sm' : 'text-muted hover:text-fg'
								}`}>
								Product Developer SDK
							</button>
						</div>

						<div className="hidden sm:flex items-center gap-1.5 text-xs text-muted border-l border-line pl-3">
							<Icon name="user" size={14} />
							<span>Role:</span>
							<strong className="text-fg capitalize">{userRole}</strong>
						</div>
					</div>
				</header>

				{/* Two-Column Docs Explorer Layout */}
				<div className="flex flex-1 overflow-hidden">
					{/* Left Mega-Menu Sidebar */}
					<aside className="w-72 shrink-0 border-r border-line bg-surface/60 overflow-y-auto flex flex-col p-4 space-y-6">
						{/* Search Bar */}
						<div>
							<div className="relative">
								<span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-muted">
									<Icon name="search" size={14} />
								</span>
								<input
									type="text"
									placeholder="Search endpoints or guides..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full rounded-control border border-line bg-surface py-1.5 pl-8 pr-3 text-xs text-fg placeholder:text-muted focus:border-focus focus:outline-none"
								/>
							</div>
						</div>

						{/* Section: Getting Started */}
						<div className="space-y-1">
							<p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Getting Started</p>
							<button
								type="button"
								onClick={() => {
									setActiveSection('quickstart');
									setSelectedOpKey(null);
								}}
								className={`flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-xs font-medium transition ${
									activeSection === 'quickstart'
										? 'bg-primary/10 text-primary font-semibold'
										: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
								}`}>
								<Icon name="info" size={15} />
								<span>Quickstart for Developers and AI</span>
							</button>
							<button
								type="button"
								onClick={() => {
									setActiveSection('tokens');
									setSelectedOpKey(null);
								}}
								className={`flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-xs font-medium transition ${
									activeSection === 'tokens'
										? 'bg-primary/10 text-primary font-semibold'
										: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
								}`}>
								<Icon name="key" size={15} />
								<span>Authentication & Tokens</span>
							</button>
						</div>

						{/* Section: Catalog Products & Endpoints (Storefront View) */}
						<div className="space-y-2">
							<div className="flex items-center justify-between px-2">
								<p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Products & APIs</p>
								<span className="text-[10px] text-muted font-mono">{items.length} products</span>
							</div>

							<div className="space-y-1">
								{items.map((prod) => {
									const isSelected = selectedProductId === prod.productId;
									const isExpanded = isSelected && activeSection === 'products';
									return (
										<div key={prod.productId} className="space-y-0.5">
											<button
												type="button"
												onClick={() => {
													setSelectedProductId(prod.productId);
													setActiveSection('products');
													setSelectedOpKey(null);
												}}
												className={`flex w-full items-center justify-between rounded-control px-2.5 py-1.5 text-xs font-medium transition ${
													isSelected && !selectedOpKey && activeSection === 'products'
														? 'bg-primary/10 text-primary font-semibold'
														: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
												}`}>
												<div className="flex items-center gap-2 truncate">
													<span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-surface-2 font-mono text-[10px] text-muted">
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
														onClick={() => setSelectedOpKey(null)}
														className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] transition ${
															!selectedOpKey
																? 'bg-surface-2 text-primary font-semibold'
																: 'text-muted hover:text-fg'
														}`}>
														<Icon name="info" size={12} />
														<span>Overview & Embed</span>
													</button>

													{filteredOperations.slice(0, 30).map((/** @type {any} */ op) => {
														const opKey = `${op.method}:${op.path}`;
														const isOpActive = selectedOpKey === opKey;
														return (
															<button
																key={opKey}
																type="button"
																onClick={() => setSelectedOpKey(opKey)}
																className={`flex w-full items-center gap-1.5 rounded px-2 py-1 text-[11px] truncate transition ${
																	isOpActive
																		? 'bg-surface-2 text-primary font-semibold'
																		: 'text-muted hover:text-fg'
																}`}
																title={`${op.method} ${op.path}`}>
																<span
																	className={`font-mono text-[9px] px-1 py-0.2 rounded font-bold border ${methodColor(
																		op.method,
																	)}`}>
																	{op.method}
																</span>
																<span className="truncate font-mono">{op.path.replace(/^\/v1/, '')}</span>
															</button>
														);
													})}

													{filteredOperations.length > 30 ? (
														<p className="px-2 py-1 text-[10px] text-muted italic">
															+{filteredOperations.length - 30} more endpoints in spec
														</p>
													) : null}
												</div>
											) : null}
										</div>
									);
								})}
							</div>
						</div>

						{/* Section: Product Developer SDK (Visible for developer role or when toggled) */}
						{roleViewMode === 'developer' || isDeveloperRole ? (
							<div className="space-y-1 pt-2 border-t border-line">
								<div className="flex items-center justify-between px-2">
									<p className="text-[11px] font-semibold uppercase tracking-wider text-primary">
										Product Developer SDK
									</p>
									<span className="text-[10px] font-medium text-primary bg-primary/10 px-1 rounded">Core Kit</span>
								</div>
								{STATIC_SDK_GUIDES.map((guide) => (
									<button
										key={guide.id}
										type="button"
										onClick={() => {
											setActiveSection(`sdk-${guide.id}`);
											setSelectedOpKey(null);
										}}
										className={`flex w-full items-center gap-2 rounded-control px-2.5 py-1.5 text-xs font-medium transition ${
											activeSection === `sdk-${guide.id}`
												? 'bg-primary/10 text-primary font-semibold'
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
								className="flex items-center justify-between text-muted hover:text-fg px-2 py-1 rounded">
								<span>Catalog OpenAPI 3.1</span>
								<Icon name="external" size={12} />
							</a>
						</div>
					</aside>

					{/* Right Content Area: Interactive Swagger & Guides */}
					<main className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 max-w-5xl">
						{/* 1. Quickstart Section */}
						{activeSection === 'quickstart' ? (
							<section className="space-y-6">
								<div className="space-y-2">
									<Badge tone="primary">Storefront & AI Builder Guide</Badge>
									<h1 className="text-2xl font-bold tracking-tight">Quickstart for Developers and AI</h1>
									<p className="text-sm text-muted leading-relaxed">
										Shelfway connects modular products (Accounts, Notifications, Chat, Payments, Ecommerce, Growth) to
										merchants' websites. Storefront developers and AI agents build directly against our public widget
										scripts and backend REST APIs using credentials from the merchant's <strong>Developer Pack</strong>.
									</p>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<div className="rounded-card border border-line bg-surface p-5 space-y-2">
										<div className="flex items-center gap-2 text-primary font-semibold text-sm">
											<Icon name="globe" size={16} />
											<span>1. Merchant Onboarding</span>
										</div>
										<p className="text-xs text-muted leading-relaxed">
											Merchants add their website domain in the Shelfway Portal, place desired products, and generate a
											single-file <strong>Developer Pack</strong>.
										</p>
									</div>

									<div className="rounded-card border border-line bg-surface p-5 space-y-2">
										<div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm">
											<Icon name="shield" size={16} />
											<span>2. Isolated Credentials</span>
										</div>
										<p className="text-xs text-muted leading-relaxed">
											External developers and AI agents receive website-bound tokens. They build the storefront and{' '}
											<strong>never</strong> need Portal logins or internal source code access.
										</p>
									</div>
								</div>

								<div className="rounded-card border border-line bg-surface p-6 space-y-4">
									<h2 className="text-base font-semibold">Everyday Development Path</h2>
									<ol className="list-decimal list-inside space-y-2 text-xs text-muted leading-relaxed">
										<li>
											Merchant opens Portal: <code>Websites → [Your Website] → Developer Pack</code>.
										</li>
										<li>Merchant passes the generated tokens and API base URLs to their developer or AI prompt.</li>
										<li>Paste client-side widget scripts into your HTML layout with your public Browser Token.</li>
										<li>Call backend REST APIs from your server backend using your private Server Bearer Token.</li>
									</ol>
								</div>
							</section>
						) : null}

						{/* 2. Authentication & Tokens Section */}
						{activeSection === 'tokens' ? (
							<section className="space-y-6">
								<div className="space-y-2">
									<Badge tone="info">Credentials Architecture</Badge>
									<h1 className="text-2xl font-bold tracking-tight">Authentication & Tokens</h1>
									<p className="text-sm text-muted leading-relaxed">
										Shelfway enforces strictly typed credentials. Browser tokens, server tokens, configure sessions, and
										staff tickets are mutually exclusive and never cross-authorized.
									</p>
								</div>

								<div className="space-y-4">
									<div className="rounded-card border border-blue-500/20 bg-blue-500/5 p-5 space-y-2">
										<div className="flex items-center justify-between">
											<span className="font-semibold text-sm text-blue-600 dark:text-blue-400">
												Browser Token (Public Client-side)
											</span>
											<span className="text-[10px] font-mono bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">
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

									<div className="rounded-card border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-2">
										<div className="flex items-center justify-between">
											<span className="font-semibold text-sm text-emerald-600 dark:text-emerald-400">
												Server Token (Private Backend Secret)
											</span>
											<span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">
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
										<div className="flex items-center gap-2">
											<h1 className="text-2xl font-bold tracking-tight">{currentProduct.name}</h1>
											<span className="font-mono text-xs bg-surface-2 text-muted px-2 py-0.5 rounded">
												v{currentProduct.version}
											</span>
											<span className="font-mono text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded">
												active
											</span>
										</div>
										<p className="text-sm text-muted">{currentProduct.description}</p>
									</div>

									<div className="flex items-center gap-2">
										<a
											href={`/docs/${currentProduct.productId}/openapi.json`}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex items-center gap-1.5 rounded-control border border-line bg-surface px-3 py-1.5 text-xs font-medium text-fg hover:bg-surface-2 transition">
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
										<h2 className="text-sm font-semibold">Capabilities & Feature Switches</h2>
										<div className="grid gap-2 sm:grid-cols-2">
											{currentProduct.features.map((/** @type {any} */ f) => (
												<div key={f.key} className="rounded-control border border-line bg-surface p-3 space-y-1">
													<div className="flex items-center justify-between">
														<span className="text-xs font-semibold text-fg">{f.name}</span>
														<code className="text-[10px] text-muted font-mono">{f.key}</code>
													</div>
													{f.description ? <p className="text-xs text-muted">{f.description}</p> : null}
												</div>
											))}
										</div>
									</div>
								) : null}

								{/* Endpoints Table Overview */}
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<h2 className="text-sm font-semibold">Available API Operations ({operations.length})</h2>
										<span className="text-xs text-muted">Click any operation to view interactive Swagger docs</span>
									</div>

									<div className="rounded-card border border-line bg-surface overflow-hidden divide-y divide-line">
										{operations.slice(0, 50).map((/** @type {any} */ op) => {
											const opKey = `${op.method}:${op.path}`;
											return (
												<button
													key={opKey}
													type="button"
													onClick={() => setSelectedOpKey(opKey)}
													className="flex w-full items-center justify-between p-3 text-left hover:bg-surface-2 transition group">
													<div className="flex items-center gap-3 truncate">
														<span
															className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold border ${methodColor(
																op.method,
															)}`}>
															{op.method}
														</span>
														<span className="font-mono text-xs text-fg group-hover:text-primary transition truncate">
															{op.path}
														</span>
													</div>
													<span className="text-xs text-muted truncate ml-4 max-w-xs">{op.summary}</span>
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
											onClick={() => setSelectedOpKey(null)}
											className="text-xs text-muted hover:text-fg flex items-center gap-1 transition">
											← Back to {currentProduct?.name || 'Product'} Overview
										</button>
									</div>

									<div className="flex flex-wrap items-center gap-2.5">
										<span
											className={`font-mono text-xs px-2.5 py-1 rounded font-bold border ${methodColor(
												currentOperation.method,
											)}`}>
											{currentOperation.method}
										</span>
										<code className="font-mono text-base font-semibold text-fg">{currentOperation.path}</code>
										<button
											type="button"
											onClick={() => copyCode('path', currentOperation.path)}
											className="text-xs text-muted hover:text-fg px-1.5 py-0.5 rounded border border-line">
											{copiedNotice === 'path' ? 'Copied ✓' : 'Copy'}
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
											<span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">
												Perm: {currentOperation.permission}
											</span>
										) : null}
									</div>
								</div>

								{/* Parameters Table */}
								{currentOperation.parameters && currentOperation.parameters.length > 0 ? (
									<div className="space-y-3">
										<h3 className="text-sm font-semibold">Parameters</h3>
										<div className="rounded-card border border-line bg-surface overflow-hidden">
											<table className="w-full text-left text-xs">
												<thead className="border-b border-line bg-surface-2 text-muted">
													<tr>
														<th className="p-2.5">Name</th>
														<th className="p-2.5">In</th>
														<th className="p-2.5">Type</th>
														<th className="p-2.5">Required</th>
														<th className="p-2.5">Description</th>
													</tr>
												</thead>
												<tbody className="divide-y divide-line">
													{currentOperation.parameters.map((/** @type {any} */ p, /** @type {number} */ idx) => {
														const paramObj = p.name ? p : p.$ref ? { name: p.$ref.split('/').pop(), in: 'ref' } : p;
														return (
															<tr key={paramObj.name || idx}>
																<td className="p-2.5 font-mono font-medium text-fg">{paramObj.name}</td>
																<td className="p-2.5 font-mono text-muted">{paramObj.in || 'query'}</td>
																<td className="p-2.5 font-mono text-primary">
																	{paramObj.schema?.type || 'string'}
																</td>
																<td className="p-2.5">
																	{paramObj.required ? (
																		<span className="text-rose-600 font-bold">required</span>
																	) : (
																		<span className="text-muted">optional</span>
																	)}
																</td>
																<td className="p-2.5 text-muted">{paramObj.description || '—'}</td>
															</tr>
														);
													})}
												</tbody>
											</table>
										</div>
									</div>
								) : null}

								{/* Request Body Specification (for mutations) */}
								{currentOperation.requestBody ? (
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<h3 className="text-sm font-semibold">Request Body (application/json)</h3>
											<span className="text-xs text-muted">JSON Schema & Example</span>
										</div>
										{(() => {
											const reqSchema = currentOperation.requestBody?.content?.['application/json']?.schema;
											const samplePayload = reqSchema ? sampleFromSchema(reqSchema, currentProduct?.components) : {};
											return <CodeBlock code={JSON.stringify(samplePayload, null, 2)} label="Example JSON Request" />;
										})()}
									</div>
								) : null}

								{/* Responses Specification */}
								{currentOperation.responses ? (
									<div className="space-y-3">
										<h3 className="text-sm font-semibold">Responses</h3>
										<div className="flex items-center gap-1 border-b border-line pb-2">
											{Object.keys(currentOperation.responses).map((status) => (
												<button
													key={status}
													type="button"
													onClick={() => setActiveResponseStatus(status)}
													className={`rounded px-2.5 py-1 text-xs font-mono transition ${
														activeResponseStatus === status
															? 'bg-primary text-white font-semibold'
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
										<div className="flex items-center rounded bg-surface-2 p-0.5 text-xs">
											<button
												type="button"
												onClick={() => setActiveSnippetTab('curl')}
												className={`rounded px-2 py-0.5 font-medium transition ${
													activeSnippetTab === 'curl' ? 'bg-surface text-fg font-semibold' : 'text-muted'
												}`}>
												cURL
											</button>
											<button
												type="button"
												onClick={() => setActiveSnippetTab('fetch')}
												className={`rounded px-2 py-0.5 font-medium transition ${
													activeSnippetTab === 'fetch' ? 'bg-surface text-fg font-semibold' : 'text-muted'
												}`}>
												JavaScript
											</button>
										</div>
									</div>

									{activeSnippetTab === 'curl' ? (
										<CodeBlock
											code={`curl -X ${currentOperation.method} "${apiBase}${currentOperation.path}" \\\n  -H "Authorization: Bearer YOUR_WEBSITE_SERVER_TOKEN" \\\n  -H "Content-Type: application/json"${
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
									) : (
										<CodeBlock
											code={`const response = await fetch("${apiBase}${currentOperation.path}", {\n  method: "${currentOperation.method}",\n  headers: {\n    "Authorization": "Bearer YOUR_WEBSITE_SERVER_TOKEN",\n    "Content-Type": "application/json"\n  }${
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
												<Badge tone="primary">Product Developer SDK</Badge>
												<h1 className="text-2xl font-bold tracking-tight">{guide.title}</h1>
												<p className="text-sm text-muted">{guide.summary}</p>
											</div>

											{guide.commands ? (
												<div className="space-y-3">
													<h2 className="text-sm font-semibold">Commands</h2>
													{guide.commands.map((c) => (
														<div key={c.cmd} className="rounded-card border border-line bg-surface p-4 space-y-2">
															<code className="text-xs font-mono font-bold text-primary block">{c.cmd}</code>
															<p className="text-xs text-muted">{c.desc}</p>
														</div>
													))}
												</div>
											) : null}

											{guide.points ? (
												<div className="rounded-card border border-line bg-surface p-5 space-y-3">
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
					</main>
				</div>
			</div>
		</ToastProvider>
	);
}
