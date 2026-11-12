/**
 * The Ibrahim Mobile Store mapping (`shelfway-import read --mapping ibrahim-mobiles`; PLAN D3-D4):
 * IMS devices, condition grades, IMEI serial fulfillment, accessories, customer accounts, and settings.
 * @module
 */
import { defineMapping } from '../../mapping.js';
import { productStep, taxonomySteps } from './catalog.js';
import { customerStep, orderStep } from './orders.js';
import { roleSteps, staffStep } from './people.js';
import { readSettings } from './settings.js';

export { CONDITION_GRADES, PTA_STATUSES } from './catalog.js';
export { ORDER_DIGITS, ORDER_PATTERN, ORDER_PREFIX, validateImei } from './common.js';
export { FEATURES, STORE_DEFAULTS, settingsPlan } from './settings.js';

/** The mapping of Ibrahim Mobile Store's database. */
export const IBRAHIM_MOBILES_MAPPING = defineMapping({
	name: 'ibrahim-mobiles',
	description:
		'Ibrahim Mobile Store (IMS): mobile phones, tablets, condition grades, IMEI fulfillment, staff into Accounts, catalog and orders into Ecommerce, and store settings.',
	steps: [...roleSteps, staffStep, customerStep, ...taxonomySteps, productStep, orderStep],
	settings: readSettings,
});
