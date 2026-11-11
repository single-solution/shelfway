'use client';

import { useEffect, useRef, useState } from 'react';
import NextLink from 'next/link.js';
import { Button, Callout, Dialog, Form, FormError, Input, OtpInput, TextLink, fieldErrors, problemCode } from '@shelfway/ui';
import { apiFetch } from '../../src/console/client.js';
import { homeOf } from '../../src/console/views/sign-in.js';
import { scrollToContact } from './SiteNav.js';

const Link = /** @type {any} */ (NextLink);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign In Modal Popup for public website and docs navigation.
 * Built with @shelfway/ui Dialog, Input, and Button.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   brandName?: string,
 *   next?: string | null,
 *   onSuccess?: () => void,
 * }} props
 */
export function SignInModal({ open, onClose, brandName = 'Shelfway', next = null, onSuccess }) {
	const [name, setName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [busy, setBusy] = useState(false);
	const busyRef = useRef(false);
	const [problem, setProblem] = useState(/** @type {any | null} */ (null));
	const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
	const [challenge, setChallenge] = useState(/** @type {string | null} */ (null));
	const [totpCode, setTotpCode] = useState('');
	const [recoveryCode, setRecoveryCode] = useState('');
	const [useRecovery, setUseRecovery] = useState(false);
	const [firstAdminAvailable, setFirstAdminAvailable] = useState(false);

	useEffect(() => {
		if (open) {
			void apiFetch('/v1/auth/first-admin', { redirectOn401: false }).then((res) => {
				if (res.ok && res.data?.available === true) {
					setFirstAdminAvailable(true);
				}
			});
		} else {
			setName('');
			setEmail('');
			setPassword('');
			setProblem(null);
			setErrors({});
			setChallenge(null);
			setTotpCode('');
			setRecoveryCode('');
			setUseRecovery(false);
			setFirstAdminAvailable(false);
			busyRef.current = false;
		}
	}, [open]);

	const done = (/** @type {string | undefined} */ consoleKind) => {
		onClose();
		if (onSuccess) {
			onSuccess();
		} else {
			const destination = homeOf(consoleKind === 'admin' ? 'admin' : 'merchant', next);
			window.location.assign(destination);
		}
	};

	const handleSignInSubmit = async () => {
		if (busyRef.current) return;
		const trimmedEmail = email.trim();
		/** @type {Record<string, string>} */
		const localErrors = {};
		if (!trimmedEmail) {
			localErrors.email = 'Email address is required.';
		} else if (!EMAIL_REGEX.test(trimmedEmail)) {
			localErrors.email = 'Enter a valid email address.';
		}
		if (!password) {
			localErrors.password = 'Password is required.';
		}
		setErrors(localErrors);
		if (Object.keys(localErrors).length > 0) return;

		busyRef.current = true;
		setBusy(true);
		setProblem(null);
		try {
			const result = await apiFetch('/v1/auth/sign-in', {
				method: 'POST',
				body: { email: trimmedEmail, password },
				redirectOn401: false,
			});
			if (!result.ok) {
				setProblem(result.problem);
				setErrors(fieldErrors(result.problem));
				return;
			}
			if (result.data?.status === 'two_step_required' && result.data.challenge) {
				setChallenge(result.data.challenge);
			} else {
				done(result.data?.console);
			}
		} finally {
			busyRef.current = false;
			setBusy(false);
		}
	};

	/** @param {string} [overrideCode] */
	const handleTwoStepSubmit = async (overrideCode) => {
		if (busyRef.current) return;
		const raw = typeof overrideCode === 'string' ? overrideCode : useRecovery ? recoveryCode : totpCode;
		const value = useRecovery ? raw.trim().replace(/\s+/g, '') : raw.replace(/\D/g, '');

		// Client-side pre-validation (Tier 1)
		if (useRecovery) {
			if (!value) {
				setErrors({ code: 'Recovery code is required.' });
				return;
			}
			if (!/^[a-z2-7]{5}-?[a-z2-7]{5}$/i.test(value)) {
				setErrors({ code: 'Enter a valid 10-character recovery code.' });
				return;
			}
		} else {
			if (!value) {
				setErrors({ code: 'Enter the 6-digit code from your authenticator app.' });
				return;
			}
			if (value.length < 6) {
				setErrors({ code: 'Please enter all 6 digits.' });
				return;
			}
			if (!/^\d{6}$/.test(value)) {
				setErrors({ code: 'Verification code must contain digits only.' });
				return;
			}
		}

		busyRef.current = true;
		setBusy(true);
		setProblem(null);
		setErrors({});
		try {
			const result = await apiFetch('/v1/auth/sign-in/two-step', {
				method: 'POST',
				body: { challenge, ...(useRecovery ? { recoveryCode: value } : { code: value }) },
				redirectOn401: false,
			});
			if (!result.ok) {
				setProblem(result.problem);
				setErrors(fieldErrors(result.problem));
				if (!useRecovery) {
					setTotpCode('');
				}
				return;
			}
			done(result.data?.console);
		} finally {
			busyRef.current = false;
			setBusy(false);
		}
	};

	const handleCreateFirstAdminSubmit = async () => {
		if (busyRef.current) return;
		const trimmedName = name.trim();
		const trimmedEmail = email.trim();
		/** @type {Record<string, string>} */
		const localErrors = {};
		if (!trimmedName) {
			localErrors.name = 'Full name is required.';
		}
		if (!trimmedEmail) {
			localErrors.email = 'Email address is required.';
		} else if (!EMAIL_REGEX.test(trimmedEmail)) {
			localErrors.email = 'Enter a valid email address.';
		}
		if (!password) {
			localErrors.password = 'Password is required.';
		} else if (password.length < 12) {
			localErrors.password = 'Password must be at least 12 characters.';
		}
		setErrors(localErrors);
		if (Object.keys(localErrors).length > 0) return;

		busyRef.current = true;
		setBusy(true);
		setProblem(null);
		try {
			const result = await apiFetch('/v1/auth/first-admin', {
				method: 'POST',
				body: { name: trimmedName, email: trimmedEmail, password },
				redirectOn401: false,
			});
			if (!result.ok) {
				setProblem(result.problem);
				setErrors(fieldErrors(result.problem));
				return;
			}
			onClose();
			window.location.assign('/admin');
		} finally {
			busyRef.current = false;
			setBusy(false);
		}
	};

	const suspended = problemCode(problem) === 'merchant_suspended';

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title={
				firstAdminAvailable
					? 'Create First Admin'
					: challenge
						? 'Two-step verification'
						: `Sign in to ${brandName}`
			}
			eyebrow={
				firstAdminAvailable
					? 'INITIAL SYSTEM SETUP'
					: challenge
						? 'TWO-STEP VERIFICATION'
						: 'PORTAL ACCESS'
			}
			description={
				firstAdminAvailable
					? 'No admin account exists yet. Enter your details to create the Owner account and initialize the platform.'
					: challenge
						? useRecovery
							? 'Enter one of your backup recovery codes.'
							: 'Enter the 6-digit code from your authenticator app.'
						: 'Enter your credentials to access docs and your dashboard.'
			}
			size="sm">
			{suspended ? (
				<Callout tone="danger">
					Your account is suspended.{' '}
					<TextLink
						as="button"
						type="button"
						onClick={() => {
							onClose();
							scrollToContact();
						}}
						tone="plain"
						className="underline font-semibold cursor-pointer">
						Contact support
					</TextLink>
					.
				</Callout>
			) : null}

			{firstAdminAvailable ? (
				<Form onSubmit={handleCreateFirstAdminSubmit} busy={busy} aria-label="Create First Admin">
					<Input
						label="Full name"
						name="name"
						placeholder="Admin Name"
						value={name}
						onChange={(e) => {
							setName(e.currentTarget.value);
							if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
						}}
						error={errors.name}
						required
						hideRequiredMark
						autoFocus
						className="h-10 text-sm"
					/>

					<Input
						label="Email address"
						type="email"
						name="email"
						autoComplete="username"
						inputMode="email"
						placeholder="admin@company.com"
						value={email}
						onChange={(e) => {
							setEmail(e.currentTarget.value);
							if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
						}}
						error={errors.email}
						required
						hideRequiredMark
						className="h-10 text-sm"
					/>

					<Input
						label="Password"
						type="password"
						name="password"
						autoComplete="new-password"
						placeholder="At least 12 characters"
						help="Must be at least 12 characters."
						value={password}
						onChange={(e) => {
							setPassword(e.currentTarget.value);
							if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
						}}
						error={errors.password}
						required
						hideRequiredMark
						className="h-10 text-sm"
					/>

					<FormError problem={problem} fields={['name', 'email', 'password']} />

					<Button type="submit" block loading={busy} variant="primary" size="md" className="h-10 font-semibold">
						Create Owner &amp; Access Admin
					</Button>
				</Form>
			) : !challenge ? (
				<Form onSubmit={handleSignInSubmit} busy={busy} aria-label="Sign in">
					<Input
						label="Email address"
						type="email"
						name="email"
						autoComplete="username"
						inputMode="email"
						placeholder="name@company.com"
						value={email}
						onChange={(e) => {
							setEmail(e.currentTarget.value);
							if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
						}}
						error={errors.email}
						required
						hideRequiredMark
						autoFocus
						className="h-10 text-sm"
					/>

					<Input
						label="Password"
						type="password"
						name="password"
						autoComplete="current-password"
						placeholder="Enter your password"
						value={password}
						onChange={(e) => {
							setPassword(e.currentTarget.value);
							if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
						}}
						error={errors.password}
						required
						hideRequiredMark
						className="h-10 text-sm"
						aside={
							<TextLink
								as={Link}
								href="/forgot-password"
								onClick={onClose}
								className="text-xs text-muted hover:text-primary transition">
								Forgot password?
							</TextLink>
						}
					/>

					{suspended ? null : <FormError problem={problem} fields={['email', 'password']} />}

					<Button type="submit" block loading={busy} variant="primary" size="md" className="h-10 font-semibold">
						Sign in
					</Button>

					<div className="text-center text-xs text-muted pt-1 flex items-center justify-center gap-1.5">
						<span>Need an account?</span>
						<TextLink
							as="button"
							type="button"
							onClick={() => {
								onClose();
								scrollToContact();
							}}
							tone="primary"
							className="font-semibold cursor-pointer">
							Contact us
						</TextLink>
					</div>
				</Form>
			) : (
				<Form onSubmit={() => void handleTwoStepSubmit()} busy={busy} aria-label="Two-step verification">
					{useRecovery ? (
						<Input
							label="Recovery code"
							name="recoveryCode"
							value={recoveryCode}
							disabled={busy}
							onChange={(e) => {
								setRecoveryCode(e.currentTarget.value);
								if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));
							}}
							placeholder="abcd-efgh-ijkl"
							help="Enter one of your 10-character backup recovery codes."
							error={errors.code || fieldErrors(problem).code || fieldErrors(problem).recoveryCode}
							autoFocus
							required
							hideRequiredMark
							className="h-10 font-mono text-sm"
						/>
					) : (
						<div className="py-1">
							<OtpInput
								label="Two-step code"
								name="code"
								length={6}
								value={totpCode}
								disabled={busy}
								onChange={(val) => {
									setTotpCode(val);
									if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));
								}}
								onComplete={(val) => {
									void handleTwoStepSubmit(val);
								}}
								error={errors.code || fieldErrors(problem).code || fieldErrors(problem).recoveryCode}
								autoFocus
								required
								hideRequiredMark
							/>
						</div>
					)}

					<FormError problem={problem} fields={['code', 'recoveryCode']} />

					{problemCode(problem) === 'token_invalid' ? (
						<Button
							type="button"
							variant="secondary"
							block
							onClick={() => {
								setChallenge(null);
								setPassword('');
								setTotpCode('');
								setRecoveryCode('');
								setUseRecovery(false);
								setErrors({});
								setProblem(null);
							}}>
							Start over
						</Button>
					) : (
						<Button type="submit" block loading={busy} variant="primary" size="md" className="h-10 font-semibold">
							Verify and continue
						</Button>
					)}

					<div className="flex items-center justify-between text-xs text-muted pt-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={busy}
							onClick={() => {
								setUseRecovery((v) => !v);
								setTotpCode('');
								setRecoveryCode('');
								setErrors({});
							}}>
							{useRecovery ? 'Use authenticator code instead' : 'Use a recovery code instead'}
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={busy}
							onClick={() => {
								setChallenge(null);
								setPassword('');
								setTotpCode('');
								setRecoveryCode('');
								setUseRecovery(false);
								setErrors({});
								setProblem(null);
							}}>
							Start over
						</Button>
					</div>
				</Form>
			)}
		</Dialog>
	);
}
