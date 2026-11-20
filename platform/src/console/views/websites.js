'use client';
/**
 * Merchant Overview and Websites (PLAN 0.8.2 Merchant): the balance and days left at the current spend, the 30-day
 * spend chart and the websites with product chips and Open buttons; the Websites page — a table of the websites
 * (domain, status, products, daily cost) whose row opens the website's own page (`website-page.js`; no admin actions).
 * With no websites yet, the welcome with the support contact (PLAN 0.8.2 Sign-in).
 * Layout: the Overview is one page (the greeting behind the (i), the key numbers in the header, then its cards).
 * @module
 */
import { useState } from 'react';
import {
	Badge,
	BarChart,
	Button,
	ButtonLink,
	Card,
	EmptyState,
	Icon,
	IconBadge,
	IconButton,
	ListColumn,
	LocalTime,
	NeedsList,
	Page,
	Row,
	Stat,
	StatGrid,
	formatCredits,
	useNarrow,
	useToast,
	describeProblem,
	TextLink,
} from '@shelfway/ui';
import { AUTH, BILLING, MERCHANT, MORE, WEBSITE } from '../../texts/console.js';
import { Link } from '../link.js';
import { useNavigation } from '../navigation.js';
import { api, routes } from '../paths.js';
import { DaysLeft, ProductStatusBadge, creditDayBars, formatChartCredits, productStatusLabel, productTone } from './billing.js';
import { FrameBilling } from './shell.js';
import { PageProblem, openDashboard } from './common.js';
import { ConfirmOtp } from './common.js';
import { ActivityTimeline } from './login-settings.js';
import { contactLine } from './sign-in.js';
import { AddWebsiteDialog, launchStepUpOf, twoStepOnOf, websiteDot } from './website.js';
import { WebsitePageView } from './website-page.js';

/** @typedef {import('./website.js').ProductCard} ProductCard */
/** @typedef {{ support?: { channels: import('@shelfway/contracts/text').SupportChannel[] } | null }} BrandingSupport */

/**
 * The welcome of a merchant with no websites yet.
 * @param {{ branding?: BrandingSupport }} props
 */
function Welcome({ branding }) {
	return (
		<EmptyState
			icon="globe"
			kind="website"
			title={AUTH.welcomeTitle}
			description={
				<>
					{AUTH.welcome} {AUTH.contactUs} {contactLine(branding?.support)}.
				</>
			}
		/>
	);
}

/**
 * The merchant's Overview: a greeting with one sentence of what matters now;
 * "Needs you" (a product with no feature on, with Open; a website with no product yet) beside the 30-day spend chart;
 * the money numbers (balance, days left, daily spend, spent this month); the websites with their products and Open
 * buttons; the latest activity as a timeline beside the latest receipts. Low credits show in the frame's banner.
 * @param {any} props loader result of `loadOverview` plus `branding` and the signed-in `me`
 */
export function OverviewView(props) {
	const toast = useToast();
	const [opening, setOpening] = useState(/** @type {string | null} */ (null));
	const [launching, setLaunching] = useState(/** @type {{ website: any, card: ProductCard } | null} */ (null));
	if (!props.ok) return <PageProblem problem={props.problem} />;
	const launchStepUp = launchStepUpOf(props.me) || Boolean(props.launchStepUp);
	const rows = /** @type {Array<{ website: any, cards: ProductCard[] }>} */ (props.rows);
	/** @param {any} website @param {ProductCard} card */
	const handleOpen = async (website, card) => {
		if (launchStepUp) {
			setLaunching({ website, card });
			return;
		}
		const key = `${website.websiteId}:${card.productId}`;
		setOpening(key);
		const result = await openDashboard(api.launch(props.merchantId, website.websiteId, card.productId));
		setOpening(null);
		if (!result.ok) {
			toast.show({ tone: 'danger', title: describeProblem(result.problem) });
		}
	};
	/** @param {{ password: string, code?: string, recoveryCode?: string }} confirmation */
	const sendLaunch = async (confirmation) => {
		if (!launching) return { ok: /** @type {const} */ (false), problem: /** @type {any} */ ({ status: 400 }) };
		const key = `${launching.website.websiteId}:${launching.card.productId}`;
		setOpening(key);
		const result = await openDashboard(
			api.launch(props.merchantId, launching.website.websiteId, launching.card.productId),
			confirmation,
		);
		setOpening(null);
		if (!result.ok) return result;
		setLaunching(null);
		return { ok: /** @type {const} */ (true) };
	};
	const billing = props.billing;
	const productCount = rows.reduce((n, r) => n + r.cards.length, 0);
	/** @param {any} website @param {ProductCard} card */
	const openButton = (website, card) => (
		<Button
			size="sm"
			variant="secondary"
			loading={opening === `${website.websiteId}:${card.productId}`}
			aria-label={`${WEBSITE.openLabel(card.name)} · ${website.domain}`}
			onClick={() => void handleOpen(website, card)}
			icon={<Icon name="external" size={14} />}>
			{WEBSITE.open}
		</Button>
	);

	/** @type {import('@shelfway/ui').Need[]} */
	const needs = [];
	for (const { website, cards } of rows) {
		if (cards.length === 0)
			needs.push({
				key: `empty-${website.websiteId}`,
				tone: 'warning',
				title: MERCHANT.needs.noProducts.title(website.domain),
				effect: MERCHANT.needs.noProducts.effect,
			});
		for (const card of cards)
			if (card.status === 'active' && (card.featuresOn ?? []).length === 0)
				needs.push({
					key: `features-${website.websiteId}-${card.productId}`,
					tone: 'warning',
					title: MERCHANT.needs.noFeatures.title(card.name, website.domain),
					effect: MERCHANT.needs.noFeatures.effect,
					action: openButton(website, card),
				});
	}
	const meObj = props.me?.ok === true ? props.me.data : props.me;
	const name = meObj?.merchant?.ownerName || meObj?.merchant?.name || '';

	/** One row per product on a website; a website with none has one row that says so. */
	/** @type {Array<{ key: string, website: any, card: ProductCard | null }>} */
	const productRows = [];
	for (const { website, cards } of rows) {
		if (cards.length === 0) productRows.push({ key: `${website.websiteId}:-`, website, card: null });
		for (const card of cards) productRows.push({ key: `${website.websiteId}:${card.productId}`, website, card });
	}

	return (
		<>
			<FrameBilling billing={billing} />
			<Page
				linkAs={Link}
				crumbs={[{ label: MERCHANT.overviewTitle }]}
				info={
					<>
						<span className="block font-medium text-fg">{MERCHANT.welcome(name)}</span>
						{MERCHANT.summary({ websites: rows.length, products: productCount, needs: needs.length })}
					</>
				}
				facts={[
					{ label: MERCHANT.tiles.websites, value: rows.length, href: routes.websites() },
					...(needs.length > 0
						? [{ label: MERCHANT.needs.title, value: needs.length, tone: /** @type {const} */ ('warning') }]
						: []),
					...(billing
						? [
								{ label: BILLING.balance, value: formatCredits(billing.balance), href: routes.credits() },
								{ label: BILLING.daysLeft, value: <DaysLeft summary={billing} />, href: routes.credits() },
							]
						: []),
				]}>
				{rows.length === 0 ? (
					<Welcome branding={props.branding} />
				) : (
					<div className="space-y-6">
						<StatGrid>
							{billing ? (
								<>
									<Stat label={BILLING.balance} value={formatCredits(billing.balance)} icon="wallet" kind="credit" />
									<Stat label={BILLING.daysLeft} value={<DaysLeft summary={billing} />} icon="clock" kind="credit" />
									<Stat
										label={BILLING.dailySpend}
										value={formatCredits(billing.dailySpend)}
										icon="trendingUp"
										kind="credit"
									/>
									<Stat label={MERCHANT.tiles.websites} value={rows.length} icon="globe" kind="website" />
								</>
							) : (
								<>
									<Stat label={MERCHANT.tiles.websites} value={rows.length} icon="globe" kind="website" />
									<Stat label={MERCHANT.tiles.products} value={productCount} icon="box" kind="product" />
								</>
							)}
						</StatGrid>

						{needs.length > 0 ? (
							<Card title={MERCHANT.needs.title} subtitle={MERCHANT.needs.intro}>
								<NeedsList items={needs} none={MERCHANT.needs.none} />
							</Card>
						) : null}

						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
							{/* Left / Main Column: Storefronts and Operational Shortcuts */}
							<div className="lg:col-span-2 space-y-6">
								<Card
									title={MERCHANT.websitesTitle}
									subtitle="Storefronts and active headless capabilities."
									actions={
										<ButtonLink as={Link} href={routes.websites()} variant="secondary" size="sm">
											{MORE.viewAll}
										</ButtonLink>
									}>
									<div className="space-y-4">
										{rows.map(({ website, cards }) => {
											const hasEcommerce = cards.some((c) => c.productId === 'ecommerce');
											const hasAccounts = cards.some((c) => c.productId === 'accounts' || c.productId === 'ecommerce');
											const websiteHref = routes.website(website.websiteId);
											return (
												<div
													key={website.websiteId}
													className="rounded-lg border border-line bg-surface p-4 shelfway-motion space-y-3">
													<div className="flex flex-wrap items-center justify-between gap-2">
														<div className="flex items-center gap-2 min-w-0">
															<span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-surface-2 text-primary">
																<Icon name="globe" size={16} />
															</span>
															<div className="min-w-0">
																<div className="flex items-center gap-2">
																	<Link
																		href={websiteHref}
																		className="font-medium text-fg hover:underline truncate">
																		{website.domain}
																	</Link>
																	<a
																		href={`https://${website.domain}`}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="text-muted hover:text-fg"
																		title={`Open https://${website.domain}`}>
																		<Icon name="external" size={13} />
																	</a>
																</div>
																<p className="text-xs text-muted">
																	{cards.length} {cards.length === 1 ? 'product' : 'products'} active
																</p>
															</div>
														</div>
														<div className="flex items-center gap-2">
															<ButtonLink as={Link} href={websiteHref} size="sm">
																Manage Store
															</ButtonLink>
														</div>
													</div>

													{cards.length > 0 ? (
														<div className="flex flex-wrap items-center gap-2 pt-1 border-t border-line-soft">
															{cards.map((card) => (
																<div
																	key={card.productId}
																	className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2/60 px-2.5 py-1 text-xs">
																	<IconBadge product={card.productId} size="xs" />
																	<span className="font-medium text-fg">{card.name}</span>
																	<span className="text-[10px] text-muted capitalize">
																		({productStatusLabel(card)})
																	</span>
																	<IconButton
																		size="sm"
																		variant="ghost"
																		onClick={() => void handleOpen(website, card)}
																		className="size-5 p-0 text-muted hover:text-fg"
																		label={WEBSITE.openLabel(card.name)}>
																		<Icon name="external" size={11} />
																	</IconButton>
																</div>
															))}
														</div>
													) : (
														<p className="text-xs text-muted pt-1 border-t border-line-soft">
															{WEBSITE.noProductsMerchant}
														</p>
													)}

													<div className="flex flex-wrap items-center gap-2 pt-1">
														{hasEcommerce ? (
															<ButtonLink as={Link} href={`${websiteHref}/orders`} variant="ghost" size="sm">
																<Icon name="receipt" size={13} />
																<span>Orders</span>
															</ButtonLink>
														) : null}
														{hasAccounts ? (
															<ButtonLink as={Link} href={`${websiteHref}/customers`} variant="ghost" size="sm">
																<Icon name="users" size={13} />
																<span>Customers</span>
															</ButtonLink>
														) : null}
														<ButtonLink as={Link} href={`${websiteHref}/setup`} variant="ghost" size="sm">
															<Icon name="code" size={13} />
															<span>Developer Setup</span>
														</ButtonLink>
														<ButtonLink as={Link} href={`${websiteHref}/settings`} variant="ghost" size="sm">
															<Icon name="sliders" size={13} />
															<span>Settings</span>
														</ButtonLink>
													</div>
												</div>
											);
										})}
									</div>
								</Card>

								{/* Simple Website Connection Card */}
								{rows.length > 0 && rows[0]?.website?.websiteId ? (
									<Card
										title="Connect Your Website to Shelfway"
										subtitle="Everything needed to point your storefront or migration tools to our platform.">
										<div className="space-y-3 pt-1">
											<div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
												<div className="rounded border border-line bg-surface p-3 space-y-1">
													<p className="font-semibold text-fg">1. Add Capabilities</p>
													<p className="text-muted leading-relaxed">
														Attach the products your website needs (like Ecommerce or Accounts).
													</p>
												</div>
												<div className="rounded border border-line bg-surface p-3 space-y-1">
													<p className="font-semibold text-fg">2. Grab Credentials</p>
													<p className="text-muted leading-relaxed">
														Get your Website ID and API tokens from Developer Setup.
													</p>
												</div>
												<div className="rounded border border-line bg-surface p-3 space-y-1">
													<p className="font-semibold text-fg">3. Point Your Frontend</p>
													<p className="text-muted leading-relaxed">
														Set your environment keys to start receiving live traffic.
													</p>
												</div>
											</div>
											<div className="flex items-center gap-2 pt-2">
												<ButtonLink
													as={Link}
													href={`${routes.website(rows[0].website.websiteId)}/setup`}
													variant="primary"
													size="sm">
													View Developer Credentials &amp; Keys
												</ButtonLink>
												<ButtonLink
													as={Link}
													href={routes.website(rows[0].website.websiteId)}
													variant="secondary"
													size="sm">
													Manage Website Capabilities
												</ButtonLink>
											</div>
										</div>
									</Card>
								) : null}
							</div>

							{/* Right / Sidebar Column */}
							<div className="lg:col-span-1 space-y-6">
								<Card
									title={MERCHANT.spendChart}
									subtitle={props.usage ? formatCredits(props.usage.total ?? 0) : undefined}
									actions={
										<ButtonLink as={Link} href={routes.credits()} variant="secondary" size="sm">
											{MORE.viewAll}
										</ButtonLink>
									}>
									<BarChart
										label={MERCHANT.spendChart}
										data={creditDayBars(props.usage?.days)}
										format={formatChartCredits}
										height={132}
									/>
								</Card>

								<Card
									flow
									padded={false}
									title={MORE.latestReceipts}
									actions={
										<ButtonLink as={Link} href={routes.creditsReceipts()} variant="secondary" size="sm">
											{MORE.viewAll}
										</ButtonLink>
									}>
									{(props.receipts ?? []).length === 0 ? (
										<EmptyState compact icon="receipt" kind="credit" title={BILLING.noReceipts} />
									) : (
										<div className="divide-y divide-line-soft">
											{(props.receipts ?? []).slice(0, 5).map((/** @type {any} */ r) => (
												<Row
													key={r.receiptId}
													lead={{ icon: 'receipt' }}
													title={r.method ?? BILLING.receiptsTitle}
													meta={[r.reference].filter(Boolean)}
													value={formatCredits(r.credits)}
													time={<LocalTime value={r.at} />}
												/>
											))}
										</div>
									)}
								</Card>

								<Card
									flow
									title={MORE.recentActivity}
									actions={
										<ButtonLink as={Link} href={routes.account()} variant="secondary" size="sm">
											{MORE.viewAll}
										</ButtonLink>
									}>
									<ActivityTimeline
										items={(props.activity ?? []).slice(0, 5)}
										empty={MORE.noActivity}
										showMerchant={false}
									/>
								</Card>
							</div>
						</div>
					</div>
				)}
			</Page>
			<ConfirmOtp
				open={Boolean(launching)}
				title={WEBSITE.openConfirmTitle(launching?.card.name ?? '')}
				help={WEBSITE.openConfirmHelp}
				confirmLabel={WEBSITE.openConfirmLabel}
				twoStepOn={twoStepOnOf(props.me)}
				send={sendLaunch}
				onClose={() => setLaunching(null)}
				onDone={() => setLaunching(null)}
			/>
		</>
	);
}

/** How a website's worst product status reads in the list and the header. */
const SITE_PILLS = /** @type {const} */ ({
	success: { status: 'active', label: MERCHANT.websiteStatus.success },
	warning: { status: 'warning', label: MERCHANT.websiteStatus.warning },
	danger: { status: 'error', label: MERCHANT.websiteStatus.danger },
	neutral: { status: 'off', label: MERCHANT.websiteStatus.neutral },
});

/** The order of the status chips above the list. */
const DOT_ORDER = /** @type {const} */ (['success', 'warning', 'danger', 'neutral']);

/**
 * The one thing a website still needs, for its row: a stopped or suspended product, one in grace, a product with no
 * feature on yet, or no product at all; null when nothing is left.
 * @param {ProductCard[]} cards
 * @returns {{ tone: 'warning' | 'danger', text: string } | null}
 */
const troubleOf = (cards) => {
	if (cards.length === 0) return { tone: 'warning', text: WEBSITE.noProductsYet };
	const stopped = cards.find((card) => productTone(card) === 'danger');
	if (stopped) return { tone: 'danger', text: WEBSITE.productTrouble(stopped.name, productStatusLabel(stopped)) };
	const grace = cards.find((card) => productTone(card) === 'warning');
	if (grace) return { tone: 'warning', text: WEBSITE.productTrouble(grace.name, productStatusLabel(grace)) };
	const idle = cards.find((card) => card.status === 'active' && card.featuresOn.length === 0);
	return idle ? { tone: 'warning', text: WEBSITE.setupLeft(idle.name) } : null;
};

/**
 * The merchant's Websites screen (flat layout 2026-10-21): a column of rich rows (domain, status dot, its products or
 * what is left to do, daily cost) beside the picked website's own page (`website-page.js`). A row is a link to the
 * website's address, so the pick can be linked to and the browser's Back button works; on the list's own address
 * (`fromList`) the first website is open straight away on wide screens, and a phone shows the list alone. A search and
 * status chips narrow the list.
 * @param {{ rows: Array<{ website: any, cards: ProductCard[] }>, websiteId: string, fromList?: boolean, part?: string,
 *   settings?: any, setup?: any, addable?: any, merchantId: string, twoStepOn?: boolean }} props
 */
function WebsitesScreen({
	rows,
	websiteId,
	fromList = false,
	part = '',
	settings = null,
	setup = null,
	addable = null,
	merchantId,
	twoStepOn = false,
}) {
	const nav = useNavigation();
	const phone = useNarrow();
	const [q, setQ] = useState('');
	const [status, setStatus] = useState('all');
	const crumbs = [{ label: MERCHANT.websitesTitle, href: routes.websites() }];
	const entries = rows.map(({ website, cards }) => ({
		id: String(website.websiteId),
		domain: String(website.domain),
		cards,
		dot: websiteDot(cards),
	}));
	const needle = q.trim().toLowerCase();
	const shown = entries.filter(
		(entry) => (!needle || entry.domain.toLowerCase().includes(needle)) && (status === 'all' || entry.dot === status),
	);
	const present = DOT_ORDER.filter((dot) => entries.some((entry) => entry.dot === dot));
	const selected = fromList ? (phone ? null : (entries[0]?.id ?? null)) : websiteId;
	const list = (
		<ListColumn
			label={MERCHANT.websitesTitle}
			items={shown}
			idOf={(entry) => entry.id}
			rowOf={(entry) => {
				const trouble = troubleOf(entry.cards);
				return {
					lead: <IconBadge icon="globe" kind="website" size="sm" />,
					title: entry.domain,
					status: { tone: entry.dot, label: SITE_PILLS[entry.dot].label },
					...(trouble ? { warning: trouble } : { meta: entry.cards.map((card) => card.name) }),
					href: routes.website(entry.id),
					linkAs: Link,
				};
			}}
			selected={selected}
			onBack={() => nav.go(routes.websites())}
			search={{ value: q, onChange: setQ, placeholder: WEBSITE.search }}
			{...(present.length > 1
				? {
						filters: {
							value: status,
							onChange: setStatus,
							options: [
								{ id: 'all', label: WEBSITE.filterAll, count: entries.length },
								...present.map((dot) => ({
									id: dot,
									label: MERCHANT.websiteStatus[dot],
									count: entries.filter((entry) => entry.dot === dot).length,
								})),
							],
						},
					}
				: {})}
			empty={{ icon: 'globe', kind: 'website', title: WEBSITE.none }}
		/>
	);
	const picked = rows.find((r) => String(r.website.websiteId) === (fromList ? (entries[0]?.id ?? '') : websiteId));
	if (!picked) return <Page linkAs={Link} list={list} crumbs={[...crumbs, { label: websiteId }]} error={WEBSITE.gone} />;
	const id = String(picked.website.websiteId);
	return (
		<WebsitePageView
			key={id}
			website={picked.website}
			cards={picked.cards}
			part={part}
			crumbs={crumbs}
			hrefOf={(next) => routes.websitePart(id, next)}
			can={{ manage: true, removeWebsite: false, tokens: true, open: true, settings: true }}
			pills={SITE_PILLS}
			addable={addable}
			launch={(productId) => ({ path: api.launch(merchantId, id, productId) })}
			afterRemoved={routes.websites()}
			settings={settings}
			setup={setup}
			list={list}
			twoStepOn={twoStepOn}
		/>
	);
}

/**
 * The merchant's Websites screen: the list with the first website open beside it (or the welcome with none yet).
 * @param {any} props loader result of `loadWebsites` plus `branding`
 */
export function WebsitesView(props) {
	const nav = useNavigation();
	const [adding, setAdding] = useState(false);
	if (!props.ok) return <PageProblem problem={props.problem} />;
	const rows = /** @type {Array<{ website: any, cards: ProductCard[] }>} */ (props.rows);
	return (
		<>
			<FrameBilling billing={props.billing} />
			{rows.length === 0 ? (
				<>
					<Page
						flush
						crumbs={[{ label: MERCHANT.websitesTitle }]}
						info={MERCHANT.websitesInfo}
						linkAs={Link}
						actions={{
							primary: {
								label: WEBSITE.addWebsite,
								icon: 'plus',
								onClick: () => setAdding(true),
							},
						}}>
						<EmptyState
							icon="globe"
							kind="website"
							title={AUTH.welcomeTitle}
							description={
								<>
									{AUTH.welcome} {AUTH.contactUs} {contactLine(props.branding?.support)}.
								</>
							}
							action={
								<Button icon={<Icon name="plus" size={14} />} onClick={() => setAdding(true)}>
									{WEBSITE.addWebsite}
								</Button>
							}
						/>
					</Page>
					<AddWebsiteDialog
						open={adding}
						merchantId={props.merchantId}
						onClose={() => setAdding(false)}
						onAdded={(website) => {
							setAdding(false);
							nav.go(routes.website(website.websiteId));
						}}
					/>
				</>
			) : (
				<WebsitesScreen
					rows={rows}
					websiteId={String(rows[0]?.website.websiteId)}
					fromList
					settings={props.settings}
					addable={props.addable}
					merchantId={props.merchantId}
					twoStepOn={twoStepOnOf(props.me)}
				/>
			)}
		</>
	);
}

/**
 * One website's own page in the merchant console (`Websites › domain`, the list of websites beside it): the merchant
 * can add or remove products here, and open/configure them (PLAN §7, §10 A3).
 * @param {any} props loader result of `loadWebsitePage`
 */
export function WebsiteView(props) {
	if (!props.ok) return <PageProblem problem={props.problem} />;
	return (
		<>
			<FrameBilling billing={props.billing} />
			<WebsitesScreen
				rows={props.rows}
				websiteId={String(props.websiteId)}
				part={props.part}
				settings={props.settings}
				setup={props.setup}
				addable={props.addable}
				merchantId={props.merchantId}
				twoStepOn={twoStepOnOf(props.me)}
			/>
		</>
	);
}
