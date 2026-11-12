/**
 * Chandni Traders catalog mapping into Ecommerce:
 * Fabrics, textiles, measured sales by meter/yard, fractional cut quantities,
 * roll inventory tracking, and wholesale volume pricing tiers.
 * @module
 */
import { created, derivedId, isObject, paisa, text } from './common.js';

/** @typedef {import('../../mapping.js').MappingStep} MappingStep */
/** @typedef {import('../../mapping.js').MapContext} MapContext */

export const TABLES = Object.freeze({
	categorySlugs: 'ct-category-slugs',
	brandSlugs: 'ct-brand-slugs',
	attributeSlugs: 'ct-attribute-slugs',
	productSlugs: 'ct-product-slugs',
});

/** Standard fabric measurement units. */
export const FABRIC_UNITS = Object.freeze([
	{ key: 'm', label: 'Meter (m)', step: 0.5, decimals: 2 },
	{ key: 'yd', label: 'Yard (yd)', step: 0.5, decimals: 2 },
	{ key: 'gaz', label: 'Gaz', step: 1.0, decimals: 1 },
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
 * Maps CT fabric products into Ecommerce products with measured sales parameters
 * (unit, decimals, step, min/max cut length) and wholesale pricing tiers.
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
		'stock.meters': Array.isArray(record.variants)
			? record.variants.reduce((sum, v) => sum + (Number(/** @type {any} */ (v).stock) || 0), 0)
			: 0,
	}),
	map: (doc, ctx) => {
		const prdId = ctx.id('prd', doc._id);
		const unit = text(doc.unit) || 'm';

		const variants = (Array.isArray(doc.variants) ? doc.variants : []).map((v, idx) => ({
			id: derivedId('var', `${prdId}:var:${idx}`),
			sku: text(v.sku),
			title: text(v.name),
			price: paisa(v.pricePerMeter),
			compareAtPrice: v.compareAtRupees ? paisa(v.compareAtRupees) : null,
			stock: Number(v.stockMeters) || 0,
			barcode: text(v.rollNumber),
			attributes: {
				unit,
				color: text(v.color),
				fabricType: text(v.fabricType),
				width: text(v.width),
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
			measuredSales: {
				enabled: true,
				unit,
				decimals: 2,
				step: Number(doc.cutStep) || 0.5,
				minQuantity: Number(doc.minCut) || 1.0,
				maxQuantity: Number(doc.maxCut) || 500.0,
				showUnitPrice: true,
			},
			variants,
			...created(doc.createdAt),
		};
	},
};
