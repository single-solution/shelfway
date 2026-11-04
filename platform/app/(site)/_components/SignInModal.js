'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link.js';
import { Button, Callout, Dialog, Form, FormError, Input, TextLink, fieldErrors, problemCode } from '@shelfway/ui';
import { apiFetch } from '../../../src/console/client.js';

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
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [busy, setBusy] = useState(false);
	const [problem, setProblem] = useState(/** @type {any | null} */ (null));
	const [errors, setErrors] = useState(/** @type {Record<string, string>} */ ({}));
	const [challenge, setChallenge] = useState(/** @type {string | null} */ (null));
	const [totpCode, setTotpCode] = useState('');
	const [useRecovery, setUseRecovery] = useState(false);

	useEffect(() => {
		if (!open) {
			setEmail('');
			setPassword('');
			setProblem(null);
			setErrors({});
			setChallenge(null);
			setTotpCode('');
			setUseRecovery(false);
		}
	}, [open]);

	const done = (/** @type {string | undefined} */ consoleKind) => {
		onClose();
		if (onSuccess) {
			onSuccess();
		} else {
			const destination = next || (consoleKind === 'admin' ? '/admin/overview' : '/overview');
			window.location.assign(destination);
		}
	};

	const handleSignInSubmit = async () => {
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

		setBusy(true);
		setProblem(null);
		const result = await apiFetch('/v1/auth/sign-in', {
			method: 'POST',
			body: { email: trimmedEmail, password },
			redirectOn401: false,
		});
		setBusy(false);
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
	};

	const handleTwoStepSubmit = async () => {
		const value = useRecovery ? totpCode.trim() : totpCode.replace(/\s+/g, '');
		if (useRecovery ? !/^[a-z2-7]{5}-?[a-z2-7]{5}$/i.test(value) : !/^\d{6}$/.test(value)) {
			setErrors({
				code: useRecovery ? 'Enter a valid 10-character recovery code.' : 'Enter a 6-digit code from your authenticator app.',
			});
			return;
		}
		setBusy(true);
		setProblem(null);
		setErrors({});
		const result = await apiFetch('/v1/auth/sign-in/two-step', {
			method: 'POST',
			body: { challenge, ...(useRecovery ? { recoveryCode: value } : { code: value }) },
			redirectOn401: false,
		});
		setBusy(false);
		if (!result.ok) {
			setProblem(result.problem);
			setErrors(fieldErrors(result.problem));
			return;
		}
		done(result.data?.console);
	};

	const suspended = problemCode(problem) === 'merchant_suspended';

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title={challenge ? 'Two-step verification' : `Sign in to ${brandName}`}
			description={
				challenge
					? useRecovery
						? 'Enter one of your backup recovery codes.'
						: 'Enter the 6-digit code from your authenticator app.'
					: 'Enter your credentials to access docs and your dashboard.'
			}
			size="sm">
			{suspended ? <Callout tone="danger">Your account is suspended. Contact support.</Callout> : null}

			{!challenge ? (
				<Form onSubmit={handleSignInSubmit} busy={busy} aria-label="Sign in">
					<Input
						label="Email address"
						type="email"
						name="email"
						autoComplete="username"
						inputMode="email"
						value={email}
						onChange={(e) => {
							setEmail(e.currentTarget.value);
							if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
						}}
						error={errors.email}
						required
						autoFocus
					/>

					<Input
						label="Password"
						type="password"
						name="password"
						autoComplete="current-password"
						value={password}
						onChange={(e) => {
							setPassword(e.currentTarget.value);
							if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
						}}
						error={errors.password}
						required
					/>

					{suspended ? null : <FormError problem={problem} fields={['email', 'password']} />}

					<Button type="submit" block loading={busy} variant="primary">
						Sign in
					</Button>

					<div className="flex items-center justify-between text-xs text-muted pt-1">
						<span>Need an account? Contact support.</span>
						<TextLink as={Link} href="/forgot-password" onClick={onClose}>
							Forgot password?
						</TextLink>
					</div>
				</Form>
			) : (
				<Form onSubmit={handleTwoStepSubmit} busy={busy} aria-label="Two-step verification">
					<Input
						label={useRecovery ? 'Recovery code' : 'Two-step code'}
						name="code"
						value={totpCode}
						onPaste={(e) => {
							if (!useRecovery) {
								e.preventDefault();
								const pasted = e.clipboardData.getData('text').replace(/\s+/g, '').slice(0, 6);
								setTotpCode(pasted);
								if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));
							}
						}}
						onChange={(e) => {
							const val = useRecovery ? e.currentTarget.value : e.currentTarget.value.replace(/\s+/g, '');
							setTotpCode(val);
							if (errors.code) setErrors((prev) => ({ ...prev, code: '' }));
						}}
						autoComplete={useRecovery ? 'off' : 'one-time-code'}
						inputMode={useRecovery ? 'text' : 'numeric'}
						maxLength={useRecovery ? 16 : 6}
						placeholder={useRecovery ? 'abcd-efgh-...' : '123456'}
						error={errors.code || fieldErrors(problem).code || fieldErrors(problem).recoveryCode}
						autoFocus
						required
					/>

					<FormError problem={problem} fields={['code', 'recoveryCode']} />

					<Button type="submit" block loading={busy} variant="primary">
						Verify and continue
					</Button>

					<div className="flex items-center justify-between text-xs text-muted pt-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => {
								setUseRecovery((v) => !v);
								setTotpCode('');
								setErrors({});
							}}>
							{useRecovery ? 'Use authenticator code instead' : 'Use a recovery code instead'}
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => {
								setChallenge(null);
								setPassword('');
								setErrors({});
							}}>
							Start over
						</Button>
					</div>
				</Form>
			)}
		</Dialog>
	);
}
