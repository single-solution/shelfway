'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link.js';
import { usePathname } from 'next/navigation.js';
import { SignInModal } from './SignInModal.js';
import { ContactModal } from './ContactModal.js';

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
 * Open the central contact modal from anywhere on the public site or docs.
 */
export const openContactModal = () => {
	if (typeof window !== 'undefined') {
		window.dispatchEvent(new CustomEvent('shelfway:open-contact'));
	}
};

/**
 * Shared floating glass header for the public Portal surface (Website + Docs).
 * @param {{ brandName?: string, companyName?: string, isHome?: boolean, session?: any }} props
 */
export function SiteHeader({ brandName = PRODUCT_BRAND, companyName = COMPANY_NAME, isHome = false, session = null }) {
	const rawPath = usePathname();
	const pathname = rawPath || (isHome ? '/' : '');
	const [scrolled, setScrolled] = useState(false);
	const [showSignInModal, setShowSignInModal] = useState(false);
	const [showContactModal, setShowContactModal] = useState(false);
	const [signInNext, setSignInNext] = useState(/** @type {string | null} */ (null));

	useEffect(() => {
		const onScroll = () => setScrolled(window.scrollY > 12);
		onScroll();
		window.addEventListener('scroll', onScroll, { passive: true });
		return () => window.removeEventListener('scroll', onScroll);
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
			setShowContactModal(true);
		}
	}, []);

	useEffect(() => {
		/** @param {any} e */
		const handleOpenSignIn = (e) => {
			setShowSignInModal(true);
			if (e.detail?.next) setSignInNext(e.detail.next);
		};
		const handleOpenContact = () => setShowContactModal(true);
		window.addEventListener('shelfway:open-signin', handleOpenSignIn);
		window.addEventListener('shelfway:open-contact', handleOpenContact);
		return () => {
			window.removeEventListener('shelfway:open-signin', handleOpenSignIn);
			window.removeEventListener('shelfway:open-contact', handleOpenContact);
		};
	}, []);

	const isCurrentHome = isHome || pathname === '/';
	const isDocs = pathname === '/docs' || pathname.startsWith('/docs/');

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

	const handleCloseContact = () => {
		setShowContactModal(false);
		if (typeof window !== 'undefined' && window.location.search) {
			const url = new URL(window.location.href);
			url.searchParams.delete('contact');
			window.history.replaceState(null, '', url.pathname + (url.search || ''));
		}
	};

	return (
		<>
			<div className={`nav-shell${scrolled ? ' is-scrolled' : ''}`}>
				<header className="nav glass">
					<Link className="brand" href={isCurrentHome ? '#top' : '/'}>
						{brandName}
					</Link>
					<nav aria-label="Main">
						<a href={isCurrentHome ? '#products' : '/#products'}>Features</a>
						<Link href="/docs" style={isDocs ? { color: 'var(--shelfway-primary)', fontWeight: 600 } : undefined}>
							Docs
						</Link>
						<button
							type="button"
							onClick={() => setShowContactModal(true)}
							className="cursor-pointer text-muted hover:text-fg transition font-medium">
							Contact
						</button>
						{session ? <Link href="/overview">Dashboard</Link> : null}
					</nav>
					{session ? (
						<Link className="cta" href="/overview">
							Dashboard
						</Link>
					) : (
						<button
							type="button"
							className="cta cursor-pointer"
							onClick={() => {
								setSignInNext(null);
								setShowSignInModal(true);
							}}>
							Sign in
						</button>
					)}
				</header>
			</div>
			<SignInModal open={showSignInModal} onClose={handleCloseSignIn} brandName={brandName} next={signInNext} />
			<ContactModal open={showContactModal} onClose={handleCloseContact} brandName={brandName} companyName={companyName} />
		</>
	);
}

/**
 * Shared footer for the public Portal surface (Website + Docs).
 * @param {{ brandName?: string, companyName?: string, isHome?: boolean, session?: any }} props
 */
export function SiteFooter({ brandName = PRODUCT_BRAND, companyName = COMPANY_NAME, isHome = false, session = null }) {
	return (
		<footer>
			<div>
				<strong>{brandName}</strong>
				<span className="by">by {companyName}</span>
			</div>
			<nav aria-label="Footer">
				<a href={isHome ? '#products' : '/#products'}>Features</a>
				<Link href="/docs">Docs</Link>
				<button
					type="button"
					onClick={() => openContactModal()}
					className="cursor-pointer text-muted hover:text-fg transition">
					Contact
				</button>
				{session ? (
					<Link href="/overview">Dashboard</Link>
				) : (
					<button
						type="button"
						onClick={() => openSignInModal()}
						className="cursor-pointer text-muted hover:text-fg transition">
						Sign in
					</button>
				)}
			</nav>
		</footer>
	);
}
