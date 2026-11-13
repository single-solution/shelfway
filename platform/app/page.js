import { platformSession } from './_lib/server.js';
import { COMPANY_NAME, PRODUCT_BRAND } from './_components/brand.js';
import { SiteHome } from './_components/SiteHome.js';

export const dynamic = 'force-dynamic';

/** Public marketing home on the Portal. */
export async function generateMetadata() {
	return {
		title: { absolute: PRODUCT_BRAND },
		description: `${PRODUCT_BRAND} by ${COMPANY_NAME}: ready website features - sign-in, payments, chat, and more - without building them yourself. You keep the look. One account to manage it. Plans follow your account.`,
		robots: { index: true, follow: true },
	};
}

/** Static marketing products for public landing page - zero backend overhead. */
const STATIC_PRODUCTS = [
	{
		id: 'accounts',
		name: 'Accounts',
		description: 'Members and staff on your website - without building sign-in from scratch.',
	},
	{
		id: 'ecommerce',
		name: 'Ecommerce',
		description: 'Catalog, cart, and orders - when you sell.',
	},
	{
		id: 'payments',
		name: 'Payments',
		description: 'Payment links, wallets, cards, and proof checks - set up in your account.',
	},
	{
		id: 'chat',
		name: 'Chat',
		description: 'Live chat where people already are - with help from AI when you want it.',
	},
	{
		id: 'notifications',
		name: 'Notifications',
		description: 'Updates and alerts from one place - not five separate tools.',
	},
	{
		id: 'growth',
		name: 'Growth',
		description: 'Consent, SEO, and site measurement.',
	},
];

export default async function SitePage() {
	const session = await platformSession().catch(() => ({ ok: false }));
	return (
		<div className="shelfway-site flex min-h-screen flex-col bg-transparent text-fg font-sans">
			<SiteHome
				productName={PRODUCT_BRAND}
				companyName={COMPANY_NAME}
				products={STATIC_PRODUCTS}
				session={session?.ok ? session : null}
			/>
		</div>
	);
}
