// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { byText, cleanup, click, render, type } from '@shelfway/ui/testing';
import { DashboardHubView } from '../../src/console/views/dashboard.js';

describe('DashboardHubView (Unified /dashboard surface)', () => {
	const branding = { name: 'Shelfway', accent: '#0f766e', logoUrl: null };

	it('locks DashboardHubView with authentication gate when unauthenticated without session or token', () => {
		const html = renderToString(<DashboardHubView branding={branding} session={null} />);
		expect(html).toContain('Dashboard Access Restricted');
		expect(html).toContain('Sign In to Dashboard');
		expect(html).toContain('Paste developer or setup token');
		expect(html).not.toContain('Platform Administration');
		expect(html).not.toContain('Merchant Storefront Hub');
	});

	it('renders Admin Dashboard when session is admin role', () => {
		const adminSession = {
			ok: true,
			kind: 'admin',
			role: 'owner',
			name: 'Super Admin',
			email: 'admin@shelfway.com',
		};

		const { container } = render(<DashboardHubView branding={branding} session={adminSession} initialSection="overview" />);

		// Sidebar checks for Admin
		expect(container.textContent).toContain('Shelfway Dashboard');
		expect(container.textContent).toContain('Admin (owner)');
		expect(container.textContent).toContain('Merchants');
		expect(container.textContent).toContain('Catalog & Products');
		expect(container.textContent).toContain('Finance & Ledger');
		expect(container.textContent).toContain('System Activity');

		// Overview body checks for Admin
		expect(container.textContent).toContain('Platform Administration');
		expect(container.textContent).toContain('Total Merchants');
		expect(container.textContent).toContain('Total Websites');
		expect(container.textContent).toContain('Platform Health');

		cleanup();
	});

	it('renders Merchant Dashboard when session is merchant role', () => {
		const merchantSession = {
			ok: true,
			kind: 'merchant',
			merchantId: 'm_ibrahim_123',
			role: 'owner',
			name: 'Ibrahim Store Owner',
			email: 'ibrahim@store.com',
		};

		const { container } = render(<DashboardHubView branding={branding} session={merchantSession} initialSection="overview" />);

		// Sidebar checks for Merchant
		expect(container.textContent).toContain('Shelfway Dashboard');
		expect(container.textContent).toContain('Merchant');
		expect(container.textContent).toContain('Websites');
		expect(container.textContent).toContain('Placed Products');
		expect(container.textContent).toContain('Developer Tokens');
		expect(container.textContent).toContain('Credits & Billing');

		// Overview body checks for Merchant
		expect(container.textContent).toContain('Merchant Storefront Hub');
		expect(container.textContent).toContain('Connected Websites');
		expect(container.textContent).toContain('Placed Products');
		expect(container.textContent).toContain('Credits Balance');

		cleanup();
	});

	it('renders Staff Dashboard when role is operator', () => {
		const staffSession = {
			ok: true,
			kind: 'merchant',
			role: 'operator',
			name: 'Customer Support Staff',
			email: 'support@store.com',
		};

		const { container } = render(<DashboardHubView branding={branding} session={staffSession} initialSection="overview" />);

		expect(container.textContent).toContain('Staff');
		expect(container.textContent).toContain('Staff Operations Desk');
		expect(container.textContent).toContain('Assigned Stores');
		expect(container.textContent).toContain('Live Chat & Orders Desk');

		cleanup();
	});

	it('interactively switches tabs in the Merchant Dashboard', () => {
		const merchantSession = {
			ok: true,
			kind: 'merchant',
			merchantId: 'm_ibrahim_123',
			role: 'owner',
			name: 'Ibrahim Store Owner',
		};

		const { container } = render(<DashboardHubView branding={branding} session={merchantSession} initialSection="overview" />);

		// Switch to Websites
		const websitesBtn = byText(container, 'Websites').closest('button');
		expect(websitesBtn).not.toBeNull();
		if (websitesBtn) click(websitesBtn);
		expect(container.textContent).toContain('Websites & Storefronts');
		expect(container.textContent).toContain('ibrahimmobiles.com');

		// Switch to Placed Products
		const productsBtn = byText(container, 'Placed Products').closest('button');
		expect(productsBtn).not.toBeNull();
		if (productsBtn) click(productsBtn);
		expect(container.textContent).toContain('Placed Micro-Products');
		expect(container.textContent).toContain('Accounts');
		expect(container.textContent).toContain('Chat');
		expect(container.textContent).toContain('Ecommerce');

		// Switch to Developer Tokens
		const tokensBtn = byText(container, 'Developer Tokens').closest('button');
		expect(tokensBtn).not.toBeNull();
		if (tokensBtn) click(tokensBtn);
		expect(container.textContent).toContain('Developer Credentials & Tokens');
		expect(container.textContent).toContain('Browser Token');
		expect(container.textContent).toContain('Server Bearer Token');

		cleanup();
	});

	it('interactively switches tabs and filters in Admin Dashboard', () => {
		const adminSession = {
			ok: true,
			kind: 'admin',
			role: 'owner',
			name: 'Platform Super Admin',
		};

		const { container } = render(<DashboardHubView branding={branding} session={adminSession} initialSection="overview" />);

		// Switch to Merchants
		const merchantsBtn = byText(container, 'Merchants');
		expect(merchantsBtn).not.toBeNull();
		if (merchantsBtn) click(merchantsBtn);
		expect(container.textContent).toContain('Platform Merchants');
		expect(container.textContent).toContain('Ibrahim Mobile Store');
		expect(container.textContent).toContain('Urban Retailers Co');

		// Search filtering
		const searchInput = container.querySelector('input[type="search"]');
		expect(searchInput).not.toBeNull();
		if (searchInput) {
			type(searchInput, 'Urban');
			expect(container.textContent).toContain('Urban Retailers Co');
			expect(container.textContent).not.toContain('Ibrahim Mobile Store');
		}

		cleanup();
	});

	it('unlocks dashboard via unique token without prior session', () => {
		const { container } = render(<DashboardHubView branding={branding} session={null} />);
		expect(container.textContent).toContain('Dashboard Access Restricted');

		const tokenInput = container.querySelector('input[placeholder*="Paste developer"]');
		expect(tokenInput).not.toBeNull();
		if (tokenInput) {
			type(tokenInput, 'tok_dev_quick_unlock_777');
		}

		const unlockBtn = byText(container, 'Unlock', 'button');
		expect(unlockBtn).not.toBeNull();
		if (unlockBtn) click(unlockBtn);

		expect(container.textContent).toContain('Merchant Storefront Hub');
		expect(container.textContent).toContain('Shelfway Dashboard');

		cleanup();
	});
});
