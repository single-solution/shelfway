/**
 * Ibrahim Mobile Store settings and lists for each product it uses:
 * Mobile IMEI verification, condition grade warranties, variants, and payment methods.
 * @module
 */
import { ORDER_DIGITS, ORDER_PATTERN, ORDER_PREFIX } from './common.js';

/** @typedef {import('../../mapping.js').SettingsPlan} SettingsPlan */
/** @typedef {import('../../read.js').SourceDb} SourceDb */

export const STORE_DEFAULTS = Object.freeze({
	siteName: 'Ibrahim Mobile Store',
	publicSiteUrl: 'https://ibrahimmobilestore.com',
	supportPhone: '+923001234567',
	supportEmail: 'support@ibrahimmobilestore.com',
	whatsappNumber: '923001234567',
	returnPolicyHtml:
		'<h2>Warranty & Return Policy</h2><p>Used & Grade A mobile devices carry a <strong>90-day warranty</strong>. Official PTA status is guaranteed for lifetime.</p>',
	lowStockThreshold: 1,
});

export const FEATURES = Object.freeze({
	accounts: ['phone_password', 'email_password', 'roles'],
	ecommerce: ['catalog', 'variants', 'grades_serials', 'checkout', 'delivery_zones', 'coupons', 'staff_alerts'],
	notifications: ['email'],
	payments: ['bank_transfer'],
});

/**
 * Builds the SettingsPlan for Ibrahim Mobile Store.
 * @param {Record<string, any>} [values]
 * @returns {SettingsPlan}
 */
export const settingsPlan = (values = {}) => {
	return {
		accounts: {
			settings: {
				'phone.channel': 'sms',
				'phone.websitePerHour': 0,
				'profile.keepOneAddress': false,
				'phone_password.signUp': true,
				'phone_password.minLength': 8,
				'email_password.minLength': 8,
			},
		},
		ecommerce: {
			settings: {
				'catalog.productUrl': '/products/{slug}',
				'catalog.categoryUrl': '/categories/{slug}',
				'catalog.pageSize': 24,
				'catalog.lowStock': values.lowStockThreshold || STORE_DEFAULTS.lowStockThreshold,
				'catalog.showStock': 'always',
				'catalog.search': 'basic',
				// Mobile Condition Grades & IMEI serial fulfillment
				'grades_serials.requireSerialOnFulfillment': true,
				'grades_serials.validateImeiChecksum': true,
				'grades_serials.allowManualSerialEntry': true,
				'grades_serials.defaultReturnDays': 14,
				'grades_serials.defaultWarrantyDays': 90,
				'grades_serials.showConditionGlossary': true,
				// Variants Matrix
				'variants.trackStockPerVariant': true,
				'variants.allowOutOfStockPurchases': false,
				'variants.maxVariantsPerProduct': 100,
				'variants.hideUnavailableOptions': false,
				// Checkout
				'checkout.numberPattern': ORDER_PATTERN,
				'checkout.numberPrefix': ORDER_PREFIX,
				'checkout.numberDigits': ORDER_DIGITS,
				'checkout.paymentWindowMinutes': 60,
			},
		},
		notifications: {
			settings: {
				'email.senderName': STORE_DEFAULTS.siteName,
				'email.senderAddress': STORE_DEFAULTS.supportEmail,
			},
		},
		payments: {
			settings: {},
		},
	};
};

/**
 * Reads settings from source database or returns defaults.
 * @param {SourceDb | null} [db]
 * @returns {Promise<SettingsPlan>}
 */
export const readSettings = async (db) => {
	if (!db) return settingsPlan();
	try {
		const row = await /** @type {any} */ (db.collection('settings')).findOne({ key: 'store' });
		return settingsPlan(row || {});
	} catch {
		return settingsPlan();
	}
};
