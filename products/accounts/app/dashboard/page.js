'use client';
/**
 * The product dashboard (PLAN 0.4.3): the shared dashboard of every product (`@shelfway/ui/dashboard`), opened from the
 * Portal (`/sso` -> `/dashboard?websiteId=...`), with Accounts' own operational tabs (`tabs.js`): full users directory
 * and roles management, custom fields in the Overview and Settings, the social sign-in key forms and connection hints,
 * and the developer sections.
 * @module
 */
import { ProductDashboard } from '@shelfway/ui/dashboard';
import manifest from '../../manifest.json' with { type: 'json' };
import { TABS } from './tabs.js';
import { TEXTS } from './texts.js';

/** @type {import('@shelfway/ui/dashboard').DashboardCategories} */
const CATEGORIES = Object.freeze([
	{ title: 'Sign-in', features: ['sign_in', 'two_step', 'approval'] },
	{ title: 'People', features: ['roles', 'role_requests', 'activity_copies'] },
	{ title: 'Rights', features: ['consents', 'data_rights', 'import'] },
]);

export default function Dashboard() {
	return <ProductDashboard manifest={manifest} texts={TEXTS} categories={CATEGORIES} tabs={TABS} />;
}
