// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { byText, cleanup, click, render, type } from '@shelfway/ui/testing';
import { DocsHubView, extractSchemaProperties, sampleFromSchema } from '../../src/console/views/docs.js';
import { SiteHeader } from '../../app/_components/SiteNav.js';
import * as loaders from '../../src/console/loaders.js';

vi.mock('next/navigation.js', async (importOriginal) => {
	const { testRouter } = await import('./router.js');
	return { .../** @type {object} */ (await importOriginal()), useRouter: () => testRouter };
});

describe('Docs hub views (PLAN Section 10 B1, B2)', () => {
	const branding = { name: 'Shelfway', accent: '#0f766e', logoUrl: null };
	const sampleProduct = {
		productId: 'chat',
		name: 'Chat',
		version: '1.0.0',
		description: 'Talk to visitors in real time with AI and human fallback.',
		status: /** @type {const} */ ('active'),
		baseUrl: 'http://localhost:3003',
		features: [
			{ key: 'ai', name: 'AI Assistant', description: 'Answers customer questions automatically.' },
			{ key: 'inbox', name: 'Operator Inbox', description: 'Staff live response desk.' },
		],
		needs: { database: true, storage: /** @type {const} */ ('optional') },
		links: { offers: [{ scope: 'chat.write', name: 'Send chat' }], needs: [] },
		widgetScriptUrl: 'http://localhost:3003/widget.js',
		widgetScriptLoading: /** @type {const} */ ('async'),
		docsUrl: '/docs/chat',
		openapiUrl: '/docs/chat/openapi.json',
		guide: {
			title: 'Chat Integration Guide',
			intro: 'Embed live chat on your site and automate support with AI.',
			install: 'Add the script to your layout.',
			features: {},
			build: {},
		},
		operations: [
			{
				method: 'GET',
				path: '/v1/conversations',
				summary: 'List active conversations',
				auth: 'server',
				permission: 'chat.read',
				feature: 'inbox',
				description: '',
			},
			{
				method: 'POST',
				path: '/v1/messages',
				summary: 'Send a message',
				auth: 'browser',
				permission: '',
				feature: 'always',
				description: '',
			},
		],
	};

	it('locks DocsHubView with authentication gate when unauthenticated without token', () => {
		const html = renderToString(<DocsHubView branding={branding} items={[sampleProduct]} />);
		expect(html).toContain('Documentation Access Restricted');
		expect(html).toContain('Authentication Required');
		expect(html).toContain('User unique token');
		expect(html).toContain('Unlock Documentation');
		expect(html).not.toContain('Quickstart Guide');
	});

	it('renders DocsHubView with hero, quickstart, and product cards without error when unlocked', () => {
		const html = renderToString(<DocsHubView branding={branding} items={[sampleProduct]} initialToken="test_token" />);
		expect(html).toContain('Documentation Hub');
		expect(html).toContain('Quickstart Guide');
		expect(html).toContain('Chat');
		expect(html).toContain('v1.0.0');
		expect(html).toContain('AI Assistant');
		expect(html).toContain('Storefront APIs');
		expect(html).toContain('Ready Storefront Products');
	});

	it('loads docs hub and product detail via loaders', async () => {
		const mockApi = {
			get: vi.fn(async (path) => {
				if (path === '/v1/docs') {
					return { ok: true, status: 200, data: { items: [sampleProduct] } };
				}
				if (path === '/v1/docs/chat') {
					return { ok: true, status: 200, data: { product: sampleProduct } };
				}
				return { ok: false, status: 404, problem: { code: 'not_found' } };
			}),
		};

		const hubLoaded = await loaders.loadDocsHub(/** @type {any} */ (mockApi));
		expect(hubLoaded.ok).toBe(true);
		if (hubLoaded.ok) {
			expect(hubLoaded.items).toHaveLength(1);
			expect(hubLoaded.items[0].productId).toBe('chat');
		}

		const productLoaded = await loaders.loadDocsProduct(/** @type {any} */ (mockApi), 'chat');
		expect(productLoaded.ok).toBe(true);
		expect(productLoaded.product?.productId).toBe('chat');

		const missingLoaded = await loaders.loadDocsProduct(/** @type {any} */ (mockApi), 'unknown');
		expect(missingLoaded.ok).toBe(false);
		expect(missingLoaded.status).toBe(404);
	});

	it('renders with developer role showing Product Developer SDK section', () => {
		const html = renderToString(
			<DocsHubView
				branding={branding}
				items={[sampleProduct]}
				actor={{ role: 'owner', name: 'Admin' }}
				initialView="product"
			/>,
		);
		expect(html).toContain('Product Developer SDK');
		expect(html).toContain('CORE');
		expect(html).not.toContain('Role: owner');
	});

	it('interactively switches tabs, searches, and inspects operations in DocsHubView', async () => {
		const fullProduct = {
			...sampleProduct,
			operations: [
				{
					method: 'GET',
					path: '/v1/conversations',
					summary: 'List active conversations',
					auth: 'server',
					permission: 'chat.read',
					feature: 'inbox',
					description: 'Returns conversations with paging.',
					parameters: [
						{ name: 'limit', in: 'query', schema: { type: 'integer' }, required: false },
						{ $ref: '#/components/parameters/Paging' },
					],
				},
				{
					method: 'POST',
					path: '/v1/messages',
					summary: 'Send a message',
					auth: 'browser',
					permission: '',
					feature: 'always',
					description: 'Post a chat message to a conversation.',
					requestBody: {
						content: {
							'application/json': {
								schema: {
									type: 'object',
									properties: {
										text: { type: 'string', description: 'Body' },
										num: { type: 'number', minimum: 5 },
										active: { type: 'boolean' },
										tags: { type: 'array', items: { type: 'string', enum: ['tag1', 'tag2'] } },
										email: { type: 'string', format: 'email' },
										date: { type: 'string', format: 'date-time' },
										uri: { type: 'string', format: 'uri' },
									},
								},
							},
						},
					},
					responses: {
						200: {
							description: 'OK',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: { id: { type: 'string' } },
									},
								},
							},
						},
						400: {
							description: 'Bad request',
						},
					},
				},
				{ method: 'PUT', path: '/v1/settings', summary: 'Update settings', auth: 'server' },
				{ method: 'PATCH', path: '/v1/status', summary: 'Patch status', auth: 'ticket' },
				{ method: 'DELETE', path: '/v1/messages/123', summary: 'Delete message', auth: 'server' },
				{ method: 'HEAD', path: '/v1/ping', summary: 'Ping', auth: 'unknown' },
			],
		};

		render(
			<DocsHubView
				branding={branding}
				items={[fullProduct]}
				initialProductId="chat"
				initialToken="test_token"
				actor={{ role: 'owner', name: 'Admin' }}
			/>,
		);

		// Switch to Getting Started sections
		const authBtn = byText(document.body, 'Authentication & Tokens');
		if (authBtn) click(authBtn);
		expect(document.body.textContent).toContain('Credentials Architecture');

		const quickstartBtn = byText(document.body, 'Quickstart Guide');
		if (quickstartBtn) click(quickstartBtn);
		expect(document.body.textContent).toContain('Everyday Development Path');

		// Unified sidebar gives direct access to Product Developer SDK without mode switches
		const cliBtn = byText(document.body, 'CLI');
		if (cliBtn) click(cliBtn);
		expect(document.body.textContent).toContain('CLI Reference');

		// Switch back to products section by clicking Chat in sidebar
		const chatProductBtn = byText(document.body, 'Chat');
		if (chatProductBtn) click(chatProductBtn);

		// Search
		const searchInput = document.querySelector('input[placeholder*="Search"]');
		if (searchInput) {
			type(searchInput, 'messages');
		}

		// Select operation from the overview table
		const opBtn = byText(document.body, '/v1/messages');
		if (opBtn) click(opBtn);
		expect(document.body.textContent).toContain('Post a chat message to a conversation');

		// Switch code snippet tabs
		const jsTab = byText(document.body, 'JavaScript');
		if (jsTab) click(jsTab);
		expect(document.body.textContent).toContain('fetch(');

		const curlTab = byText(document.body, 'cURL');
		if (curlTab) click(curlTab);
		expect(document.body.textContent).toContain('curl -X POST');

		// Back to product overview via sidebar
		const overviewBtn = byText(document.body, 'Overview & Embed');
		if (overviewBtn) click(overviewBtn);
		expect(document.body.textContent).toContain('Available API Operations');
		expect(document.body.textContent).toContain('Active');

		const copyAiBtn = byText(document.body, 'Copy AI Prompt');
		if (copyAiBtn) click(copyAiBtn);

		cleanup();
	});

	it('sampleFromSchema handles cyclic $ref and deep hierarchies safely', () => {
		const components = {
			schemas: {
				Node: {
					type: 'object',
					properties: {
						name: { type: 'string', default: 'node' },
						child: { $ref: '#/components/schemas/Node' },
					},
				},
			},
		};
		const sample = sampleFromSchema({ $ref: '#/components/schemas/Node' }, components);
		expect(sample).toBeDefined();
		expect(sample.name).toBe('node');
		expect(sample.child).toBeDefined();
	});

	it('sampleFromSchema resolves oneOf, anyOf, and allOf schemas', () => {
		const oneOfSchema = {
			oneOf: [
				{ type: 'string', default: 'variantA' },
				{ type: 'string', default: 'variantB' },
			],
		};
		expect(sampleFromSchema(oneOfSchema)).toBe('variantA');

		const anyOfSchema = {
			anyOf: [{ type: 'number', minimum: 42 }, { type: 'string' }],
		};
		expect(sampleFromSchema(anyOfSchema)).toBe(42);

		const allOfSchema = {
			allOf: [
				{ type: 'object', properties: { id: { type: 'string', default: 'id-1' } } },
				{ type: 'object', properties: { count: { type: 'integer', minimum: 5 } } },
			],
		};
		expect(sampleFromSchema(allOfSchema)).toEqual({ id: 'id-1', count: 5 });
	});

	it('locks interactive product docs when unauthenticated and unlocks with user unique token', async () => {
		render(<DocsHubView branding={branding} items={[sampleProduct]} initialProductId="chat" initialSection="products" />);

		expect(document.body.textContent).toContain('Documentation Access Restricted');
		expect(document.body.textContent).toContain('Authentication Required');

		const tokenInput = document.querySelector('input[placeholder*="user unique token"]');
		if (tokenInput) {
			type(tokenInput, 'unique_user_token_123');
		}

		const unlockBtn = byText(document.body, 'Unlock', 'button') || byText(document.body, 'Unlock Documentation', 'button');
		if (unlockBtn) {
			click(unlockBtn);
		}

		expect(document.body.textContent).toContain('Documentation Hub');
		expect(document.body.textContent).not.toContain('Authenticated Documentation');
		cleanup();
	});

	it('enforces role-based access: operator role cannot access Product APIs', async () => {
		render(
			<DocsHubView
				branding={branding}
				items={[sampleProduct]}
				actor={{ role: 'operator', name: 'Desk Agent' }}
				initialSection="quickstart"
			/>,
		);

		const cliBtn = byText(document.body, 'CLI');
		click(cliBtn);

		expect(document.body.textContent).toContain('Role Restricted Access');
		expect(document.body.textContent).toContain('require Developer or Owner privileges');

		cleanup();
	});

	it('renders universal product catalog even with empty items array', () => {
		const html = renderToString(<DocsHubView branding={branding} items={[]} initialToken="universal_tok" />);
		expect(html).toContain('Accounts');
		expect(html).toContain('Chat');
		expect(html).toContain('Ecommerce');
		expect(html).toContain('Payments');
		expect(html).toContain('Notifications');
		expect(html).toContain('Growth');
		expect(html).toContain('Ready Storefront Products');
	});

	it('parses full URL with token and website params and preserves token across view modes', async () => {
		render(<DocsHubView branding={branding} items={[sampleProduct]} />);
		expect(document.body.textContent).toContain('Documentation Access Restricted');

		const tokenInput = document.querySelector('input[placeholder*="user unique token"]');
		if (tokenInput) {
			type(tokenInput, 'https://mysite.com/setup?token=tok_parsed_999&website=mysite.com');
		}

		const unlockBtn = byText(document.body, 'Unlock Documentation', 'button');
		click(unlockBtn);

		expect(document.body.textContent).toContain('Documentation Hub');
		expect(document.body.textContent).not.toContain('Authenticated Documentation');
		expect(document.body.textContent).toContain('mysite.com');

		// Click Share Docs button and verify share link copies
		const shareBtn = byText(document.body, 'Share Docs', 'button');
		expect(shareBtn).toBeDefined();
		click(shareBtn);
		expect(document.body.textContent).toContain('Copied Share Link');

		cleanup();
	});

	it('restricts finance role from Product Developer SDK view', async () => {
		render(
			<DocsHubView
				branding={branding}
				items={[sampleProduct]}
				actor={{ role: 'finance', name: 'Finance Agent' }}
				initialSection="quickstart"
			/>,
		);

		const cliBtn = byText(document.body, 'CLI');
		click(cliBtn);

		expect(document.body.textContent).toContain('Role Restricted Access');
		expect(document.body.textContent).toContain('require Developer or Owner privileges');

		cleanup();
	});

	it('keeps sidebar product operations persistent when switching between sections (never lose context)', async () => {
		render(
			<DocsHubView
				branding={branding}
				items={[sampleProduct]}
				initialProductId="chat"
				initialToken="test_token"
				actor={{ role: 'owner', name: 'Admin' }}
			/>,
		);

		// Chat operations should be visible in sidebar
		expect(document.body.textContent).toContain('Overview & Embed');
		expect(document.body.textContent).toContain('/messages');

		// Click Quickstart Guide - sidebar operations must NOT collapse or be lost
		const quickstartBtn = byText(document.body, 'Quickstart Guide');
		if (quickstartBtn) click(quickstartBtn);

		expect(document.body.textContent).toContain('Everyday Development Path');
		// Sidebar still contains the expanded operations
		expect(document.body.textContent).toContain('Overview & Embed');
		expect(document.body.textContent).toContain('/messages');

		// Click an SDK guide - operations still stay visible in sidebar
		const cliBtn = byText(document.body, 'CLI');
		if (cliBtn) click(cliBtn);

		expect(document.body.textContent).toContain('CLI Reference');
		expect(document.body.textContent).toContain('Overview & Embed');
		expect(document.body.textContent).toContain('/messages');

		cleanup();
	});

	it('renders live product operations passed via initialProductDetails', () => {
		const liveDetail = {
			...sampleProduct,
			operations: [
				{
					method: 'POST',
					path: '/v1/live/webhook',
					summary: 'Realtime Webhook',
					auth: 'server',
					permission: 'live.stream',
					description: 'Live stream webhook.',
				},
			],
		};

		const html = renderToString(
			<DocsHubView
				branding={branding}
				items={[sampleProduct]}
				initialProductId="chat"
				initialToken="test_token"
				initialProductDetails={{ chat: liveDetail }}
			/>,
		);

		expect(html).toContain('Realtime Webhook');
		expect(html).toContain('/live/webhook');
	});

	it('SiteHeader renders section links and separate portal links with Docs and Dashboard', () => {
		const { container } = render(<SiteHeader brandName="Shelfway" isHome={true} session={null} />);

		// Section links
		expect(container.querySelector('a[href="#features"]')).not.toBeNull();
		expect(container.querySelector('a[href="#products"]')).not.toBeNull();
		expect(container.querySelector('a[href="#architecture"]')).not.toBeNull();
		expect(container.querySelector('a[href="#work"]')).not.toBeNull();
		expect(container.querySelector('a[href="#pricing"]')).not.toBeNull();
		expect(container.querySelector('a[href="#contact"]')).not.toBeNull();

		// Divider separating sections from portal links
		expect(container.querySelector('.nav-divider')).not.toBeNull();

		// Portal links
		const portalSection = container.querySelector('.nav-portal-links');
		expect(portalSection).not.toBeNull();
		expect(portalSection?.textContent).toContain('Docs');
		expect(portalSection?.textContent).toContain('Dashboard');

		cleanup();
	});

	it('renders distinct operations per product in the sidebar and supports fixed footer share button', async () => {
		const accountsProduct = {
			productId: 'accounts',
			name: 'Accounts',
			version: '1.0.0',
			description: 'Visitor authentication, shopper profiles, staff access.',
			status: /** @type {const} */ ('active'),
			operations: [
				{
					method: 'POST',
					path: '/v1/auth/sign-in',
					summary: 'Request shopper sign-in code',
					auth: 'browser',
					permission: '',
					feature: 'auth',
					description: '',
				},
				{
					method: 'GET',
					path: '/v1/users',
					summary: 'List customer accounts',
					auth: 'server',
					permission: 'users.read',
					feature: 'staff',
					description: '',
				},
			],
		};

		const chatProduct = {
			productId: 'chat',
			name: 'Chat',
			version: '1.0.0',
			description: 'Real-time visitor chat.',
			status: /** @type {const} */ ('active'),
			operations: [
				{
					method: 'POST',
					path: '/v1/conversations',
					summary: 'Start visitor chat conversation',
					auth: 'browser',
					permission: '',
					feature: 'always',
					description: '',
				},
				{
					method: 'GET',
					path: '/v1/inbox',
					summary: 'List active conversations for operator',
					auth: 'server',
					permission: 'chat.read',
					feature: 'inbox',
					description: '',
				},
			],
		};

		const { container } = render(
			<DocsHubView
				branding={branding}
				items={[accountsProduct, chatProduct]}
				initialProductId="accounts"
				initialToken="scoped_sec_token_888"
				initialWebsite="mysite.shelfway.com"
				actor={{ role: 'owner', name: 'Merchant Owner' }}
			/>,
		);

		// Check restored 2nd header
		expect(container.textContent).toContain('Documentation Hub');
		expect(container.textContent).not.toContain('Authenticated Documentation');
		expect(container.textContent).not.toContain('(Role: owner)');
		expect(container.textContent).toContain('Interactive code snippets below are pre-filled with your scoped credentials.');
		expect(container.textContent).toContain('mysite.shelfway.com');

		// Verify redundant Copy Token and Lock / Change buttons are completely removed
		expect(container.textContent).not.toContain('Copy Token');
		expect(container.textContent).not.toContain('Lock / Change');

		// Expand Chat as well as Accounts
		const chatBtn = byText(container, 'Chat');
		if (chatBtn) click(chatBtn);

		const accountsBtn = byText(container, 'Accounts');
		if (accountsBtn) click(accountsBtn);

		// Setup clipboard mock
		let copiedUrl = '';
		/** @type {HTMLElement | null} */
		let shareDocsBtn = null;
		Object.assign(navigator, {
			clipboard: {
				writeText: vi.fn((text) => {
					copiedUrl = text;
					return Promise.resolve(true);
				}),
			},
		});

		// In the DOM, each product's expanded operations must be distinct and left-aligned without nested indentation
		const sidebar = container.querySelector('aside');
		expect(sidebar).not.toBeNull();
		if (sidebar) {
			expect(sidebar.querySelector('.border-l')).toBeNull();
			expect(sidebar.textContent).toContain('/auth/sign-in');
			expect(sidebar.textContent).toContain('/users');
			expect(sidebar.textContent).toContain('/conversations');
			expect(sidebar.textContent).toContain('/inbox');

			// Check fixed footer Share Docs button
			shareDocsBtn = byText(sidebar, 'Share Docs');
			expect(shareDocsBtn).not.toBeNull();
			if (shareDocsBtn) {
				click(shareDocsBtn);
				expect(sidebar.textContent).toContain('Copied Share Link');
				expect(copiedUrl).toContain('/docs?');
				expect(copiedUrl).toContain('token=scoped_sec_token_888');
				expect(copiedUrl).toContain('website=mysite.shelfway.com');
				expect(copiedUrl).toContain('product=accounts');
				expect(copiedUrl).not.toContain('view=');
			}
		}

		// Search filtering: search for "sign-in"
		const searchInput = container.querySelector('input[placeholder*="Search"]');
		expect(searchInput).not.toBeNull();
		if (searchInput) {
			type(searchInput, 'sign-in');
			// Accounts has sign-in, Chat does not
			expect(sidebar?.textContent).toContain('/auth/sign-in');
			expect(sidebar?.textContent).not.toContain('/conversations');

			// Search for product name "accounts": should show all Accounts operations
			type(searchInput, 'accounts');
			expect(sidebar?.textContent).toContain('/auth/sign-in');
			expect(sidebar?.textContent).toContain('/users');
			expect(sidebar?.textContent).not.toContain('/conversations');

			// Clear search and select an operation under Chat to verify cross-product navigation
			type(searchInput, '');
			if (sidebar) {
				const chatOpBtn = byText(sidebar, '/conversations');
				expect(chatOpBtn).not.toBeNull();
				if (chatOpBtn) {
					click(chatOpBtn);
					expect(container.textContent).toContain('Start visitor chat conversation');
					expect(container.textContent).not.toContain('(Role: owner)');
					expect(container.textContent).not.toContain('Ready-to-Use Code Snippet');
					expect(container.textContent).toContain('Parameters');
					expect(container.textContent).toContain('Request Body');
					expect(container.textContent).toContain('Responses');
					expect(container.textContent).toContain('Code Snippets');
					expect(container.textContent).not.toContain('Storefront Access (Public)');
					expect(container.textContent).not.toContain('Authorization: Browser Token (Public)');
					expect(container.textContent).not.toContain('<- Back to');
					// Operation title does not have redundant copy button next to path
					const opCode = container.querySelector('code.font-mono');
					expect(opCode?.textContent).toBe('/v1/conversations');
					expect(opCode?.parentElement?.textContent).not.toContain('Copy');

					// Fixed footer Share Docs button preserves selected product and operation
					if (shareDocsBtn) {
						click(shareDocsBtn);
						expect(sidebar.textContent).toContain('Copied Share Link');
						expect(copiedUrl).toContain('product=chat');
						expect(copiedUrl).toContain('op=POST%3A%2Fv1%2Fconversations');
					}
				}
			}
		}

		cleanup();
	});

	it('guarantees token is never empty in copied URL when clicking Share Docs button even if token state is empty', async () => {
		let copiedUrl = '';
		Object.assign(navigator, {
			clipboard: {
				writeText: vi.fn((text) => {
					copiedUrl = text;
					return Promise.resolve(true);
				}),
			},
		});

		const { container } = render(
			<DocsHubView
				branding={branding}
				items={[sampleProduct]}
				initialProductId="chat"
				initialOpKey="POST:/v1/conversations"
				actor={{ role: 'owner', name: 'Super Admin', id: 'usr_super_123' }}
			/>,
		);

		const sidebar = container.querySelector('aside');
		expect(sidebar).not.toBeNull();
		if (sidebar) {
			const shareBtn = byText(sidebar, 'Share Docs', 'button');
			expect(shareBtn).not.toBeNull();
			if (shareBtn) {
				click(shareBtn);
				expect(copiedUrl).toContain('/docs?');
				expect(copiedUrl).toContain('token=tok_owner_usr_super_123');
				expect(copiedUrl).toContain('product=chat');
				expect(copiedUrl).toContain('op=POST%3A%2Fv1%2Fconversations');
			}
		}

		cleanup();
	});

	it('renders Swagger REST API layout: clean header without method/path/role, endpoint bar, input parameters, request body, responses, and snippets without Ready-to-Use text', async () => {
		const fullChatProduct = {
			...sampleProduct,
			operations: [
				{
					method: 'POST',
					path: '/v1/conversations',
					summary: 'Start visitor chat conversation',
					auth: 'browser',
					permission: '',
					feature: 'always',
					description: 'Initiate a new live conversation from the storefront widget.',
					requestBody: {
						content: {
							'application/json': {
								schema: {
									type: 'object',
									required: ['message'],
									properties: {
										message: { type: 'string', description: 'Initial message from visitor' },
										visitorName: { type: 'string', description: 'Optional visitor display name' },
									},
								},
							},
						},
					},
					responses: {
						200: {
							description: 'Conversation initiated successfully',
							content: {
								'application/json': {
									schema: {
										type: 'object',
										properties: {
											conversationId: { type: 'string', description: 'Unique conversation identifier' },
										},
									},
								},
							},
						},
					},
				},
			],
		};

		const { container } = render(
			<DocsHubView
				branding={branding}
				items={[fullChatProduct]}
				initialProductId="chat"
				initialOpKey="POST:/v1/conversations"
				initialToken="tok_swagger_test"
				actor={{ role: 'owner', name: 'Super Admin', id: 'usr_owner_789' }}
			/>,
		);

		// 1. Header card is strictly for API name and description (no method badge, no path, no user role)
		const headerCard = container.querySelector('.rounded-card.border-primary\\/30');
		expect(headerCard).not.toBeNull();
		expect(headerCard?.textContent).toContain('Start visitor chat conversation');
		expect(headerCard?.textContent).not.toContain('Super Admin');
		expect(headerCard?.textContent).not.toContain('Role: owner');
		expect(headerCard?.querySelector('code')).toBeNull();

		// 2. Swagger endpoint bar below the header
		const endpointBar = container.querySelector('.rounded-card.border-line.hard');
		expect(endpointBar).not.toBeNull();
		expect(endpointBar?.textContent).toContain('POST');
		expect(endpointBar?.textContent).toContain('/v1/conversations');
		expect(endpointBar?.textContent).toContain('Storefront (Browser)');
		expect(endpointBar?.textContent).toContain('Copy URL');

		// 3. Parameters section
		expect(container.textContent).toContain('Parameters');

		// 4. Request body section with input parameters and types
		expect(container.textContent).toContain('Request Body');
		expect(container.textContent).toContain('application/json');
		expect(container.textContent).toContain('message');
		expect(container.textContent).toContain('Initial message from visitor');

		// 5. Responses section with status and output structure
		expect(container.textContent).toContain('Responses');
		expect(container.textContent).toContain('200');
		expect(container.textContent).toContain('conversationId');

		// 6. Code snippets tabs without "Ready-to-Use Code Snippet" label
		expect(container.textContent).toContain('Code Snippets');
		expect(container.textContent).not.toContain('Ready-to-Use Code Snippet');
		expect(container.textContent).toContain('cURL');
		expect(container.textContent).toContain('JavaScript');
		expect(container.textContent).toContain('Python');

		cleanup();
	});

	it('extractSchemaProperties extracts properties from array schemas and resolves component refs', () => {
		const components = {
			schemas: {
				Message: {
					type: 'object',
					required: ['id', 'text'],
					properties: {
						id: { type: 'string', description: 'Message identifier' },
						text: { type: 'string', description: 'Content of the message' },
					},
				},
			},
		};

		const arraySchema = {
			type: 'array',
			items: {
				$ref: '#/components/schemas/Message',
			},
		};

		const props = extractSchemaProperties(arraySchema, components);
		expect(props).toHaveLength(2);
		expect(props[0]).toEqual({
			name: '[].id',
			type: 'string',
			required: true,
			description: 'Message identifier',
			example: undefined,
		});
		expect(props[1]).toEqual({
			name: '[].text',
			type: 'string',
			required: true,
			description: 'Content of the message',
			example: undefined,
		});
	});

	it('DocsHubView populates token state when actor is provided and preserves token during URL sync', async () => {
		let copiedUrl = '';
		Object.assign(navigator, {
			clipboard: {
				writeText: vi.fn((text) => {
					copiedUrl = text;
					return Promise.resolve(true);
				}),
			},
		});

		const { container } = render(
			<DocsHubView
				branding={branding}
				items={[sampleProduct]}
				initialProductId="chat"
				initialOpKey="POST:/v1/messages"
				actor={{ role: 'developer', name: 'Dev User', id: 'usr_dev_456' }}
			/>,
		);

		// Verified that snippet code block contains pre-resolved token
		expect(container.textContent).toContain('Bearer tok_developer_usr_dev_456');

		// Click Share Docs and verify URL has the token
		const sidebar = container.querySelector('aside');
		expect(sidebar).not.toBeNull();
		if (sidebar) {
			const shareBtn = byText(sidebar, 'Share Docs', 'button');
			expect(shareBtn).not.toBeNull();
			if (shareBtn) {
				click(shareBtn);
				expect(copiedUrl).toContain('token=tok_developer_usr_dev_456');
			}
		}

		cleanup();
	});
});
