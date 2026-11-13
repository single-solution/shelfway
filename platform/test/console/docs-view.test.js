// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { byText, cleanup, click, render, type } from '@shelfway/ui/testing';
import { DocsHubView, sampleFromSchema } from '../../src/console/views/docs.js';
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
		expect(html).toContain('Role:');
		expect(html).toContain('owner');
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

		// Back to product overview
		const backBtn = byText(document.body, '<- Back to Chat Overview');
		if (backBtn) click(backBtn);
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

		expect(document.body.textContent).toContain('Authenticated Documentation');
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

		expect(document.body.textContent).toContain('Authenticated Documentation');
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
});
