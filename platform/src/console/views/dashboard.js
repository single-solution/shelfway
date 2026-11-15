'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, ButtonLink, CodeBlock, Icon, Input, ToastProvider } from '@shelfway/ui';
import { openSignInModal } from '../../../app/_components/SiteNav.js';
import { apiFetch } from '../client.js';

/**
 * Standard Universal Micro-Products supported across Shelfway
 */
const UNIVERSAL_PRODUCTS = [
	{ productId: 'accounts', name: 'Accounts', description: 'Visitor authentication, shopper profiles, and staff access.' },
	{ productId: 'chat', name: 'Chat', description: 'Real-time visitor chat with AI agent and staff live desk.' },
	{ productId: 'ecommerce', name: 'Ecommerce', description: 'Cart pricing, catalog, order dispatching, and checkout.' },
	{ productId: 'payments', name: 'Payments', description: 'Payment methods, manual bank transfers, and webhooks.' },
	{
		productId: 'notifications',
		name: 'Notifications',
		description: 'Transactional emails, order alerts, and staff notifications.',
	},
	{ productId: 'growth', name: 'Growth', description: 'Visitor funnels, conversion tracking, analytics, and SEO.' },
];

/**
 * DashboardHubView: The unified, role-based dashboard surface for all personas.
 * - Admin: Platform oversight, merchants, product registry, ledger billing, audit activity.
 * - Merchant: Connected websites, placed products, developer pack & tokens, credits.
 * - Staff: Assigned website operational desks, chat inbox, storefront orders.
 *
 * @param {{
 *   branding?: { name?: string, accent?: string, logoUrl?: string | null } | null,
 *   session?: any,
 *   initialSection?: string,
 *   initialData?: any,
 *   initialToken?: string,
 * }} props
 */
export function DashboardHubView({
	branding = null,
	session = null,
	initialSection = '',
	initialData = null,
	initialToken = '',
}) {
	const brandName = branding?.name || 'Shelfway';
	const [token, setToken] = useState(initialToken);
	const [tokenInput, setTokenInput] = useState('');
	const [clientSession, setClientSession] = useState(session);
	const [searchQuery, setSearchQuery] = useState('');
	const [activeSection, setActiveSection] = useState(initialSection || 'overview');

	// Fetch live session if not passed initially
	useEffect(() => {
		if (session) {
			setClientSession(session);
			return;
		}
		let cancelled = false;
		apiFetch('/v1/me', { redirectOn401: false }).then((res) => {
			if (!cancelled && res.ok && res.data) {
				const d = res.data;
				const isAdm = d.kind === 'admin';
				setClientSession({
					ok: true,
					kind: d.kind,
					admin: isAdm ? d.admin : undefined,
					merchantId: d.merchant?.merchantId,
					actor: {
						role: isAdm ? d.admin?.role || 'owner' : d.actor?.role || 'owner',
						name: isAdm ? d.admin?.name || 'Admin' : d.actor?.name || d.merchant?.name || 'Merchant',
						email: isAdm ? d.admin?.email : d.actor?.email || d.merchant?.email,
					},
					role: isAdm ? d.admin?.role || 'owner' : d.actor?.role || 'owner',
					name: isAdm ? d.admin?.name || 'Admin' : d.actor?.name || d.merchant?.name || 'Merchant',
					email: isAdm ? d.admin?.email : d.actor?.email || d.merchant?.email,
				});
			}
		});
		return () => {
			cancelled = true;
		};
	}, [session]);

	// Listen for browser back/forward navigation
	useEffect(() => {
		const onPopState = () => {
			if (typeof window === 'undefined') return;
			const seg = window.location.pathname.replace(/^\/dashboard\/?/, '').split('/')[0];
			setActiveSection(seg || 'overview');
		};
		window.addEventListener('popstate', onPopState);
		return () => window.removeEventListener('popstate', onPopState);
	}, []);

	const effectiveSession = clientSession || session;
	const userRole = effectiveSession?.role || effectiveSession?.actor?.role || (token ? 'developer' : null);
	const userKind =
		effectiveSession?.kind || (userRole === 'owner' || userRole === 'support' || userRole === 'finance' ? 'admin' : 'merchant');
	const isUnlocked = Boolean(effectiveSession?.ok || token);

	/** @param {string} sec */
	const selectSection = (sec) => {
		setActiveSection(sec);
		if (typeof window !== 'undefined') {
			const targetPath = !sec || sec === 'overview' ? '/dashboard' : `/dashboard/${sec}`;
			window.history.pushState(null, '', targetPath);
		}
	};

	/** @param {any} [e] */
	const handleUnlockWithToken = (e) => {
		e?.preventDefault();
		if (!tokenInput.trim()) return;
		let extractedToken = tokenInput.trim();
		try {
			if (extractedToken.includes('http://') || extractedToken.includes('https://') || extractedToken.includes('?')) {
				const parsed = new URL(extractedToken.startsWith('http') ? extractedToken : `https://dummy.com/${extractedToken}`);
				const tokParam = parsed.searchParams.get('token');
				if (tokParam) extractedToken = tokParam;
			}
		} catch {
			// keep raw string
		}
		setToken(extractedToken);
		setTokenInput('');
	};

	// Sample data fallbacks for initial display
	const adminMerchants = useMemo(() => {
		const raw = initialData?.merchants?.items || [];
		if (raw.length > 0) return raw;
		return [
			{
				merchantId: 'm_demo_1',
				name: 'Ibrahim Mobile Store',
				email: 'ibrahim@example.com',
				websiteCount: 2,
				status: 'active',
				createdAt: '2026-11-01',
			},
			{
				merchantId: 'm_demo_2',
				name: 'Urban Retailers Co',
				email: 'support@urbanretail.com',
				websiteCount: 1,
				status: 'active',
				createdAt: '2026-11-04',
			},
		];
	}, [initialData]);

	const merchantWebsites = useMemo(() => {
		const raw = initialData?.websites?.rows || initialData?.overview?.rows || [];
		if (raw.length > 0) return raw;
		return [
			{
				websiteId: 'ws_demo_ibrahim',
				domain: 'ibrahimmobiles.com',
				productCount: 4,
				dailyCost: 120,
				status: 'active',
				products: ['accounts', 'chat', 'ecommerce', 'notifications'],
			},
		];
	}, [initialData]);

	// Filtered lists based on search
	const filteredMerchants = useMemo(() => {
		if (!searchQuery.trim()) return adminMerchants;
		const q = searchQuery.toLowerCase();
		return adminMerchants.filter(
			(/** @type {any} */ m) =>
				m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.merchantId.toLowerCase().includes(q),
		);
	}, [adminMerchants, searchQuery]);

	const filteredWebsites = useMemo(() => {
		if (!searchQuery.trim()) return merchantWebsites;
		const q = searchQuery.toLowerCase();
		return merchantWebsites.filter(
			(/** @type {any} */ w) => w.domain.toLowerCase().includes(q) || (w.websiteId && w.websiteId.toLowerCase().includes(q)),
		);
	}, [merchantWebsites, searchQuery]);

	// Unauthenticated / Locked Access Gate
	if (!isUnlocked) {
		return (
			<ToastProvider>
				<div className="flex flex-col items-center justify-center min-h-[65vh] py-16 px-4">
					<div className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-card space-y-5">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
								<Icon name="key" size={20} />
							</div>
							<div>
								<h1 className="text-base font-bold text-fg">Dashboard Access Restricted</h1>
								<p className="text-xs text-muted">Sign in with an active Admin, Merchant, or Staff account.</p>
							</div>
						</div>

						<p className="text-xs text-muted leading-relaxed">
							The Shelfway Dashboard is unified for all organizational roles. Sign in to view your websites,
							micro-products, developer tokens, and platform controls.
						</p>

						<div className="pt-2 flex flex-col gap-3">
							<Button
								block
								variant="primary"
								onClick={() => openSignInModal('/dashboard')}
								className="font-medium text-xs">
								Sign In to Dashboard
							</Button>

							<div className="relative flex items-center justify-center py-2">
								<span className="w-full border-t border-line" />
								<span className="absolute bg-surface px-2 text-[10px] uppercase font-mono text-muted tracking-wider">
									Or unlock with token
								</span>
							</div>

							<div className="flex items-center gap-2">
								<Input
									label="User unique token"
									hideLabel
									placeholder="Paste developer or setup token..."
									value={tokenInput}
									onChange={(e) => setTokenInput(e.currentTarget.value)}
									className="flex-1"
								/>
								<Button variant="secondary" size="sm" onClick={handleUnlockWithToken} disabled={!tokenInput.trim()}>
									Unlock
								</Button>
							</div>
						</div>
					</div>
				</div>
			</ToastProvider>
		);
	}

	return (
		<ToastProvider>
			<div className="dashboard-container flex flex-col flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
				<div className="relative z-10 flex flex-col md:flex-row gap-6 flex-1 items-start">
					{/* Left Navigation Sidebar */}
					<aside className="w-full md:w-72 lg:w-80 shrink-0 rounded-card border border-line bg-surface flex flex-col md:sticky md:top-20 self-start max-h-[calc(100vh-6rem)] shadow-card overflow-hidden">
						<div className="flex-1 overflow-y-auto shelfway-scroll p-4 space-y-6">
							{/* Sidebar Header Title */}
							<div className="px-1 flex items-center justify-between gap-2">
								<span className="text-xs font-bold tracking-tight text-fg font-mono uppercase truncate">
									{brandName} Dashboard
								</span>
								<Badge tone={userKind === 'admin' ? 'primary' : userRole === 'operator' ? 'warning' : 'success'}>
									{userKind === 'admin'
										? `Admin (${userRole || 'owner'})`
										: userRole === 'operator'
											? 'Staff'
											: 'Merchant'}
								</Badge>
							</div>

							{/* Search Filter */}
							<div>
								<Input
									label="Search dashboard"
									hideLabel
									type="search"
									placeholder={
										userKind === 'admin' ? 'Search merchants or products...' : 'Search websites or products...'
									}
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.currentTarget.value)}
								/>
							</div>

							{/* Navigation Sections */}
							<nav aria-label="Dashboard Navigation" className="space-y-1">
								{/* Overview (All Personas) */}
								<Button
									block
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => selectSection('overview')}
									className={`w-full !flex !items-center !justify-start gap-2.5 rounded-control px-3 py-2 text-xs font-medium transition ${
										activeSection === 'overview'
											? 'bg-primary/10 text-primary font-semibold'
											: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
									}`}>
									<Icon name="grid" size={15} />
									<span>Overview</span>
								</Button>

								{/* Admin Navigation */}
								{userKind === 'admin' ? (
									<>
										<Button
											block
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => selectSection('merchants')}
											className={`w-full !flex !items-center !justify-start gap-2.5 rounded-control px-3 py-2 text-xs font-medium transition ${
												activeSection === 'merchants'
													? 'bg-primary/10 text-primary font-semibold'
													: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
											}`}>
											<Icon name="users" size={15} />
											<span>Merchants</span>
											<span className="ml-auto font-mono text-[10px] text-muted">({adminMerchants.length})</span>
										</Button>

										<Button
											block
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => selectSection('catalog')}
											className={`w-full !flex !items-center !justify-start gap-2.5 rounded-control px-3 py-2 text-xs font-medium transition ${
												activeSection === 'catalog'
													? 'bg-primary/10 text-primary font-semibold'
													: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
											}`}>
											<Icon name="box" size={15} />
											<span>Catalog &amp; Products</span>
										</Button>

										<Button
											block
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => selectSection('finance')}
											className={`w-full !flex !items-center !justify-start gap-2.5 rounded-control px-3 py-2 text-xs font-medium transition ${
												activeSection === 'finance'
													? 'bg-primary/10 text-primary font-semibold'
													: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
											}`}>
											<Icon name="creditCard" size={15} />
											<span>Finance &amp; Ledger</span>
										</Button>

										<Button
											block
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => selectSection('system')}
											className={`w-full !flex !items-center !justify-start gap-2.5 rounded-control px-3 py-2 text-xs font-medium transition ${
												activeSection === 'system'
													? 'bg-primary/10 text-primary font-semibold'
													: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
											}`}>
											<Icon name="activity" size={15} />
											<span>System Activity</span>
										</Button>

										<Button
											block
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => selectSection('admins')}
											className={`w-full !flex !items-center !justify-start gap-2.5 rounded-control px-3 py-2 text-xs font-medium transition ${
												activeSection === 'admins'
													? 'bg-primary/10 text-primary font-semibold'
													: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
											}`}>
											<Icon name="shield" size={15} />
											<span>Administrators</span>
										</Button>

										<Button
											block
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => selectSection('account')}
											className={`w-full !flex !items-center !justify-start gap-2.5 rounded-control px-3 py-2 text-xs font-medium transition ${
												activeSection === 'account'
													? 'bg-primary/10 text-primary font-semibold'
													: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
											}`}>
											<Icon name="user" size={15} />
											<span>My Account</span>
										</Button>
									</>
								) : null}

								{/* Merchant Navigation */}
								{userKind === 'merchant' ? (
									<>
										<Button
											block
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => selectSection('websites')}
											className={`w-full !flex !items-center !justify-start gap-2.5 rounded-control px-3 py-2 text-xs font-medium transition ${
												activeSection === 'websites'
													? 'bg-primary/10 text-primary font-semibold'
													: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
											}`}>
											<Icon name="globe" size={15} />
											<span>Websites</span>
											<span className="ml-auto font-mono text-[10px] text-muted">({merchantWebsites.length})</span>
										</Button>

										<Button
											block
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => selectSection('products')}
											className={`w-full !flex !items-center !justify-start gap-2.5 rounded-control px-3 py-2 text-xs font-medium transition ${
												activeSection === 'products'
													? 'bg-primary/10 text-primary font-semibold'
													: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
											}`}>
											<Icon name="box" size={15} />
											<span>Placed Products</span>
										</Button>

										<Button
											block
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => selectSection('tokens')}
											className={`w-full !flex !items-center !justify-start gap-2.5 rounded-control px-3 py-2 text-xs font-medium transition ${
												activeSection === 'tokens'
													? 'bg-primary/10 text-primary font-semibold'
													: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
											}`}>
											<Icon name="key" size={15} />
											<span>Developer Tokens</span>
										</Button>

										<Button
											block
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => selectSection('billing')}
											className={`w-full !flex !items-center !justify-start gap-2.5 rounded-control px-3 py-2 text-xs font-medium transition ${
												activeSection === 'billing'
													? 'bg-primary/10 text-primary font-semibold'
													: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
											}`}>
											<Icon name="creditCard" size={15} />
											<span>Credits &amp; Billing</span>
										</Button>

										<Button
											block
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => selectSection('account')}
											className={`w-full !flex !items-center !justify-start gap-2.5 rounded-control px-3 py-2 text-xs font-medium transition ${
												activeSection === 'account'
													? 'bg-primary/10 text-primary font-semibold'
													: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
											}`}>
											<Icon name="user" size={15} />
											<span>My Account</span>
										</Button>
									</>
								) : null}

								{/* Staff Operations Navigation */}
								{userRole === 'operator' ? (
									<>
										<Button
											block
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => selectSection('assigned-stores')}
											className={`w-full !flex !items-center !justify-start gap-2.5 rounded-control px-3 py-2 text-xs font-medium transition ${
												activeSection === 'assigned-stores'
													? 'bg-primary/10 text-primary font-semibold'
													: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
											}`}>
											<Icon name="globe" size={15} />
											<span>Assigned Stores</span>
										</Button>

										<Button
											block
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => selectSection('operations-desk')}
											className={`w-full !flex !items-center !justify-start gap-2.5 rounded-control px-3 py-2 text-xs font-medium transition ${
												activeSection === 'operations-desk'
													? 'bg-primary/10 text-primary font-semibold'
													: 'text-fg/80 hover:bg-surface-2 hover:text-fg'
											}`}>
											<Icon name="mail" size={15} />
											<span>Live Chat &amp; Orders Desk</span>
										</Button>
									</>
								) : null}
							</nav>

							{/* Documentation Link */}
							<div className="pt-4 border-t border-line">
								<ButtonLink
									block
									href="/docs"
									variant="ghost"
									size="sm"
									className="w-full !flex !items-center !justify-start gap-2 text-xs text-muted hover:text-fg">
									<Icon name="code" size={14} />
									<span>Explore API Docs</span>
								</ButtonLink>
							</div>
						</div>
					</aside>

					{/* Right Content Area */}
					<div className="flex-1 min-w-0 w-full space-y-6">
						{/* 1. Overview Section */}
						{activeSection === 'overview' ? (
							<section className="space-y-6">
								<div className="border-b border-line pb-4">
									<h1 className="text-xl sm:text-2xl font-bold text-fg tracking-tight">
										{userKind === 'admin'
											? 'Platform Administration'
											: userRole === 'operator'
												? 'Staff Operations Desk'
												: 'Merchant Storefront Hub'}
									</h1>
									<p className="text-xs text-muted mt-1">
										{userKind === 'admin'
											? 'Monitor platform merchants, registered micro-products, and billing ledger.'
											: userRole === 'operator'
												? 'Manage live customer conversations and storefront operations across assigned websites.'
												: 'Manage your connected websites, placed micro-products, and developer credentials.'}
									</p>
								</div>

								{/* Stat Cards */}
								<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
									{userKind === 'admin' ? (
										<>
											<div className="rounded-card border border-line bg-surface p-4 shadow-card">
												<span className="text-[11px] font-mono text-muted uppercase">Total Merchants</span>
												<div className="text-2xl font-bold text-fg mt-1">{adminMerchants.length}</div>
												<span className="text-[10px] text-emerald-600 font-medium">All systems active</span>
											</div>
											<div className="rounded-card border border-line bg-surface p-4 shadow-card">
												<span className="text-[11px] font-mono text-muted uppercase">Total Websites</span>
												<div className="text-2xl font-bold text-fg mt-1">
													{adminMerchants.reduce(
														(/** @type {number} */ sum, /** @type {any} */ m) => sum + (m.websiteCount || 0),
														0,
													)}
												</div>
												<span className="text-[10px] text-muted">Across cluster</span>
											</div>
											<div className="rounded-card border border-line bg-surface p-4 shadow-card">
												<span className="text-[11px] font-mono text-muted uppercase">Micro-Products</span>
												<div className="text-2xl font-bold text-fg mt-1">{UNIVERSAL_PRODUCTS.length}</div>
												<span className="text-[10px] text-primary font-medium">Manifest verified</span>
											</div>
											<div className="rounded-card border border-line bg-surface p-4 shadow-card">
												<span className="text-[11px] font-mono text-muted uppercase">Platform Health</span>
												<div className="text-2xl font-bold text-emerald-600 mt-1">100%</div>
												<span className="text-[10px] text-muted">Readiness probes OK</span>
											</div>
										</>
									) : (
										<>
											<div className="rounded-card border border-line bg-surface p-4 shadow-card">
												<span className="text-[11px] font-mono text-muted uppercase">Connected Websites</span>
												<div className="text-2xl font-bold text-fg mt-1">{merchantWebsites.length}</div>
												<span className="text-[10px] text-emerald-600 font-medium">Live domains</span>
											</div>
											<div className="rounded-card border border-line bg-surface p-4 shadow-card">
												<span className="text-[11px] font-mono text-muted uppercase">Placed Products</span>
												<div className="text-2xl font-bold text-fg mt-1">
													{merchantWebsites.reduce(
														(/** @type {number} */ sum, /** @type {any} */ w) => sum + (w.productCount || 0),
														0,
													)}
												</div>
												<span className="text-[10px] text-primary font-medium">Configured &amp; active</span>
											</div>
											<div className="rounded-card border border-line bg-surface p-4 shadow-card">
												<span className="text-[11px] font-mono text-muted uppercase">Credits Balance</span>
												<div className="text-2xl font-bold text-fg mt-1">50,000</div>
												<span className="text-[10px] text-muted">Millicredits</span>
											</div>
											<div className="rounded-card border border-line bg-surface p-4 shadow-card">
												<span className="text-[11px] font-mono text-muted uppercase">Status</span>
												<div className="text-2xl font-bold text-emerald-600 mt-1">Active</div>
												<span className="text-[10px] text-muted">Good standing</span>
											</div>
										</>
									)}
								</div>

								{/* Quick Access List */}
								{userKind === 'admin' ? (
									<div className="rounded-card border border-line bg-surface p-5 space-y-4 shadow-card">
										<div className="flex items-center justify-between">
											<h2 className="text-sm font-semibold text-fg">Recent Registered Merchants</h2>
											<Button
												size="sm"
												variant="ghost"
												onClick={() => selectSection('merchants')}
												className="text-primary text-xs">
												View All Merchants
											</Button>
										</div>
										<div className="divide-y divide-line text-xs">
											{adminMerchants.slice(0, 3).map((/** @type {any} */ m) => (
												<div key={m.merchantId} className="py-2.5 flex items-center justify-between">
													<div>
														<div className="font-semibold text-fg">{m.name}</div>
														<div className="font-mono text-muted text-[11px]">{m.email}</div>
													</div>
													<div className="flex items-center gap-2">
														<Badge tone="success" dot>
															{m.status}
														</Badge>
														<span className="font-mono text-muted text-[11px]">{m.websiteCount} websites</span>
													</div>
												</div>
											))}
										</div>
									</div>
								) : (
									<div className="rounded-card border border-line bg-surface p-5 space-y-4 shadow-card">
										<div className="flex items-center justify-between">
											<h2 className="text-sm font-semibold text-fg">Your Storefront Websites</h2>
											<Button
												size="sm"
												variant="ghost"
												onClick={() => selectSection('websites')}
												className="text-primary text-xs">
												Manage All Websites
											</Button>
										</div>
										<div className="divide-y divide-line text-xs">
											{merchantWebsites.map((/** @type {any} */ w) => (
												<div
													key={w.websiteId}
													className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
													<div>
														<div className="font-semibold text-fg text-sm">{w.domain}</div>
														<div className="font-mono text-muted text-[11px]">{w.productCount} placed products</div>
													</div>
													<div className="flex items-center gap-2">
														<Badge tone="success" dot>
															{w.status}
														</Badge>
														<ButtonLink size="sm" variant="secondary" href={`/websites/${w.websiteId}`}>
															Configure Website
														</ButtonLink>
													</div>
												</div>
											))}
										</div>
									</div>
								)}
							</section>
						) : null}

						{/* 2. Admin: Merchants Section */}
						{activeSection === 'merchants' && userKind === 'admin' ? (
							<section className="space-y-4">
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-4">
									<div>
										<h1 className="text-xl font-bold text-fg">Platform Merchants</h1>
										<p className="text-xs text-muted">
											Manage all registered merchant accounts, websites, and subscriptions.
										</p>
									</div>
								</div>

								<div className="rounded-card border border-line bg-surface overflow-hidden shadow-card" role="table">
									<div
										className="grid grid-cols-12 border-b border-line bg-surface-2 p-3 text-xs font-semibold text-muted"
										role="row">
										<div className="col-span-4" role="columnheader">
											Merchant
										</div>
										<div className="col-span-3" role="columnheader">
											ID
										</div>
										<div className="col-span-2" role="columnheader">
											Websites
										</div>
										<div className="col-span-3 text-right" role="columnheader">
											Status
										</div>
									</div>
									<div className="divide-y divide-line text-xs" role="rowgroup">
										{filteredMerchants.map((/** @type {any} */ m) => (
											<div
												key={m.merchantId}
												className="grid grid-cols-12 p-3 items-center hover:bg-surface-2/40 transition"
												role="row">
												<div className="col-span-4" role="cell">
													<div className="font-semibold text-fg">{m.name}</div>
													<div className="text-muted text-[11px]">{m.email}</div>
												</div>
												<div className="col-span-3 font-mono text-muted" role="cell">
													{m.merchantId}
												</div>
												<div className="col-span-2 font-mono text-fg" role="cell">
													{m.websiteCount}
												</div>
												<div className="col-span-3 text-right" role="cell">
													<Badge tone="success">{m.status}</Badge>
												</div>
											</div>
										))}
									</div>
								</div>
							</section>
						) : null}

						{/* 3. Merchant: Websites Section */}
						{activeSection === 'websites' && userKind === 'merchant' ? (
							<section className="space-y-4">
								<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-4">
									<div>
										<h1 className="text-xl font-bold text-fg">Websites &amp; Storefronts</h1>
										<p className="text-xs text-muted">Websites connected to your Shelfway merchant account.</p>
									</div>
								</div>

								<div className="space-y-3">
									{filteredWebsites.map((/** @type {any} */ w) => (
										<div
											key={w.websiteId}
											className="rounded-card border border-line bg-surface p-5 space-y-4 shadow-card">
											<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line pb-3">
												<div>
													<div className="flex items-center gap-2">
														<span className="font-bold text-base text-fg">{w.domain}</span>
														<Badge tone="success" dot>
															{w.status}
														</Badge>
													</div>
													<p className="font-mono text-xs text-muted mt-0.5">ID: {w.websiteId}</p>
												</div>
												<div className="flex items-center gap-2">
													<ButtonLink size="sm" variant="primary" href={`/websites/${w.websiteId}`}>
														Website Settings
													</ButtonLink>
												</div>
											</div>

											<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
												<div>
													<span className="text-muted block">Placed Products</span>
													<span className="font-semibold text-fg font-mono">{w.productCount} products</span>
												</div>
												<div>
													<span className="text-muted block">Daily Cost</span>
													<span className="font-semibold text-fg font-mono">{w.dailyCost} millicredits</span>
												</div>
												<div>
													<span className="text-muted block">SSL &amp; Domain</span>
													<span className="font-semibold text-emerald-600">Verified</span>
												</div>
												<div>
													<span className="text-muted block">Developer Pack</span>
													<span className="font-semibold text-primary">Generated</span>
												</div>
											</div>
										</div>
									))}
								</div>
							</section>
						) : null}

						{/* 4. Products & Catalog Section (Common) */}
						{activeSection === 'products' || activeSection === 'catalog' ? (
							<section className="space-y-4">
								<div className="border-b border-line pb-4">
									<h1 className="text-xl font-bold text-fg">
										{userKind === 'admin' ? 'Universal Micro-Products Catalog' : 'Placed Micro-Products'}
									</h1>
									<p className="text-xs text-muted">
										{userKind === 'admin'
											? 'Autonomous products connected to the platform cluster. All conform to standard OpenAPI specifications.'
											: 'Configure micro-products placed on your active websites.'}
									</p>
								</div>

								<div className="grid gap-3 sm:grid-cols-2">
									{UNIVERSAL_PRODUCTS.map((prod) => (
										<div
											key={prod.productId}
											className="rounded-card border border-line bg-surface p-4 space-y-3 shadow-card flex flex-col justify-between">
											<div className="space-y-1.5">
												<div className="flex items-center justify-between">
													<div className="flex items-center gap-2">
														<span className="flex h-5 w-5 items-center justify-center rounded bg-primary/10 text-primary font-bold text-xs">
															{prod.name.slice(0, 1)}
														</span>
														<span className="font-semibold text-sm text-fg">{prod.name}</span>
													</div>
													<Badge tone="success" dot>
														active
													</Badge>
												</div>
												<p className="text-xs text-muted leading-relaxed">{prod.description}</p>
											</div>

											<div className="flex items-center justify-between pt-2 border-t border-line text-xs">
												<ButtonLink
													size="sm"
													variant="ghost"
													href={`/docs?product=${prod.productId}`}
													className="text-primary hover:underline p-0 h-auto">
													View API Spec
												</ButtonLink>
												<span className="font-mono text-[11px] text-muted">universal</span>
											</div>
										</div>
									))}
								</div>
							</section>
						) : null}

						{/* 5. Developer Tokens Section (Merchant) */}
						{activeSection === 'tokens' && userKind === 'merchant' ? (
							<section className="space-y-4">
								<div className="border-b border-line pb-4">
									<h1 className="text-xl font-bold text-fg">Developer Credentials &amp; Tokens</h1>
									<p className="text-xs text-muted">
										Credentials bound to your connected websites for frontend widgets and backend REST APIs.
									</p>
								</div>

								<div className="space-y-4">
									<div className="rounded-card border border-line bg-surface p-5 space-y-3 shadow-card">
										<div className="flex items-center justify-between">
											<div>
												<span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
													Public Client-Side Token
												</span>
												<h3 className="font-semibold text-sm text-fg">Browser Token</h3>
											</div>
											<Badge tone="success">Safe for HTML</Badge>
										</div>
										<p className="text-xs text-muted">
											Embed in storefront HTML widget scripts. Authorized exclusively for visitor actions from verified
											domains.
										</p>
										<div className="pt-1">
											<CodeBlock
												code={`<script src="https://api.shelfway.com/widget.js" data-token="tok_browser_verified_sample" async></script>`}
											/>
										</div>
									</div>

									<div className="rounded-card border border-line bg-surface p-5 space-y-3 shadow-card">
										<div className="flex items-center justify-between">
											<div>
												<span className="text-xs font-bold uppercase tracking-wider text-primary">
													Private Backend Secret
												</span>
												<h3 className="font-semibold text-sm text-fg">Server Bearer Token</h3>
											</div>
											<Badge tone="warning">Backend Only</Badge>
										</div>
										<p className="text-xs text-muted">
											Used for server-to-server operations (order management, customer sync). Never commit to client
											repositories.
										</p>
										<div className="pt-1">
											<CodeBlock
												code={`curl -X GET "https://api.shelfway.com/v1/products" \\\n  -H "Authorization: Bearer tok_server_secret_sample"`}
											/>
										</div>
									</div>
								</div>
							</section>
						) : null}

						{/* 6. Billing / Finance Section */}
						{activeSection === 'billing' || activeSection === 'finance' ? (
							<section className="space-y-4">
								<div className="border-b border-line pb-4">
									<h1 className="text-xl font-bold text-fg">
										{userKind === 'admin' ? 'Platform Billing Ledger' : 'Usage &amp; Credits'}
									</h1>
									<p className="text-xs text-muted">
										{userKind === 'admin'
											? 'Cryptographic append-only accounting ledger across all merchant transactions.'
											: 'Millicredits balance and daily micro-product deductions.'}
									</p>
								</div>

								<div className="rounded-card border border-line bg-surface p-6 shadow-card space-y-4">
									<div className="flex items-center justify-between border-b border-line pb-4">
										<div>
											<span className="text-xs text-muted font-mono uppercase">Current Ledger Balance</span>
											<div className="text-3xl font-bold text-fg mt-1">
												50,000 <span className="text-xs font-normal text-muted">millicredits</span>
											</div>
										</div>
										<Badge tone="success">Active Status</Badge>
									</div>

									<p className="text-xs text-muted leading-relaxed">
										All transactions are recorded with cryptographic hash chaining in the append-only commerce ledger.
										Usage is computed in integer millicredits based on active placed products.
									</p>
								</div>
							</section>
						) : null}

						{/* 7. System Section (Admin) */}
						{activeSection === 'system' && userKind === 'admin' ? (
							<section className="space-y-4">
								<div className="border-b border-line pb-4">
									<h1 className="text-xl font-bold text-fg">System &amp; Activity Log</h1>
									<p className="text-xs text-muted">
										Audit trail of administrative actions, encryption re-sealing, and security events.
									</p>
								</div>

								<div className="rounded-card border border-line bg-surface p-5 space-y-3 shadow-card">
									<div className="flex items-center justify-between">
										<span className="font-semibold text-sm text-fg">Audit Activity</span>
										<Badge tone="neutral">Immutable</Badge>
									</div>
									<div className="text-xs space-y-2 text-muted">
										<div className="p-2.5 rounded bg-surface-2 font-mono flex items-center justify-between">
											<span>system.login: Admin login verified via session</span>
											<span className="text-[10px]">Just now</span>
										</div>
										<div className="p-2.5 rounded bg-surface-2 font-mono flex items-center justify-between">
											<span>catalog.probe: Universal products readiness check OK</span>
											<span className="text-[10px]">5m ago</span>
										</div>
									</div>
								</div>
							</section>
						) : null}

						{/* 8. Admins Section (Admin) */}
						{activeSection === 'admins' && userKind === 'admin' ? (
							<section className="space-y-4">
								<div className="border-b border-line pb-4">
									<h1 className="text-xl font-bold text-fg">Platform Administrators</h1>
									<p className="text-xs text-muted">
										Manage administrative users, access privileges, and security settings.
									</p>
								</div>

								<div className="rounded-card border border-line bg-surface p-5 space-y-4 shadow-card">
									<div className="flex items-center justify-between">
										<div className="space-y-1">
											<h2 className="text-sm font-semibold text-fg">Active Administrator</h2>
											<p className="text-xs text-muted">Current signed-in administrator account.</p>
										</div>
										<Badge tone="primary">Owner</Badge>
									</div>

									<div className="divide-y divide-line text-xs">
										<div className="py-2.5 flex items-center justify-between">
											<span className="text-muted">Administrator</span>
											<span className="font-semibold text-fg">{effectiveSession?.name || 'Administrator'}</span>
										</div>
										<div className="py-2.5 flex items-center justify-between">
											<span className="text-muted">Email</span>
											<span className="font-mono text-fg">{effectiveSession?.email || 'admin@shelfway.test'}</span>
										</div>
										<div className="py-2.5 flex items-center justify-between">
											<span className="text-muted">Role</span>
											<span className="font-mono text-fg uppercase text-[11px]">{userRole || 'owner'}</span>
										</div>
										<div className="py-2.5 flex items-center justify-between">
											<span className="text-muted">Access Level</span>
											<span className="text-emerald-600 font-medium">Full Platform Control</span>
										</div>
									</div>
								</div>
							</section>
						) : null}

						{/* 9. Account Section (All Personas) */}
						{activeSection === 'account' ? (
							<section className="space-y-4">
								<div className="border-b border-line pb-4">
									<h1 className="text-xl font-bold text-fg">Account &amp; Security</h1>
									<p className="text-xs text-muted">Manage your credentials, sessions, and profile settings.</p>
								</div>

								<div className="rounded-card border border-line bg-surface p-5 space-y-4 shadow-card">
									<div className="flex items-center justify-between">
										<div className="space-y-1">
											<h2 className="text-sm font-semibold text-fg">Identity Profile</h2>
											<p className="text-xs text-muted">Credentials and authentication status.</p>
										</div>
										<Badge tone="success" dot>
											Authenticated
										</Badge>
									</div>

									<div className="divide-y divide-line text-xs">
										<div className="py-2.5 flex items-center justify-between">
											<span className="text-muted">Account Name</span>
											<span className="font-semibold text-fg">
												{effectiveSession?.name || (userKind === 'admin' ? 'Admin' : 'Merchant')}
											</span>
										</div>
										<div className="py-2.5 flex items-center justify-between">
											<span className="text-muted">Email Address</span>
											<span className="font-mono text-fg">
												{effectiveSession?.email || (userKind === 'admin' ? 'admin@shelfway.test' : 'merchant@example.com')}
											</span>
										</div>
										<div className="py-2.5 flex items-center justify-between">
											<span className="text-muted">Identity Plane</span>
											<span className="font-mono text-fg uppercase text-[11px]">{userKind}</span>
										</div>
										<div className="py-2.5 flex items-center justify-between">
											<span className="text-muted">Role Privilege</span>
											<span className="font-mono text-fg uppercase text-[11px]">{userRole || 'owner'}</span>
										</div>
										<div className="py-2.5 flex items-center justify-between">
											<span className="text-muted">Two-Step Verification</span>
											<span className="text-emerald-600 font-medium">Protected (TOTP / OTP)</span>
										</div>
									</div>
								</div>
							</section>
						) : null}
					</div>
				</div>
			</div>
		</ToastProvider>
	);
}
