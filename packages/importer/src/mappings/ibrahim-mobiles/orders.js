/**
 * Ibrahim Mobile Store orders and customers mapping into Ecommerce:
 * Customer profiles, device checkout orders, and fulfillment line items with IMEI numbers.
 * @module
 */
import { created, isObject, paisa, phoneText, text } from './common.js';

/** @typedef {import('../../mapping.js').MappingStep} MappingStep */
/** @typedef {import('../../mapping.js').MapContext} MapContext */

/** @type {MappingStep} */
export const customerStep = {
	product: 'ecommerce',
	collection: 'customers',
	source: 'customers',
	prefix: 'cus',
	mergeKey: (doc) => phoneText(doc.phone),
	sums: () => ({ customers: 1 }),
	map: (doc, ctx) => {
		const phone = phoneText(doc.phone);
		if (!phone) return null;
		return {
			id: ctx.id('cus', doc._id),
			phone,
			email: text(doc.email).toLowerCase(),
			name: text(doc.name),
			addresses: (Array.isArray(doc.addresses) ? doc.addresses : []).filter(isObject).map((addr) => ({
				name: text(addr.name || doc.name),
				phone: phoneText(addr.phone || phone),
				line1: text(addr.street),
				city: text(addr.city),
				postalCode: text(addr.postalCode),
				country: 'PK',
			})),
			...created(doc.createdAt),
		};
	},
};

/** @type {MappingStep} */
export const orderStep = {
	product: 'ecommerce',
	collection: 'orders',
	source: 'orders',
	prefix: 'ord',
	sums: (record) => ({
		orders: 1,
		[`orders.${String(record.status)}.count`]: 1,
		[`orders.${String(record.status)}.total`]: Number(record.total) || 0,
	}),
	map: (doc, ctx) => {
		const lines = (Array.isArray(doc.items) ? doc.items : []).map((item, idx) => ({
			index: idx + 1,
			title: text(item.name),
			sku: text(item.sku),
			quantity: Math.max(1, Number(item.quantity) || 1),
			price: paisa(item.priceRupees),
			total: paisa(item.priceRupees * (Number(item.quantity) || 1)),
			serial: text(item.imei),
		}));

		return {
			id: ctx.id('ord', doc._id),
			number: text(doc.orderNumber),
			customerPhone: phoneText(doc.customerPhone),
			customerName: text(doc.customerName),
			status: text(doc.status) || 'pending_payment',
			subtotal: paisa(doc.totalRupees),
			deliveryFee: 0,
			discount: 0,
			total: paisa(doc.totalRupees),
			lines,
			shippingAddress: isObject(doc.shippingAddress)
				? {
						name: text(doc.shippingAddress.name),
						phone: phoneText(doc.shippingAddress.phone),
						line1: text(doc.shippingAddress.street),
						city: text(doc.shippingAddress.city),
						country: 'PK',
					}
				: null,
			...created(doc.createdAt),
		};
	},
};
