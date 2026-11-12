/**
 * The Chandni Traders mapping (`shelfway-import read --mapping chandni-traders`; PLAN D3-D4):
 * CT fabrics, measured sales by meter/yard, roll inventory, wholesale accounts, and settings.
 * @module
 */
import { defineMapping } from '../../mapping.js';
import { productStep, taxonomySteps } from './catalog.js';
import { customerStep, orderStep } from './orders.js';
import { roleSteps, staffStep } from './people.js';
import { readSettings } from './settings.js';

export { FABRIC_UNITS } from './catalog.js';
export { ORDER_DIGITS, ORDER_PATTERN, ORDER_PREFIX } from './common.js';
export { FEATURES, STORE_DEFAULTS, settingsPlan } from './settings.js';

/** The mapping of Chandni Traders database. */
export const CHANDNI_TRADERS_MAPPING = defineMapping({
	name: 'chandni-traders',
	description:
		'Chandni Traders (CT): fabrics and textiles, measured sales by meter/yard, roll inventory, wholesale customer accounts, and store settings.',
	steps: [...roleSteps, staffStep, customerStep, ...taxonomySteps, productStep, orderStep],
	settings: readSettings,
});
