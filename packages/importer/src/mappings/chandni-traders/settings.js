/**
 * Chandni Traders settings and lists for each product it uses:
 * Fabric fractional measured sales by meter/yard, wholesale role pricing, and checkout settings.
 * @module
 */
import { ORDER_DIGITS, ORDER_PATTERN, ORDER_PREFIX } from './common.js';

/** @typedef {import('../../mapping.js').SettingsPlan} SettingsPlan */
/** @typedef {import('../../read.js').SourceDb} SourceDb */

export const STORE_DEFAULTS = Object.freeze({
	siteName: 'Chandni Traders',
	publicSiteUrl: 'https://chandnitraders.com',
	supportPhone: '+923211234567',
	supportEmail: 'orders@chandnitraders.com',
	whatsappNumber: '923211234567',
	returnPolicyHtml:
		'<h2>Fabric Return Policy</h2><p>Cut fabric lengths cannot be returned unless defective or mismatched from sample.</p>',
	lowStockThreshold: 10,
});

export const FEATURES = Object.freeze({
	accounts: ['phone_password', 'email_password', 'roles'],
	ecommerce: ['catalog', 'variants', 'measured_sales', 'role_pricing', 'checkout', 'delivery_zones', 'coupons', 'staff_alerts'],
	notifications: ['email'],
	payments: ['bank_transfer'],
});

/**
 * Builds the SettingsPlan for Chandni Traders.
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
				'catalog.pageSize': 36,
				'catalog.lowStock': values.lowStockThreshold || STORE_DEFAULTS.lowStockThreshold,
				'catalog.showStock': 'always',
				'catalog.search': 'basic',
				// Measured Sales by Meter / Yard for fabrics
				'measured_sales.defaultUnit': 'm',
				'measured_sales.defaultDecimals': 2,
				'measured_sales.defaultStep': 0.5,
				'measured_sales.defaultMinQuantity': 1.0,
				'measured_sales.defaultMaxQuantity': 500.0,
				'measured_sales.showUnitPriceInCatalog': true,
				'measured_sales.enableFractionalStock': true,
				// Wholesale Role Pricing
				'role_pricing.enableRolePricing': true,
				'role_pricing.showTierTableOnStorefront': true,
				// Variants Matrix
				'variants.trackStockPerVariant': true,
				'variants.allowOutOfStockPurchases': false,
				'variants.maxVariantsPerProduct': 100,
				'variants.hideUnavailableOptions': false,
				// Checkout
				'checkout.numberPattern': ORDER_PATTERN,
				'checkout.numberPrefix': ORDER_PREFIX,
				'checkout.numberDigits': ORDER_DIGITS,
				'checkout.paymentWindowMinutes': 120,
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
