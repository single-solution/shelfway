/**
 * Ibrahim Mobile Store staff and roles into Accounts:
 * Reseller and wholesale roles, shop staff accounts, and login credentials.
 * @module
 */
import { created, phoneText, text } from './common.js';

/** @typedef {import('../../mapping.js').MappingStep} MappingStep */

export const RESELLER_ROLE = 'reseller';
export const WHOLESALE_ROLE = 'wholesale';

/** @type {MappingStep} */
const singleRoleStep = {
	product: 'accounts',
	collection: 'roles',
	source: 'roles',
	prefix: 'rol',
	map: (doc, ctx) => ({
		id: ctx.id('rol', doc._id),
		key: text(doc.key || doc.name).toLowerCase(),
		name: text(doc.name || doc.label),
		description: text(doc.description),
		inherits: Array.isArray(doc.inherits) ? doc.inherits.map(text) : [],
		...created(doc.createdAt),
	}),
};

/** @type {ReadonlyArray<MappingStep>} */
export const roleSteps = Object.freeze([singleRoleStep]);

/** @type {MappingStep} */
export const staffStep = {
	product: 'accounts',
	collection: 'users',
	source: 'staff',
	prefix: 'usr',
	sums: () => ({ 'users.staff': 1 }),
	map: (doc, ctx) => ({
		id: ctx.id('usr', doc._id),
		email: text(doc.email).toLowerCase(),
		phone: phoneText(doc.phone),
		name: text(doc.name || doc.fullName),
		role: doc.isSuperAdmin ? 'owner' : text(doc.role) || 'support_staff',
		status: doc.isActive === false ? 'blocked' : 'active',
		...created(doc.createdAt),
	}),
};
