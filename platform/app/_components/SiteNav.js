'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link.js';
import { usePathname } from 'next/navigation.js';
import { Button, ButtonLink } from '@shelfway/ui';
import { SignInModal } from './SignInModal.js';
import { apiFetch } from '../../src/console/client.js';

const Link = /** @type {any} */ (NextLink);

import { COMPANY_NAME, PRODUCT_BRAND } from './brand.js';

export { COMPANY_NAME, PRODUCT_BRAND };

/**
 * Open the central sign-in modal from anywhere on the public site.
 * @param {string | null} [next]
 */
export const openSignInModal = (next = null) => {
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('shelfway:open-signin', { detail: { next } }));
	}
};

/**
 * Smoothly scroll to the contact section at the bottom of the page,
 * or navigate to /#contact if currently on another route.
 */
export const scrollToContact = () => {
	if (typeof window === 'undefined') return;
	const isHome = window.location.pathname === '/' || window.location.pathname === '';
	if (isHome) {
		const el = document.getElementById('contact');
		if (el) {
			const nav = document.querySelector('.nav-shell');
			const navHeight = nav ? nav.getBoundingClientRect().height : 72;
			const targetY = el.getBoundingClientRect().top + window.scrollY - navHeight - 36;
			window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
			window.history.replaceState(null, '', '#contact');
			return;
		}
	}
	window.location.href = '/#contact';
};

/**
 * Shared floating glass header for the public Portal surface (Website + Docs).
 * @param {{ brandName?: string, isHome?: boolean, session?: any }} props
 */
export function SiteHeader({ brandName = PRODUCT_BRAND, isHome = false, session = null }) {
	const rawPath = usePathname();
	const pathname = rawPath || (isHome ? '/' : '');
	const [scrolled, setScrolled] = useState(false);
	const [showSignInModal, setShowSignInModal] = useState(false);
	const [signInNext, setSignInNext] = useState(/** @type {string | null} */ (null));
	const [activeSession, setActiveSession] = useState(session);

	useEffect(() => {
		setActiveSession(session);
	}, [session]);

	useEffect(() => {
		if (session) return;
		let cancelled = false;
		apiFetch('/v1/me', { redirectOn401: false }).then((res) => {
			if (!cancelled && res.ok && res.data) {
				const d = res.data;
				const isAdm = d.kind === 'admin';
				setActiveSession({
					ok: true,
					kind: d.kind,
					admin: isAdm ? d.admin : undefined,
					merchantId: d.merchant?.merchantId,
					name: d.admin?.name || d.actor?.name || d.merchant?.name || (isAdm ? 'Admin' : 'Merchant'),
				});
			}
		});
		return () => {
			cancelled = true;
		};
	}, [session]);

	useEffect(() => {
		let mounted = true;
		let rafId = 0;
		let ticking = false;
		let lastState = window.scrollY > 12;
		setScrolled(lastState);
		const onScroll = () => {
			if (!ticking) {
				rafId = window.requestAnimationFrame(() => {
					if (!mounted) return;
					const nextState = window.scrollY > 12;
					if (nextState !== lastState) {
						lastState = nextState;
						setScrolled(nextState);
					}
					ticking = false;
				});
				ticking = true;
			}
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => {
			mounted = false;
			if (rafId) window.cancelAnimationFrame(rafId);
			window.removeEventListener('scroll', onScroll);
		};
	}, []);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams(window.location.search);
		if (params.has('auth') || params.has('login')) {
			setShowSignInModal(true);
			const n = params.get('next');
			if (n) setSignInNext(n);
		}
		if (params.has('contact')) {
			scrollToContact();
		}
	}, []);

	useEffect(() => {
		/** @param {any} e */
		const handleOpenSignIn = (e) => {
			setShowSignInModal(true);
			if (e.detail?.next) setSignInNext(e.detail.next);
		};
		window.addEventListener('shelfway:open-signin', handleOpenSignIn);
		return () => {
			window.removeEventListener('shelfway:open-signin', handleOpenSignIn);
		};
	}, []);

	const isCurrentHome = isHome || pathname === '/';
	const isDocs = pathname === '/docs' || pathname.startsWith('/docs/');
	const isAdmin = Boolean(activeSession?.admin || activeSession?.kind === 'admin');
	const dashboardHref = isAdmin ? '/admin' : '/overview';

	const handleCloseSignIn = () => {
		setShowSignInModal(false);
		if (typeof window !== 'undefined' && window.location.search) {
			const url = new URL(window.location.href);
			url.searchParams.delete('auth');
			url.searchParams.delete('login');
			url.searchParams.delete('next');
			window.history.replaceState(null, '', url.pathname + (url.search || ''));
		}
	};

	/** @param {import('react').MouseEvent} e */
	const handleContactClick = (e) => {
		if (isCurrentHome) {
			e.preventDefault();
			scrollToContact();
		}
	};

	return (
		<>
			<div className={`nav-shell${scrolled ? ' is-scrolled' : ''}`}>
				<header className="nav">
					<Link className="brand" href={isCurrentHome ? '#top' : '/'}>
						{brandName}
					</Link>
					<nav aria-label="Main">
						<div className="nav-section-links">
							<a href={isCurrentHome ? '#features' : '/#features'}>Features</a>
							<a href={isCurrentHome ? '#products' : '/#products'}>Products</a>
							<a href={isCurrentHome ? '#architecture' : '/#architecture'}>Architecture</a>
							<a href={isCurrentHome ? '#work' : '/#work'}>Workflow</a>
							<a href={isCurrentHome ? '#pricing' : '/#pricing'}>Pricing</a>
							<a
								href={isCurrentHome ? '#contact' : '/#contact'}
								onClick={handleContactClick}
								className="cursor-pointer text-muted hover:text-fg transition font-medium">
								Contact
							</a>
						</div>
						<span className="nav-divider" aria-hidden="true" />
						<div className="nav-portal-links">
							<Link href="/docs" style={isDocs ? { color: 'var(--shelfway-primary)', fontWeight: 600 } : undefined}>
								Docs
							</Link>
						</div>
					</nav>
					{activeSession ? (
						<ButtonLink as={Link} className="cta" href={dashboardHref}>
							Dashboard
						</ButtonLink>
					) : (
						<Button
							type="button"
							className="cta"
							onClick={() => {
								setSignInNext(null);
								setShowSignInModal(true);
							}}>
							Sign in
						</Button>
					)}
				</header>
			</div>
			<SignInModal open={showSignInModal} onClose={handleCloseSignIn} brandName={brandName} next={signInNext} />
		</>
	);
}

/**
 * Shared footer for the public Portal surface (Website + Docs).
 * @param {{ brandName?: string, companyName?: string, isHome?: boolean, session?: any }} props
 */
export function SiteFooter({ brandName = PRODUCT_BRAND, companyName = COMPANY_NAME, isHome = false, session = null }) {
	const isAdmin = Boolean(session?.admin || session?.kind === 'admin');
	const dashboardHref = isAdmin ? '/admin' : '/overview';
	const dashboardLabel = 'Dashboard';

	/** @param {import('react').MouseEvent} e */
	const handleContactClick = (e) => {
		if (isHome) {
			e.preventDefault();
			scrollToContact();
		}
	};

	return (
		<footer>
			<div>
				<strong>{brandName}</strong>
				<span className="by">by {companyName}</span>
			</div>
			<nav aria-label="Footer">
				<a href={isHome ? '#features' : '/#features'}>Features</a>
				<a href={isHome ? '#products' : '/#products'}>Products</a>
				<a href={isHome ? '#architecture' : '/#architecture'}>Architecture</a>
				<a href={isHome ? '#work' : '/#work'}>Workflow</a>
				<a href={isHome ? '#pricing' : '/#pricing'}>Pricing</a>
				<a
					href={isHome ? '#contact' : '/#contact'}
					onClick={handleContactClick}
					className="cursor-pointer text-muted hover:text-fg transition">
					Contact
				</a>
				<Link href="/docs">Docs</Link>
				<Link href={dashboardHref}>{dashboardLabel}</Link>
				{session ? null : (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => openSignInModal()}
						className="cursor-pointer text-muted hover:text-fg transition p-0 h-auto font-semibold text-sm">
						Sign in
					</Button>
				)}
			</nav>
		</footer>
	);
}
