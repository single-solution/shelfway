'use client';
/**
 * The product dashboard (PLAN 0.4.3): the shared dashboard of every product (`@shelfway/ui/dashboard`), opened from the
 * Portal (`/sso` -> `/dashboard?websiteId=...`), with Notifications' own operational tabs (`tabs.js`): delivery log,
 * send message, template editor, and webhook URLs and developer sections.
 * @module
 */
import { ProductDashboard } from '@shelfway/ui/dashboard';
import manifest from '../../manifest.json' with { type: 'json' };
import { TABS } from './tabs.js';
import { TEXTS } from './texts.js';

/** @type {import('@shelfway/ui/dashboard').DashboardCategories} */
const CATEGORIES = Object.freeze([
	{ title: 'Channels', features: ['email', 'sms', 'whatsapp', 'push'] },
	{ title: 'Delivery', features: ['webhooks', 'send_api'] },
]);

export default function Dashboard() {
	return <ProductDashboard manifest={manifest} texts={TEXTS} categories={CATEGORIES} tabs={TABS} />;
}
