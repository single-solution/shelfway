/**
 * Chandni Traders orders and customers mapping into Ecommerce:
 * Wholesale & retail customer accounts, fabric cut orders with fractional quantities.
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
			businessName: text(doc.businessName),
			taxNumber: text(doc.taxNumber),
			addresses: (Array.isArray(doc.addresses) ? doc.addresses : []).filter(isObject).map((addr) => ({
				name: text(addr.name || doc.name),
				phone: phoneText(addr.phone || phone),
				line1: text(addr.street),
				city: text(addr.city),
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
		const lines = (Array.isArray(doc.items) ? doc.items : []).map((item, idx) => {
			const quantity = Number(item.quantityMeters) || 1;
			const unitPrice = paisa(item.pricePerMeter);
			return {
				index: idx + 1,
				title: text(item.title),
				sku: text(item.sku),
				quantity,
				unit: text(item.unit) || 'm',
				price: unitPrice,
				total: Math.round(unitPrice * quantity),
				rollNumber: text(item.rollNumber),
			};
		});

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
