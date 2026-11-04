'use client';

import { useEffect, useState } from 'react';
import NextLink from 'next/link.js';
import { usePathname } from 'next/navigation.js';
import { SignInModal } from './SignInModal.js';

const Link = /** @type {any} */ (NextLink);

import { COMPANY_NAME, PRODUCT_BRAND } from './brand.js';

export { COMPANY_NAME, PRODUCT_BRAND };

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
	}, []);

	const isCurrentHome = isHome || pathname === '/';
	const isDocs = pathname === '/docs' || pathname.startsWith('/docs/');

	return (
		<>
			<div className={`nav-shell${scrolled ? ' is-scrolled' : ''}`}>
				<header className="nav glass">
					<Link className="brand" href={isCurrentHome ? '#top' : '/'}>
						{brandName}
					</Link>
					<nav aria-label="Main">
						<a href={isCurrentHome ? '#products' : '/#products'}>Features</a>
						<Link
							href="/docs"
							onClick={(e) => {
								if (!session) {
									e.preventDefault();
									setSignInNext('/docs');
									setShowSignInModal(true);
								}
							}}
							style={isDocs ? { color: 'var(--shelfway-primary)', fontWeight: 600 } : undefined}>
							Docs
						</Link>
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
			<SignInModal open={showSignInModal} onClose={() => setShowSignInModal(false)} brandName={brandName} next={signInNext} />
		</>
	);
}

/**
 * Shared footer for the public Portal surface (Website + Docs).
 * @param {{ brandName?: string, companyName?: string, isHome?: boolean, session?: any }} props
 */
export function SiteFooter({ brandName = PRODUCT_BRAND, companyName = COMPANY_NAME, isHome = false, session = null }) {
	const [showSignInModal, setShowSignInModal] = useState(false);

	return (
		<>
			<footer>
				<div>
					<strong>{brandName}</strong>
					<span className="by">by {companyName}</span>
				</div>
				<nav aria-label="Footer">
					<a href={isHome ? '#products' : '/#products'}>Features</a>
					<Link href="/docs">Docs</Link>
					{session ? (
						<Link href="/overview">Dashboard</Link>
					) : (
						<button
							type="button"
							onClick={() => setShowSignInModal(true)}
							className="cursor-pointer text-muted hover:text-fg transition">
							Sign in
						</button>
					)}
				</nav>
			</footer>
			<SignInModal open={showSignInModal} onClose={() => setShowSignInModal(false)} brandName={brandName} />
		</>
	);
}
