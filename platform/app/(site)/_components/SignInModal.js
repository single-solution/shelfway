'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link.js';

const Link = /** @type {any} */ (NextLink);

/**
 * Sign In Modal Popup for public website and docs navigation.
 * Allows visitors to authenticate without leaving their current surface.
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
	const [error, setError] = useState('');
	const [challenge, setChallenge] = useState(/** @type {string | null} */ (null));
	const [totpCode, setTotpCode] = useState('');
	const [useRecovery, setUseRecovery] = useState(false);

	useEffect(() => {
		if (!open) {
			setEmail('');
			setPassword('');
			setError('');
			setChallenge(null);
			setTotpCode('');
			setUseRecovery(false);
		}
	}, [open]);

	useEffect(() => {
		if (!open) return;
		const onKeyDown = (e) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', onKeyDown);
		return () => window.removeEventListener('keydown', onKeyDown);
	}, [open, onClose]);

	if (!open) return null;

	const handleSignInSubmit = async (e) => {
		e.preventDefault();
		const trimmedEmail = email.trim();
		if (!trimmedEmail || !password) {
			setError('Please enter both your email and password.');
			return;
		}
		setBusy(true);
		setError('');
		try {
			const res = await fetch('/v1/auth/sign-in', {
				method: 'POST',
				headers: { 'content-type': 'application/json', accept: 'application/json' },
				body: JSON.stringify({ email: trimmedEmail, password }),
			});
			const data = await res.json().catch(() => null);
			setBusy(false);
			if (!res.ok) {
				setError(data?.detail || data?.message || 'The email or password is incorrect.');
				return;
			}
			if (data?.status === 'two_step_required' && data.challenge) {
				setChallenge(data.challenge);
				return;
			}
			onClose();
			if (onSuccess) {
				onSuccess();
			} else {
				const destination = next || (data?.console === 'admin' ? '/admin/overview' : '/overview');
				window.location.assign(destination);
			}
		} catch (err) {
			setBusy(false);
			setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
		}
	};

	const handleTwoStepSubmit = async (e) => {
		e.preventDefault();
		const codeValue = totpCode.trim();
		if (!codeValue) {
			setError(useRecovery ? 'Enter your recovery code.' : 'Enter the 6-digit code from your authenticator app.');
			return;
		}
		setBusy(true);
		setError('');
		try {
			const payload = {
				challenge,
				...(useRecovery ? { recoveryCode: codeValue } : { code: codeValue }),
			};
			const res = await fetch('/v1/auth/sign-in/two-step', {
				method: 'POST',
				headers: { 'content-type': 'application/json', accept: 'application/json' },
				body: JSON.stringify(payload),
			});
			const data = await res.json().catch(() => null);
			setBusy(false);
			if (!res.ok) {
				setError(data?.detail || 'The code is incorrect.');
				return;
			}
			onClose();
			if (onSuccess) {
				onSuccess();
			} else {
				const destination = next || (data?.console === 'admin' ? '/admin/overview' : '/overview');
				window.location.assign(destination);
			}
		} catch (err) {
			setBusy(false);
			setError(err instanceof Error ? err.message : 'Verification failed.');
		}
	};

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
			role="dialog"
			aria-modal="true"
			aria-labelledby="signin-modal-title"
			onMouseDown={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}>
			<div className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl text-fg sm:p-8">
				<button
					type="button"
					onClick={onClose}
					aria-label="Close dialog"
					className="absolute top-4 right-4 rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg transition">
					<svg
						width="18"
						height="18"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round">
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>

				<div className="mb-6 flex items-center gap-3">
					<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white font-mono text-sm font-bold shadow-sm">
						S
					</span>
					<div>
						<h2 id="signin-modal-title" className="text-xl font-bold tracking-tight">
							{challenge ? 'Two-step verification' : `Sign in to ${brandName}`}
						</h2>
						<p className="text-xs text-muted">
							{challenge
								? useRecovery
									? 'Enter a backup recovery code'
									: 'Enter the code from your authenticator app'
								: 'Enter your credentials to access docs and dashboard'}
						</p>
					</div>
				</div>

				{error ? (
					<div className="mb-4 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger" role="alert">
						{error}
					</div>
				) : null}

				{!challenge ? (
					<form onSubmit={handleSignInSubmit} className="space-y-4">
						<div>
							<label className="block text-xs font-semibold text-fg/80 mb-1" htmlFor="modal-email">
								Email address
							</label>
							<input
								id="modal-email"
								type="email"
								required
								autoComplete="username"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="name@business.com"
								className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
							/>
						</div>

						<div>
							<div className="flex items-center justify-between mb-1">
								<label className="block text-xs font-semibold text-fg/80" htmlFor="modal-password">
									Password
								</label>
								<Link
									href="/forgot-password"
									onClick={onClose}
									className="text-xs text-primary hover:underline font-medium">
									Forgot password?
								</Link>
							</div>
							<input
								id="modal-password"
								type="password"
								required
								autoComplete="current-password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••••••"
								className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
							/>
						</div>

						<button
							type="submit"
							disabled={busy}
							className="mt-2 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-50 transition cursor-pointer">
							{busy ? 'Signing in...' : 'Sign in'}
						</button>
					</form>
				) : (
					<form onSubmit={handleTwoStepSubmit} className="space-y-4">
						<div>
							<label className="block text-xs font-semibold text-fg/80 mb-1" htmlFor="modal-totp">
								{useRecovery ? 'Recovery code' : '6-digit code'}
							</label>
							<input
								id="modal-totp"
								type="text"
								required
								autoFocus
								autoComplete="one-time-code"
								maxLength={useRecovery ? 16 : 6}
								value={totpCode}
								onChange={(e) => setTotpCode(e.target.value)}
								placeholder={useRecovery ? 'abcde-fghij' : '123456'}
								className="w-full rounded-xl border border-line bg-canvas px-3.5 py-2.5 font-mono text-center text-lg tracking-widest text-fg placeholder:text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
							/>
						</div>

						<button
							type="submit"
							disabled={busy}
							className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-50 transition cursor-pointer">
							{busy ? 'Verifying...' : 'Verify code'}
						</button>

						<div className="flex items-center justify-between pt-2 text-xs">
							<button
								type="button"
								onClick={() => {
									setUseRecovery(!useRecovery);
									setTotpCode('');
									setError('');
								}}
								className="text-primary hover:underline font-medium">
								{useRecovery ? 'Use authenticator code instead' : 'Use recovery code instead'}
							</button>
							<button
								type="button"
								onClick={() => {
									setChallenge(null);
									setPassword('');
									setError('');
								}}
								className="text-muted hover:text-fg">
								Start over
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
}
