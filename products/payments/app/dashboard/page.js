'use client';
/**
 * The product dashboard (PLAN 0.4.3): the shared dashboard of every product (`@shelfway/ui/dashboard`), opened from the
 * Portal (`/sso` -> `/dashboard?websiteId=...`), with Payments' own operational tabs (`tabs.js`): payments transactions,
 * payment links, subscriptions, and ways to pay and developers sections.
 * @module
 */
import { ProductDashboard } from '@shelfway/ui/dashboard';
import manifest from '../../manifest.json' with { type: 'json' };
import { TABS } from './tabs.js';
import { TEXTS } from './texts.js';

/** @type {import('@shelfway/ui/dashboard').DashboardCategories} */
const CATEGORIES = Object.freeze([
	{
		title: 'Ways to pay',
		features: [
			'manual_payments',
			'stripe',
			'paypal',
			'payfast',
			'payfast_pk',
			'jazzcash',
			'easypaisa',
			'rapid',
			'generic_gateway',
		],
	},
	{ title: 'Selling tools', features: ['payment_links', 'subscriptions', 'refunds', 'payment_api'] },
]);

export default function Dashboard() {
	return <ProductDashboard manifest={manifest} texts={TEXTS} categories={CATEGORIES} tabs={TABS} />;
}
