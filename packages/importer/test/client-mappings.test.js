import { ObjectId } from 'mongodb';
import { describe, expect, it } from 'vitest';
import { MAPPINGS } from '../src/mappings/index.js';
import { CHANDNI_TRADERS_MAPPING, FABRIC_UNITS, settingsPlan as ctSettingsPlan } from '../src/mappings/chandni-traders/index.js';
import {
	CONDITION_GRADES,
	IBRAHIM_MOBILES_MAPPING,
	PTA_STATUSES,
	settingsPlan as imsSettingsPlan,
	validateImei,
} from '../src/mappings/ibrahim-mobiles/index.js';

/** @param {number} n */
const oid = (n) => new ObjectId(`5b0000000000000000000${String(n).padStart(3, '0')}`);

/** @type {import('../src/mapping.js').MapContext} */
const fakeCtx = {
	id: (prefix, sourceId) => `${prefix}_${String(sourceId)}`,
	ref: () => null,
	lookup: () => null,
};

describe('client mappings', () => {
	it('registers all 3 client mappings in MAPPINGS', () => {
		expect(MAPPINGS['sisters-boutique']).toBeDefined();
		expect(MAPPINGS['ibrahim-mobiles']).toBe(IBRAHIM_MOBILES_MAPPING);
		expect(MAPPINGS['chandni-traders']).toBe(CHANDNI_TRADERS_MAPPING);
	});

	describe('Ibrahim Mobile Store mapping', () => {
		it('has valid step definitions and metadata', () => {
			expect(IBRAHIM_MOBILES_MAPPING.name).toBe('ibrahim-mobiles');
			expect(IBRAHIM_MOBILES_MAPPING.steps.length).toBeGreaterThanOrEqual(6);
			expect(CONDITION_GRADES.map((g) => g.key)).toEqual(['new', 'open_box', 'grade_a', 'grade_b', 'refurbished']);
			expect(PTA_STATUSES.map((p) => p.key)).toEqual(['pta_approved', 'non_pta', 'jv']);
		});

		it('validates 15-digit IMEI checksums using the Luhn algorithm', () => {
			// Valid sample IMEI (sum = 70)
			expect(validateImei('356938035643809')).toBe(true);
			// Invalid lengths or check digits
			expect(validateImei('12345')).toBe(false);
			expect(validateImei('356938035643803')).toBe(false);
			expect(validateImei('')).toBe(false);
		});

		it('generates a complete SettingsPlan activating grades_serials', () => {
			const plan = imsSettingsPlan();
			expect(plan.ecommerce?.settings?.['grades_serials.requireSerialOnFulfillment']).toBe(true);
			expect(plan.ecommerce?.settings?.['grades_serials.validateImeiChecksum']).toBe(true);
			expect(plan.ecommerce?.settings?.['grades_serials.defaultWarrantyDays']).toBe(90);
			expect(plan.ecommerce?.settings?.['variants.trackStockPerVariant']).toBe(true);
			expect(plan.ecommerce?.settings?.['checkout.numberPrefix']).toBe('IMS-');
		});

		it('maps taxonomies, people and settings with fake db', async () => {
			// Taxonomies
			const [catStep, brnStep, attStep] = IBRAHIM_MOBILES_MAPPING.steps.filter((s) =>
				['categories', 'brands', 'attributes'].includes(s.collection),
			);
			/** @type {any} */
			const cat = catStep?.map({ _id: oid(1), slug: 'smartphones', name: 'Smart Phones' }, fakeCtx);
			expect(cat?.name).toBe('Smart Phones');
			if (cat && catStep?.lookups) {
				const [key] = Object.keys(catStep.lookups);
				const lookupFn = key ? catStep.lookups[key] : null;
				expect(lookupFn?.(cat, {})).toBe('smartphones');
			}

			/** @type {any} */
			const brn = brnStep?.map({ _id: oid(2), slug: 'apple', name: 'Apple' }, fakeCtx);
			expect(brn?.name).toBe('Apple');
			if (brn && brnStep?.lookups) {
				const [key] = Object.keys(brnStep.lookups);
				const lookupFn = key ? brnStep.lookups[key] : null;
				expect(lookupFn?.(brn, {})).toBe('apple');
			}

			/** @type {any} */
			const att = attStep?.map(
				{ _id: oid(3), slug: 'storage', label: 'Storage', options: [{ value: '128gb', label: '128 GB' }] },
				fakeCtx,
			);
			expect(att?.name).toBe('Storage');
			if (att && attStep?.lookups) {
				const [key] = Object.keys(attStep.lookups);
				const lookupFn = key ? attStep.lookups[key] : null;
				expect(lookupFn?.(att, {})).toBe('storage');
			}

			// People
			const roleStep = IBRAHIM_MOBILES_MAPPING.steps.find((s) => s.collection === 'roles');
			/** @type {any} */
			const rol = roleStep?.map({ _id: oid(4), key: 'reseller', name: 'Reseller' }, fakeCtx);
			expect(rol?.key).toBe('reseller');

			const staffStep = IBRAHIM_MOBILES_MAPPING.steps.find((s) => s.collection === 'users');
			/** @type {any} */
			const staff = staffStep?.map({ _id: oid(5), email: 'admin@ims.com', isSuperAdmin: true }, fakeCtx);
			expect(staff?.role).toBe('owner');
			if (staff) {
				expect(staffStep?.sums?.(staff)).toEqual({ 'users.staff': 1 });
			}

			// Customer step
			const customerStep = IBRAHIM_MOBILES_MAPPING.steps.find((s) => s.collection === 'customers');
			/** @type {any} */
			const cus = customerStep?.map(
				{
					_id: oid(6),
					phone: '03001234567',
					name: 'Bilal',
					addresses: [{ street: 'Main Rd', city: 'Lahore' }],
				},
				fakeCtx,
			);
			expect(cus?.name).toBe('Bilal');
			expect(customerStep?.mergeKey?.({ phone: '03001234567' }, {})).toBe('+923001234567');
			if (cus) {
				expect(customerStep?.sums?.(cus)).toEqual({ customers: 1 });
			}
			expect(customerStep?.map({ _id: oid(7) }, fakeCtx)).toBeNull();

			// Product sums
			const productStep = IBRAHIM_MOBILES_MAPPING.steps.find((s) => s.collection === 'products');
			expect(productStep?.sums?.({ variants: [{ stock: 5 }, { stock: 10 }] })).toEqual({
				products: 1,
				variants: 2,
				'stock.units': 15,
			});

			// Order sums
			const orderStep = IBRAHIM_MOBILES_MAPPING.steps.find((s) => s.collection === 'orders');
			expect(orderStep?.sums?.({ status: 'delivered', total: 500000 })).toEqual({
				orders: 1,
				'orders.delivered.count': 1,
				'orders.delivered.total': 500000,
			});

			// Settings with db
			/** @type {any} */
			const fakeDb = {
				collection: () => ({
					findOne: async () => ({ key: 'store', publicSiteUrl: 'https://custom-ims.com' }),
				}),
			};
			if (IBRAHIM_MOBILES_MAPPING.settings) {
				const plan = await IBRAHIM_MOBILES_MAPPING.settings(fakeDb);
				expect(plan.ecommerce?.settings?.['checkout.numberPrefix']).toBe('IMS-');
				const planDefault = await IBRAHIM_MOBILES_MAPPING.settings(/** @type {any} */ (null));
				expect(planDefault.ecommerce?.settings?.['checkout.numberPrefix']).toBe('IMS-');
			}
		});

		it('maps device catalog documents with serial requirement and condition grade', () => {
			const productStep = IBRAHIM_MOBILES_MAPPING.steps.find((s) => s.collection === 'products');
			expect(productStep).toBeDefined();

			const mapped = productStep?.map(
				{
					_id: oid(10),
					name: 'iPhone 15 Pro Max',
					slug: 'iphone-15-pro-max',
					categorySlug: 'smartphones',
					brandSlug: 'apple',
					condition: 'grade_a',
					warrantyDays: 90,
					variants: [
						{
							sku: 'IP15PM-256-TI',
							title: 'iPhone 15 Pro Max 256GB Natural Titanium',
							priceRupees: 385000,
							stock: 3,
							storage: '256gb',
							color: 'natural_titanium',
							condition: 'grade_a',
							ptaStatus: 'pta_approved',
						},
					],
				},
				fakeCtx,
			);

			expect(mapped).toMatchObject({
				id: 'prd_5b0000000000000000000010',
				title: 'iPhone 15 Pro Max',
				serialized: true,
				condition: 'grade_a',
				warrantyDays: 90,
				variants: [
					{
						sku: 'IP15PM-256-TI',
						price: 38500000, // In paisa
						stock: 3,
						attributes: {
							storage: '256gb',
							color: 'natural_titanium',
							condition: 'grade_a',
							ptaStatus: 'pta_approved',
						},
					},
				],
			});
		});

		it('maps order line items capturing device IMEIs', () => {
			const orderStep = IBRAHIM_MOBILES_MAPPING.steps.find((s) => s.collection === 'orders');
			expect(orderStep).toBeDefined();

			const mapped = orderStep?.map(
				{
					_id: oid(20),
					orderNumber: 'IMS-2026-0042',
					status: 'delivered',
					customerPhone: '+923001234567',
					customerName: 'Hamza Khan',
					totalRupees: 385000,
					items: [
						{
							name: 'iPhone 15 Pro Max',
							sku: 'IP15PM-256-TI',
							quantity: 1,
							priceRupees: 385000,
							imei: '356938035643809',
						},
					],
				},
				fakeCtx,
			);

			expect(mapped).toMatchObject({
				number: 'IMS-2026-0042',
				status: 'delivered',
				total: 38500000,
				lines: [
					{
						sku: 'IP15PM-256-TI',
						quantity: 1,
						serial: '356938035643809',
					},
				],
			});
		});
	});

	describe('Chandni Traders mapping', () => {
		it('has valid step definitions and metadata', () => {
			expect(CHANDNI_TRADERS_MAPPING.name).toBe('chandni-traders');
			expect(CHANDNI_TRADERS_MAPPING.steps.length).toBeGreaterThanOrEqual(6);
			expect(FABRIC_UNITS.map((u) => u.key)).toEqual(['m', 'yd', 'gaz']);
		});

		it('generates a complete SettingsPlan activating measured_sales and role_pricing', () => {
			const plan = ctSettingsPlan();
			expect(plan.ecommerce?.settings?.['measured_sales.defaultUnit']).toBe('m');
			expect(plan.ecommerce?.settings?.['measured_sales.defaultDecimals']).toBe(2);
			expect(plan.ecommerce?.settings?.['measured_sales.defaultStep']).toBe(0.5);
			expect(plan.ecommerce?.settings?.['measured_sales.enableFractionalStock']).toBe(true);
			expect(plan.ecommerce?.settings?.['role_pricing.enableRolePricing']).toBe(true);
			expect(plan.ecommerce?.settings?.['checkout.numberPrefix']).toBe('CT-');
		});

		it('maps taxonomies, people and settings with fake db', async () => {
			// Taxonomies
			const [catStep, brnStep, attStep] = CHANDNI_TRADERS_MAPPING.steps.filter((s) =>
				['categories', 'brands', 'attributes'].includes(s.collection),
			);
			/** @type {any} */
			const cat = catStep?.map({ _id: oid(1), slug: 'silk', name: 'Silk' }, fakeCtx);
			expect(cat?.name).toBe('Silk');
			if (cat && catStep?.lookups) {
				const [key] = Object.keys(catStep.lookups);
				const lookupFn = key ? catStep.lookups[key] : null;
				expect(lookupFn?.(cat, {})).toBe('silk');
			}

			/** @type {any} */
			const brn = brnStep?.map({ _id: oid(2), slug: 'alkaram', name: 'Alkaram' }, fakeCtx);
			expect(brn?.name).toBe('Alkaram');
			if (brn && brnStep?.lookups) {
				const [key] = Object.keys(brnStep.lookups);
				const lookupFn = key ? brnStep.lookups[key] : null;
				expect(lookupFn?.(brn, {})).toBe('alkaram');
			}

			/** @type {any} */
			const att = attStep?.map(
				{ _id: oid(3), slug: 'fabric-type', label: 'Fabric Type', options: ['raw_silk', 'chiffon'] },
				fakeCtx,
			);
			expect(att?.name).toBe('Fabric Type');
			if (att && attStep?.lookups) {
				const [key] = Object.keys(attStep.lookups);
				const lookupFn = key ? attStep.lookups[key] : null;
				expect(lookupFn?.(att, {})).toBe('fabric-type');
			}

			// People
			const roleStep = CHANDNI_TRADERS_MAPPING.steps.find((s) => s.collection === 'roles');
			/** @type {any} */
			const rol = roleStep?.map({ _id: oid(4), key: 'wholesale_buyer', name: 'Wholesale Buyer' }, fakeCtx);
			expect(rol?.key).toBe('wholesale_buyer');

			const staffStep = CHANDNI_TRADERS_MAPPING.steps.find((s) => s.collection === 'users');
			/** @type {any} */
			const staff = staffStep?.map({ _id: oid(5), email: 'manager@ct.com', role: 'product_manager' }, fakeCtx);
			expect(staff?.role).toBe('product_manager');
			if (staff) {
				expect(staffStep?.sums?.(staff)).toEqual({ 'users.staff': 1 });
			}

			// Customer step
			const customerStep = CHANDNI_TRADERS_MAPPING.steps.find((s) => s.collection === 'customers');
			/** @type {any} */
			const cus = customerStep?.map(
				{
					_id: oid(6),
					phone: '03211234567',
					name: 'Tariq Textiles',
					businessName: 'Tariq Ltd',
					taxNumber: '1234567-8',
					addresses: [{ street: 'Bazaar Rd', city: 'Karachi' }],
				},
				fakeCtx,
			);
			expect(cus?.name).toBe('Tariq Textiles');
			expect(customerStep?.mergeKey?.({ phone: '03211234567' }, {})).toBe('+923211234567');
			if (cus) {
				expect(customerStep?.sums?.(cus)).toEqual({ customers: 1 });
			}
			expect(customerStep?.map({ _id: oid(7) }, fakeCtx)).toBeNull();

			// Product sums
			const productStep = CHANDNI_TRADERS_MAPPING.steps.find((s) => s.collection === 'products');
			expect(productStep?.sums?.({ variants: [{ stock: 50.5 }, { stock: 25.0 }] })).toEqual({
				products: 1,
				variants: 2,
				'stock.meters': 75.5,
			});

			// Order sums
			const orderStep = CHANDNI_TRADERS_MAPPING.steps.find((s) => s.collection === 'orders');
			expect(orderStep?.sums?.({ status: 'processing', total: 1200000 })).toEqual({
				orders: 1,
				'orders.processing.count': 1,
				'orders.processing.total': 1200000,
			});

			// Settings with db
			/** @type {any} */
			const fakeDb = {
				collection: () => ({
					findOne: async () => ({ key: 'store', publicSiteUrl: 'https://custom-ct.com' }),
				}),
			};
			if (CHANDNI_TRADERS_MAPPING.settings) {
				const plan = await CHANDNI_TRADERS_MAPPING.settings(fakeDb);
				expect(plan.ecommerce?.settings?.['checkout.numberPrefix']).toBe('CT-');
				const planDefault = await CHANDNI_TRADERS_MAPPING.settings(/** @type {any} */ (null));
				expect(planDefault.ecommerce?.settings?.['checkout.numberPrefix']).toBe('CT-');
			}
		});

		it('maps fabric products with fractional measured sales parameters and roll stock', () => {
			const productStep = CHANDNI_TRADERS_MAPPING.steps.find((s) => s.collection === 'products');
			expect(productStep).toBeDefined();

			const mapped = productStep?.map(
				{
					_id: oid(30),
					name: 'Pure Raw Silk Fabric',
					slug: 'pure-raw-silk-fabric',
					categorySlug: 'silk',
					unit: 'm',
					cutStep: 0.5,
					minCut: 2.5,
					variants: [
						{
							sku: 'SILK-EMERALD-R1',
							name: 'Emerald Green Raw Silk',
							pricePerMeter: 3200,
							stockMeters: 45.5,
							color: 'emerald_green',
							fabricType: 'raw_silk',
							width: '44"',
						},
					],
				},
				fakeCtx,
			);

			expect(mapped).toMatchObject({
				id: 'prd_5b0000000000000000000030',
				title: 'Pure Raw Silk Fabric',
				measuredSales: {
					enabled: true,
					unit: 'm',
					step: 0.5,
					minQuantity: 2.5,
				},
				variants: [
					{
						sku: 'SILK-EMERALD-R1',
						price: 320000,
						stock: 45.5,
						attributes: {
							unit: 'm',
							color: 'emerald_green',
							fabricType: 'raw_silk',
							width: '44"',
						},
					},
				],
			});
		});

		it('maps order line items with fractional measured cut quantities', () => {
			const orderStep = CHANDNI_TRADERS_MAPPING.steps.find((s) => s.collection === 'orders');
			expect(orderStep).toBeDefined();

			const mapped = orderStep?.map(
				{
					_id: oid(40),
					orderNumber: 'CT-2026-0105',
					status: 'processing',
					customerPhone: '+923211234567',
					customerName: 'Boutique Collection',
					items: [
						{
							title: 'Emerald Green Raw Silk',
							sku: 'SILK-EMERALD-R1',
							quantityMeters: 7.5,
							pricePerMeter: 3200,
							rollNumber: 'ROLL-402',
						},
					],
				},
				fakeCtx,
			);

			expect(mapped).toMatchObject({
				number: 'CT-2026-0105',
				status: 'processing',
				lines: [
					{
						sku: 'SILK-EMERALD-R1',
						quantity: 7.5,
						unit: 'm',
						price: 320000,
						total: 2400000,
						rollNumber: 'ROLL-402',
					},
				],
			});
		});
	});
});
