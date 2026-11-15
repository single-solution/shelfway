'use client';

import { useEffect, useRef, useState } from 'react';
import NextLink from 'next/link.js';
import {
	Button,
	Callout,
	Dialog,
	Form,
	FormError,
	Input,
	OtpInput,
	Spinner,
	TextLink,
	fieldErrors,
	problemCode,
} from '@shelfway/ui';
import { apiFetch, takeFragmentToken } from '../../src/console/client.js';
import { homeOf } from '../../src/console/views/sign-in.js';
import { scrollToContact } from './SiteNav.js';

const Link = /** @type {any} */ (NextLink);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_MIN = 12;

/**
 * Sign In & Central Auth Modal Popup for public website and docs navigation.
 * Handles Sign In, Two-Step OTP, First Admin setup, Forgot Password, Reset Password, and Invite Setup.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   brandName?: string,
 *   next?: string | null,
 *   onSuccess?: () => void,
 * }} props
 */
export function SignInModal({ open, onClose, brandName = 'Shelfway', next = '/dashboard', onSuccess }) {
	const [authMode, setAuthMode] = useState(/** @type {'signin' | 'forgot' | 'reset' | 'setup' | 'confirm'} */ ('signin'));
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
	const [linkToken, setLinkToken] = useState('');
	const [forgotSuccess, setForgotSuccess] = useState(false);
	const [setupInfo, setSetupInfo] = useState(/** @type {{ email: string, needsName: boolean } | null} */ (null));
	const [setupChecked, setSetupChecked] = useState(false);

	useEffect(() => {
		if (open) {
			if (typeof window !== 'undefined') {
				const params = new URLSearchParams(window.location.search);
				const authParam = params.get('auth');
				const frag = takeFragmentToken() || params.get('token') || '';
				if (frag) setLinkToken(frag);

				if (authParam === 'forgot') {
					setAuthMode('forgot');
				} else if (authParam === 'reset') {
					setAuthMode('reset');
				} else if (authParam === 'setup') {
					setAuthMode('setup');
				} else if (authParam === 'confirm') {
					setAuthMode('confirm');
				}
			}
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
			setAuthMode('signin');
			setForgotSuccess(false);
			setLinkToken('');
			setSetupInfo(null);
			setSetupChecked(false);
			busyRef.current = false;
		}
	}, [open]);

	// Check setup token when in setup mode
	useEffect(() => {
		if (open && authMode === 'setup' && linkToken && !setupChecked) {
			setBusy(true);
			void apiFetch('/v1/auth/set-password/check', {
				method: 'POST',
				body: { token: linkToken },
				redirectOn401: false,
			}).then((res) => {
				setBusy(false);
				setSetupChecked(true);
				if (res.ok && res.data) {
					setSetupInfo(res.data);
				} else {
					setProblem(/** @type {any} */ (res).problem);
				}
			});
		}
	}, [open, authMode, linkToken, setupChecked]);

	// Auto-confirm email if in confirm mode
	useEffect(() => {
		if (open && authMode === 'confirm' && linkToken) {
			setBusy(true);
			void apiFetch('/v1/auth/confirm-email', {
				method: 'POST',
				body: { token: linkToken },
				redirectOn401: false,
			}).then((res) => {
				setBusy(false);
				if (res.ok) {
					window.location.assign('/dashboard');
				} else {
					setProblem(res.problem);
				}
			});
		}
	}, [open, authMode, linkToken]);

	const done = (/** @type {string | undefined} */ consoleKind) => {
		onClose();
		if (onSuccess) {
			onSuccess();
		} else {
			const targetNext = next || '/dashboard';
			const destination = homeOf(consoleKind === 'admin' ? 'admin' : 'merchant', targetNext);
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

		// Client-side pre-validation
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
		} else if (password.length < PASSWORD_MIN) {
			localErrors.password = `Password must be at least ${PASSWORD_MIN} characters.`;
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
			window.location.assign('/dashboard');
		} finally {
			busyRef.current = false;
			setBusy(false);
		}
	};

	const handleForgotPasswordSubmit = async () => {
		if (busyRef.current) return;
		const trimmedEmail = email.trim();
		if (!trimmedEmail) {
			setErrors({ email: 'Email address is required.' });
			return;
		}
		if (!EMAIL_REGEX.test(trimmedEmail)) {
			setErrors({ email: 'Enter a valid email address.' });
			return;
		}
		busyRef.current = true;
		setBusy(true);
		setProblem(null);
		setErrors({});
		try {
			const result = await apiFetch('/v1/auth/forgot-password', {
				method: 'POST',
				body: { email: trimmedEmail },
				redirectOn401: false,
			});
			if (!result.ok) {
				setProblem(result.problem);
				setErrors(fieldErrors(result.problem));
				return;
			}
			setForgotSuccess(true);
		} finally {
			busyRef.current = false;
			setBusy(false);
		}
	};

	const handleResetPasswordSubmit = async () => {
		if (busyRef.current) return;
		if (!password) {
			setErrors({ password: 'Password is required.' });
			return;
		}
		if (password.length < PASSWORD_MIN) {
			setErrors({ password: `Password must be at least ${PASSWORD_MIN} characters.` });
			return;
		}
		if (!linkToken) {
			setErrors({ password: 'Reset link token is missing or invalid.' });
			return;
		}
		busyRef.current = true;
		setBusy(true);
		setProblem(null);
		setErrors({});
		try {
			const result = await apiFetch('/v1/auth/reset-password', {
				method: 'POST',
				body: { token: linkToken, password },
				redirectOn401: false,
			});
			if (!result.ok) {
				setProblem(result.problem);
				setErrors(fieldErrors(result.problem));
				return;
			}
			onClose();
			window.location.assign('/dashboard');
		} finally {
			busyRef.current = false;
			setBusy(false);
		}
	};

	const handleSetPasswordSubmit = async () => {
		if (busyRef.current) return;
		/** @type {Record<string, string>} */
		const localErrors = {};
		if (setupInfo?.needsName && !name.trim()) {
			localErrors.name = 'Full name is required.';
		}
		if (!password) {
			localErrors.password = 'Password is required.';
		} else if (password.length < PASSWORD_MIN) {
			localErrors.password = `Password must be at least ${PASSWORD_MIN} characters.`;
		}
		if (!linkToken) {
			localErrors.password = 'Setup token is missing or invalid.';
		}
		setErrors(localErrors);
		if (Object.keys(localErrors).length > 0) return;

		busyRef.current = true;
		setBusy(true);
		setProblem(null);
		try {
			const result = await apiFetch('/v1/auth/set-password', {
				method: 'POST',
				body: { token: linkToken, password, ...(setupInfo?.needsName ? { name: name.trim() } : {}) },
				redirectOn401: false,
			});
			if (!result.ok) {
				setProblem(result.problem);
				setErrors(fieldErrors(result.problem));
				return;
			}
			onClose();
			window.location.assign('/dashboard');
		} finally {
			busyRef.current = false;
			setBusy(false);
		}
	};

	const suspended = problemCode(problem) === 'merchant_suspended';

	// Compute dialog headers based on active state
	let dialogTitle = `Sign in to ${brandName}`;
	let dialogEyebrow = 'PORTAL ACCESS';
	let dialogDesc = 'Enter your credentials to access docs and your dashboard.';

	if (firstAdminAvailable) {
		dialogTitle = 'Create First Admin';
		dialogEyebrow = 'INITIAL SYSTEM SETUP';
		dialogDesc = 'No admin account exists yet. Enter your details to create the Owner account and initialize the platform.';
	} else if (challenge) {
		dialogTitle = 'Two-step verification';
		dialogEyebrow = 'TWO-STEP VERIFICATION';
		dialogDesc = useRecovery ? 'Enter one of your backup recovery codes.' : 'Enter the 6-digit code from your authenticator app.';
	} else if (authMode === 'forgot') {
		dialogTitle = 'Reset your password';
		dialogEyebrow = 'PASSWORD RECOVERY';
		dialogDesc = 'Enter your account email address and we will send you instructions to reset your password.';
	} else if (authMode === 'reset') {
		dialogTitle = 'Choose a new password';
		dialogEyebrow = 'PASSWORD RESET';
		dialogDesc = `Enter a new secure password (at least ${PASSWORD_MIN} characters) for your account.`;
	} else if (authMode === 'setup') {
		dialogTitle = 'Set up your password';
		dialogEyebrow = 'ACCOUNT SETUP';
		dialogDesc = setupInfo?.needsName
			? 'Welcome! Enter your name and choose a secure password to activate your account.'
			: 'Welcome! Choose a secure password to activate your account.';
	} else if (authMode === 'confirm') {
		dialogTitle = 'Confirming your email';
		dialogEyebrow = 'EMAIL VERIFICATION';
		dialogDesc = 'Verifying your new email address...';
	}

	return (
		<Dialog
			open={open}
			onClose={onClose}
			title={dialogTitle}
			eyebrow={dialogEyebrow}
			description={dialogDesc}
			size="sm">
			{suspended ? (
				<Callout tone="danger">
					Your account is suspended.{' '}
					<TextLink
						href="#contact"
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
						help="Minimum 12 characters"
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
						Initialize platform
					</Button>
				</Form>
			) : authMode === 'forgot' ? (
				forgotSuccess ? (
					<div className="space-y-4 py-2">
						<Callout tone="success">
							If an account matches that email address, we have sent instructions to reset your password.
						</Callout>
						<Button
							type="button"
							variant="secondary"
							block
							onClick={() => {
								setAuthMode('signin');
								setForgotSuccess(false);
								setProblem(null);
								setErrors({});
							}}>
							Back to sign in
						</Button>
					</div>
				) : (
					<Form onSubmit={handleForgotPasswordSubmit} busy={busy} aria-label="Forgot password">
						<Input
							label="Email address"
							type="email"
							name="email"
							autoComplete="email"
							inputMode="email"
							placeholder="you@company.com"
							value={email}
							onChange={(e) => {
								setEmail(e.currentTarget.value);
								if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
							}}
							error={errors.email}
							autoFocus
							required
							hideRequiredMark
							className="h-10 text-sm"
						/>
						<FormError problem={problem} fields={['email']} />
						<Button type="submit" block loading={busy} variant="primary" size="md" className="h-10 font-semibold">
							Send reset link
						</Button>
						<div className="text-center pt-1">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() => {
									setAuthMode('signin');
									setProblem(null);
									setErrors({});
								}}
								className="text-xs text-muted hover:text-fg">
								Back to sign in
							</Button>
						</div>
					</Form>
				)
			) : authMode === 'reset' ? (
				<Form onSubmit={handleResetPasswordSubmit} busy={busy} aria-label="Reset password">
					{!linkToken ? (
						<Callout tone="danger">The password reset link is missing or invalid.</Callout>
					) : (
						<>
							<Input
								label="New password"
								type="password"
								name="password"
								autoComplete="new-password"
								placeholder="At least 12 characters"
								help="Minimum 12 characters"
								value={password}
								onChange={(e) => {
									setPassword(e.currentTarget.value);
									if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
								}}
								error={errors.password}
								autoFocus
								required
								hideRequiredMark
								className="h-10 text-sm"
							/>
							<FormError problem={problem} fields={['password']} />
							<Button type="submit" block loading={busy} variant="primary" size="md" className="h-10 font-semibold">
								Set new password
							</Button>
						</>
					)}
				</Form>
			) : authMode === 'setup' ? (
				<Form onSubmit={handleSetPasswordSubmit} busy={busy} aria-label="Set password">
					{!linkToken ? (
						<Callout tone="danger">The setup link is missing or invalid.</Callout>
					) : busy && !setupChecked ? (
						<div className="py-6 flex justify-center">
							<Spinner />
						</div>
					) : (
						<>
							{setupInfo?.email ? (
								<Input label="Email address" value={setupInfo.email} readOnly disabled className="h-10 text-sm" />
							) : null}
							{setupInfo?.needsName ? (
								<Input
									label="Full name"
									name="name"
									placeholder="Your name"
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
							) : null}
							<Input
								label="Password"
								type="password"
								name="password"
								autoComplete="new-password"
								placeholder="At least 12 characters"
								help="Minimum 12 characters"
								value={password}
								onChange={(e) => {
									setPassword(e.currentTarget.value);
									if (errors.password) setErrors((prev) => ({ ...prev, password: '' }));
								}}
								error={errors.password}
								autoFocus={!setupInfo?.needsName}
								required
								hideRequiredMark
								className="h-10 text-sm"
							/>
							<FormError problem={problem} fields={['name', 'password']} />
							<Button type="submit" block loading={busy} variant="primary" size="md" className="h-10 font-semibold">
								Activate account
							</Button>
						</>
					)}
				</Form>
			) : authMode === 'confirm' ? (
				<div className="py-6 text-center space-y-4">
					{busy ? (
						<Spinner />
					) : problem ? (
						<Callout tone="danger">Could not confirm email. The link may have expired.</Callout>
					) : (
						<Callout tone="success">Your email address has been confirmed.</Callout>
					)}
				</div>
			) : !challenge ? (
				<Form onSubmit={handleSignInSubmit} busy={busy} aria-label="Sign in">
					<Input
						label="Email address"
						type="email"
						name="email"
						autoComplete="username"
						inputMode="email"
						placeholder="you@company.com"
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
						help={
							<button
								type="button"
								onClick={() => {
									setAuthMode('forgot');
									setProblem(null);
									setErrors({});
								}}
								className="text-xs text-muted hover:text-fg underline cursor-pointer bg-transparent border-0 p-0">
								Forgot password?
							</button>
						}
					/>

					{suspended ? null : <FormError problem={problem} fields={['email', 'password']} />}

					<Button type="submit" block loading={busy} variant="primary" size="md" className="h-10 font-semibold">
						Sign in
					</Button>

					<div className="text-center text-xs text-muted pt-1 flex items-center justify-center gap-1.5">
						<span>Need an account?</span>
						<TextLink
							href="#contact"
							as="button"
							type="button"
							onClick={() => {
								onClose();
								scrollToContact();
							}}
							tone="accent"
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
