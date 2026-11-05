// @vitest-environment jsdom
/**
 * Tier 1 Client-Side Pre-Validation test suite (AGENTS.md Section 5).
 * Tests that dashboard and admin forms validate input client-side,
 * displaying inline errors and aborting before any network request is fired.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { byLabel, cleanup, click, render, type } from '@shelfway/ui/testing';
import { ToastProvider } from '@shelfway/ui';
import * as client from '../../src/console/client.js';
import { AddMerchantDialog } from '../../src/console/admin/views/merchants.js';
import { AddWebsiteDialog } from '../../src/console/views/website.js';
import { MerchantFieldsForm } from '../../src/console/views/account.js';

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

describe('Tier 1 Client-Side Pre-Validation', () => {
	it('AddMerchantDialog blocks empty inputs without initiating network request', async () => {
		const apiFetchSpy = vi.spyOn(client, 'apiFetch');
		const onClose = vi.fn();
		const onCreated = vi.fn();

		render(
			<ToastProvider>
				<AddMerchantDialog open={true} onClose={onClose} onCreated={onCreated} />
			</ToastProvider>,
		);

		// Find submit button and click without filling required fields
		const submitBtn = /** @type {HTMLButtonElement} */ (document.querySelector('button[type="submit"]'));
		expect(submitBtn).toBeTruthy();
		await click(submitBtn);

		// Network request MUST NOT be called
		expect(apiFetchSpy).not.toHaveBeenCalled();

		// Client error messages must be displayed in the DOM
		expect(document.body.textContent).toContain('Business name is required.');
		expect(document.body.textContent).toContain('Contact name is required.');
		expect(document.body.textContent).toContain('Email address is required.');

		// Typing into business name should clear its error
		const nameInput = byLabel(document, 'Business name');
		await type(nameInput, 'Acme Corp');
		expect(document.body.textContent).not.toContain('Business name is required.');
		// Other errors should remain until filled
		expect(document.body.textContent).toContain('Contact name is required.');
	});

	it('AddMerchantDialog blocks invalid email formats', async () => {
		const apiFetchSpy = vi.spyOn(client, 'apiFetch');

		render(
			<ToastProvider>
				<AddMerchantDialog open={true} onClose={vi.fn()} onCreated={vi.fn()} />
			</ToastProvider>,
		);

		await type(byLabel(document, 'Business name'), 'Acme Corp');
		await type(byLabel(document, 'Owner name'), 'Alice Smith');
		await type(byLabel(document, 'Owner email (login)'), 'not-an-email');

		const submitBtn = /** @type {HTMLButtonElement} */ (document.querySelector('button[type="submit"]'));
		await click(submitBtn);

		expect(apiFetchSpy).not.toHaveBeenCalled();
		expect(document.body.textContent).toContain('Enter a valid email address.');
	});

	it('AddWebsiteDialog blocks invalid domains client-side', async () => {
		const apiFetchSpy = vi.spyOn(client, 'apiFetch');

		render(
			<ToastProvider>
				<AddWebsiteDialog open={true} merchantId="m1" onClose={vi.fn()} onAdded={vi.fn()} />
			</ToastProvider>,
		);

		// Empty submit
		const submitBtn = /** @type {HTMLButtonElement} */ (document.querySelector('button[type="submit"]'));
		await click(submitBtn);
		expect(apiFetchSpy).not.toHaveBeenCalled();

		// Invalid domain format
		const domainInput = /** @type {HTMLInputElement} */ (
			document.querySelector('input[type="text"], input[inputmode="url"]')
		);
		expect(domainInput).toBeTruthy();
		await type(domainInput, 'invalid domain name');
		await click(submitBtn);

		expect(apiFetchSpy).not.toHaveBeenCalled();
		expect(document.body.textContent).toContain('Enter a valid domain name');
	});

	it('MerchantFieldsForm blocks empty required fields client-side', async () => {
		const apiFetchSpy = vi.spyOn(client, 'apiFetch');
		const merchant = { name: 'Acme', ownerName: 'Alice', email: 'alice@example.com' };

		render(
			<ToastProvider>
				<MerchantFieldsForm merchant={merchant} path="/v1/me" />
			</ToastProvider>,
		);

		// Clear business name to empty string
		const nameInput = byLabel(document, 'Business name');
		await type(nameInput, '   ');

		const submitBtn = /** @type {HTMLButtonElement} */ (document.querySelector('button[type="submit"]'));
		await click(submitBtn);

		// Submission must be blocked
		expect(apiFetchSpy).not.toHaveBeenCalled();
		expect(document.body.textContent).toContain('Business name is required.');
	});
});
