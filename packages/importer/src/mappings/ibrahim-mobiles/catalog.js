/**
 * Ibrahim Mobile Store catalog mapping into Ecommerce:
 * Mobile phones, tablets, smart watches, accessories, device condition grades,
 * storage/RAM variants, and IMEI/serial fulfillment requirements.
 * @module
 */
import { created, derivedId, isObject, paisa, text } from './common.js';

/** @typedef {import('../../mapping.js').MappingStep} MappingStep */
/** @typedef {import('../../mapping.js').MapContext} MapContext */

export const TABLES = Object.freeze({
	categorySlugs: 'ims-category-slugs',
	brandSlugs: 'ims-brand-slugs',
	attributeSlugs: 'ims-attribute-slugs',
	productSlugs: 'ims-product-slugs',
});

/** Standard mobile condition grades. */
export const CONDITION_GRADES = Object.freeze([
	{ key: 'new', label: 'Brand New (Sealed)', warrantyDays: 365 },
	{ key: 'open_box', label: 'Open Box (10/10)', warrantyDays: 180 },
	{ key: 'grade_a', label: 'Used - Grade A (Flawless)', warrantyDays: 90 },
	{ key: 'grade_b', label: 'Used - Grade B (Minor Signs)', warrantyDays: 30 },
	{ key: 'refurbished', label: 'Refurbished Certified', warrantyDays: 90 },
]);

/** Standard PTA approval statuses. */
export const PTA_STATUSES = Object.freeze([
	{ key: 'pta_approved', label: 'Official PTA Approved' },
	{ key: 'non_pta', label: 'Non-PTA (Valid Sim Lock)' },
	{ key: 'jv', label: 'JV / Sim Locked' },
]);

/** @type {MappingStep} */
const catStep = {
	product: 'ecommerce',
	collection: 'categories',
	source: 'categories',
	prefix: 'cat',
	lookups: {
		[TABLES.categorySlugs]: (record) => String(record.slug),
	},
	map: (doc, ctx) => ({
		id: ctx.id('cat', doc._id),
		slug: text(doc.slug),
		name: text(doc.name),
		parentId: null,
		description: text(doc.description),
		active: doc.isActive !== false,
		...created(doc.createdAt),
	}),
};

/** @type {MappingStep} */
const brnStep = {
	product: 'ecommerce',
	collection: 'brands',
	source: 'brands',
	prefix: 'brn',
	lookups: {
		[TABLES.brandSlugs]: (record) => String(record.slug),
	},
	map: (doc, ctx) => ({
		id: ctx.id('brn', doc._id),
		slug: text(doc.slug),
		name: text(doc.name),
		description: text(doc.description),
		active: doc.isActive !== false,
		...created(doc.createdAt),
	}),
};

/** @type {MappingStep} */
const attStep = {
	product: 'ecommerce',
	collection: 'attributes',
	source: 'attributes',
	prefix: 'att',
	lookups: {
		[TABLES.attributeSlugs]: (record) => String(record.slug),
	},
	map: (doc, ctx) => ({
		id: ctx.id('att', doc._id),
		slug: text(doc.slug),
		name: text(doc.label),
		type: text(doc.type) || 'select',
		options: (Array.isArray(doc.options) ? doc.options : []).map((opt) => ({
			value: text(isObject(opt) ? opt.value : opt),
			label: text(isObject(opt) ? opt.label : opt),
		})),
		...created(doc.createdAt),
	}),
};

/** @type {ReadonlyArray<MappingStep>} */
export const taxonomySteps = Object.freeze([catStep, brnStep, attStep]);

/**
 * Maps IMS products into Ecommerce products with serialized IMEI requirements
 * and condition grade attributes.
 * @type {MappingStep}
 */
export const productStep = {
	product: 'ecommerce',
	collection: 'products',
	source: 'products',
	prefix: 'prd',
	lookups: {
		[TABLES.productSlugs]: (record) => String(record.slug),
	},
	sums: (record) => ({
		products: 1,
		variants: Array.isArray(record.variants) ? record.variants.length : 0,
		'stock.units': Array.isArray(record.variants)
			? record.variants.reduce((sum, v) => sum + (Number(/** @type {any} */ (v).stock) || 0), 0)
			: 0,
	}),
	map: (doc, ctx) => {
		const prdId = ctx.id('prd', doc._id);
		const variants = (Array.isArray(doc.variants) ? doc.variants : []).map((v, idx) => ({
			id: derivedId('var', `${prdId}:var:${idx}`),
			sku: text(v.sku),
			title: text(v.title),
			price: paisa(v.priceRupees),
			compareAtPrice: v.compareAtRupees ? paisa(v.compareAtRupees) : null,
			stock: Number(v.stock) || 0,
			barcode: text(v.barcode),
			attributes: {
				storage: text(v.storage),
				color: text(v.color),
				condition: text(v.condition),
				ptaStatus: text(v.ptaStatus),
			},
		}));

		return {
			id: prdId,
			slug: text(doc.slug),
			title: text(doc.name),
			summary: text(doc.summary),
			description: text(doc.description),
			categorySlug: text(doc.categorySlug),
			brandSlug: text(doc.brandSlug),
			status: doc.status === 'draft' ? 'draft' : 'active',
			serialized: doc.serialized !== false,
			warrantyDays: Number(doc.warrantyDays) || 90,
			condition: text(doc.condition) || 'grade_a',
			variants,
			...created(doc.createdAt),
		};
	},
};
