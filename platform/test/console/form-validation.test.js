// @vitest-environment jsdom
/**
 * Tier 1 Client-Side Pre-Validation test suite (AGENTS.md Section 5).
 * Tests that dashboard and admin forms validate input client-side,
 * displaying inline errors and aborting before any network request is fired.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, byLabel, cleanup, click, render, type } from '@shelfway/ui/testing';
import { FieldLayoutContext, ToastProvider } from '@shelfway/ui';
import * as client from '../../src/console/client.js';
import { AddMerchantDialog } from '../../src/console/admin/views/merchants.js';
import { AddWebsiteDialog } from '../../src/console/views/website.js';
import { MerchantFieldsForm } from '../../src/console/views/account.js';
import { factorOf } from '../../src/console/views/common.js';
import { SignInModal } from '../../app/_components/SignInModal.js';

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
		expect(document.body.textContent).toContain('Company name is required.');
		expect(document.body.textContent).toContain('Contact name is required.');
		expect(document.body.textContent).toContain('Email address is required.');

		// Typing into company name should clear its error
		const nameInput = byLabel(document, 'Company name');
		await type(nameInput, 'Acme Corp');
		expect(document.body.textContent).not.toContain('Company name is required.');
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

		await type(byLabel(document, 'Company name'), 'Acme Corp');
		await type(byLabel(document, 'Primary contact'), 'Alice Smith');
		await type(byLabel(document, 'Work email address'), 'not-an-email');

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
		const domainInput = /** @type {HTMLInputElement} */ (document.querySelector('input[type="text"], input[inputmode="url"]'));
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

		// Clear company name to empty string
		const nameInput = byLabel(document, 'Company name');
		await type(nameInput, '   ');

		const submitBtn = /** @type {HTMLButtonElement} */ (document.querySelector('button[type="submit"]'));
		await click(submitBtn);

		// Submission must be blocked
		expect(apiFetchSpy).not.toHaveBeenCalled();
		expect(document.body.textContent).toContain('Company name is required.');
	});

	it('AddMerchantDialog combines calling code and national number into E.164', async () => {
		const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({
			ok: true,
			status: 200,
			data: { merchant: { merchantId: 'm1' }, setup: { mailed: true } },
		});

		render(
			<ToastProvider>
				<AddMerchantDialog open={true} onClose={vi.fn()} onCreated={vi.fn()} />
			</ToastProvider>,
		);

		await type(byLabel(document, 'Company name'), 'Alpha Store');
		await type(byLabel(document, 'Primary contact'), 'Sam');
		await type(byLabel(document, 'Work email address'), 'sam@alpha.test');

		const callingSelect = /** @type {HTMLSelectElement} */ (/** @type {unknown} */ (byLabel(document, 'Calling code')));
		expect(callingSelect.value).toBe('+1');

		await type(byLabel(document, 'Phone number'), '4155550199');

		const submitBtn = /** @type {HTMLButtonElement} */ (document.querySelector('button[type="submit"]'));
		await click(submitBtn);

		expect(apiFetchSpy).toHaveBeenCalledWith(
			'/v1/admin/merchants',
			expect.objectContaining({
				method: 'POST',
				body: expect.objectContaining({
					name: 'Alpha Store',
					ownerName: 'Sam',
					email: 'sam@alpha.test',
					phone: '+14155550199',
				}),
			}),
		);
	});

	it('SignInModal validates password match client-side in setup mode', async () => {
		const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({
			ok: true,
			status: 200,
			data: { email: 'user@example.com', needsName: false },
		});
		window.history.pushState({}, '', '/?auth=setup&token=valid-setup-token');
		const assignSpy = vi.fn();
		Object.defineProperty(window, 'location', {
			writable: true,
			value: { ...window.location, assign: assignSpy },
		});

		render(
			<ToastProvider>
				<SignInModal open={true} onClose={vi.fn()} />
			</ToastProvider>,
		);

		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		await type(byLabel(document, 'Password'), 'supersecret123');
		await type(byLabel(document, 'Confirm password'), 'mismatch12345');

		const submitBtn = /** @type {HTMLButtonElement} */ (document.querySelector('button[type="submit"]'));
		await click(submitBtn);

		expect(apiFetchSpy).not.toHaveBeenCalledWith('/v1/auth/set-password', expect.anything());
		expect(document.body.textContent).toContain('Passwords do not match.');

		await type(byLabel(document, 'Confirm password'), 'supersecret123');
		await click(submitBtn);
		expect(apiFetchSpy).toHaveBeenCalledWith(
			'/v1/auth/set-password',
			expect.objectContaining({
				method: 'POST',
				body: expect.objectContaining({ password: 'supersecret123' }),
			}),
		);
	});

	it('AddMerchantDialog displays CopyLinkDialog when mail sending returns mailed: false, deferring onCreated until closed', async () => {
		const onCreated = vi.fn();
		const onClose = vi.fn();
		vi.spyOn(client, 'apiFetch').mockResolvedValue({
			ok: true,
			status: 200,
			data: {
				merchant: { merchantId: 'm_unmailed' },
				setup: { mailed: false, link: 'https://portal.test/?auth=setup#token=unmailed123' },
			},
		});

		render(
			<ToastProvider>
				<AddMerchantDialog open={true} onClose={onClose} onCreated={onCreated} />
			</ToastProvider>,
		);

		await type(byLabel(document, 'Company name'), 'Unmailed Store');
		await type(byLabel(document, 'Primary contact'), 'Alex');
		await type(byLabel(document, 'Work email address'), 'alex@unmailed.test');

		const submitBtn = /** @type {HTMLButtonElement} */ (document.querySelector('button[type="submit"]'));
		await click(submitBtn);

		// CopyLinkDialog should be open with the link
		expect(document.body.textContent).toContain('https://portal.test/?auth=setup#token=unmailed123');
		// onCreated must NOT have been called yet
		expect(onCreated).not.toHaveBeenCalled();

		// Close the CopyLinkDialog
		const closeBtn = /** @type {HTMLButtonElement} */ (document.querySelector('button[aria-label="Close"]'));
		await click(closeBtn);

		// Now onCreated should have been called with the created merchant
		expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ merchantId: 'm_unmailed' }));
		expect(onClose).toHaveBeenCalled();
	});

	it('MerchantFieldsForm adapts to row layout and combines phone with selected calling code', async () => {
		const apiFetchSpy = vi.spyOn(client, 'apiFetch').mockResolvedValue({
			ok: true,
			status: 200,
			data: { name: 'Acme', ownerName: 'Alice', phone: '+447700900123' },
		});

		render(
			<ToastProvider>
				<FieldLayoutContext.Provider value="row">
					<MerchantFieldsForm merchant={{ name: 'Acme', ownerName: 'Alice', phone: null }} path="/v1/me" />
				</FieldLayoutContext.Provider>
			</ToastProvider>,
		);

		// Both inputs are discoverable by their accessible labels
		const callingSelect = /** @type {HTMLSelectElement} */ (/** @type {unknown} */ (byLabel(document, 'Calling code')));
		expect(callingSelect.value).toBe('+1');

		// Change calling code to +44
		await act(async () => {
			callingSelect.value = '+44';
			callingSelect.dispatchEvent(new Event('change', { bubbles: true }));
		});

		await type(byLabel(document, 'Phone number'), '07700 900123');

		const submitBtn = /** @type {HTMLButtonElement} */ (document.querySelector('button[type="submit"]'));
		await click(submitBtn);

		expect(apiFetchSpy).toHaveBeenCalledWith(
			'/v1/me',
			expect.objectContaining({
				method: 'PATCH',
				body: expect.objectContaining({ phone: '+447700900123' }),
			}),
		);
	});

	it('SignInModal shows both password length and confirm mismatch errors simultaneously', async () => {
		window.history.pushState({}, '', '/?auth=setup&token=valid-token');
		render(
			<ToastProvider>
				<SignInModal open={true} onClose={vi.fn()} />
			</ToastProvider>,
		);

		await act(async () => {
			await Promise.resolve();
			await Promise.resolve();
		});

		// Short password and mismatching confirm password
		await type(byLabel(document, 'Password'), 'short');
		await type(byLabel(document, 'Confirm password'), 'mismatch');

		const submitBtn = /** @type {HTMLButtonElement} */ (document.querySelector('button[type="submit"]'));
		await click(submitBtn);

		expect(document.body.textContent).toContain('Password must be at least 12 characters.');
		expect(document.body.textContent).toContain('Passwords do not match.');
	});

	it('factorOf normalizes formatted two-step codes and recovery codes', () => {
		expect(factorOf('123456')).toEqual({ code: '123456' });
		expect(factorOf(' 123 456 ')).toEqual({ code: '123456' });
		expect(factorOf('123-456')).toEqual({ code: '123456' });
		expect(factorOf(' 123-456 ')).toEqual({ code: '123456' });
		expect(factorOf('abcde-fghij')).toEqual({ recoveryCode: 'abcde-fghij' });
		expect(factorOf('ABCDE FGHIJ')).toEqual({ recoveryCode: 'abcdefghij' });
		expect(factorOf('')).toEqual({});
	});
});
