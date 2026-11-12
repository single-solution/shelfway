/**
 * Helpers for the Chandni Traders mapping (PLAN 0.8.10 Migration, CT):
 * Phone formats, order numbering, deterministic IDs, currency conversions, and fractional measurement helpers.
 * @module
 */
import { createHash } from 'node:crypto';
import { normalizePhone } from '@shelfway/contracts/phone';
import { hexOf, legacyId } from '../../mapping.js';

/** @typedef {import('../../mapping.js').MapContext} MapContext */

/** Pakistan phone format (+92). */
export const PHONE_FORMAT = Object.freeze({ defaultCallingCode: '+92', trunkPrefix: '0' });

/** CT order numbering: CT-<year>-<4 digits>. */
export const ORDER_PATTERN = '{prefix}{year}-{number}';
export const ORDER_PREFIX = 'CT-';
export const ORDER_DIGITS = 4;

/** CT currency (PKR in paisa). */
export const CURRENCY = 'PKR';

/** @param {unknown} value @returns {value is Record<string, any>} */
export const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Trimmed text ('' for anything else). @param {unknown} value */
export const text = (value) => (typeof value === 'string' ? value.trim() : '');

/** A time as ISO-8601, or null. @param {unknown} value */
export const iso = (value) => {
	const at =
		value instanceof Date ? value.getTime() : typeof value === 'string' && value !== '' ? Date.parse(value) : Number.NaN;
	return Number.isFinite(at) ? new Date(at).toISOString() : null;
};

/** The earlier of two ISO times. @param {unknown} a @param {unknown} b */
export const earliest = (a, b) => {
	const [x, y] = [iso(a), iso(b)];
	return x === null ? y : y === null || x <= y ? x : y;
};

/** Rupees to paisa. @param {unknown} rupees */
export const paisa = (rupees) => Math.round((Number(rupees) || 0) * 100);

/** The 24 hex digits of a source id, or '' when none. @param {unknown} id */
export const hexKey = (id) => {
	try {
		return hexOf(id);
	} catch {
		return '';
	}
};

/** An id of a source id, or null when none. @param {string} prefix @param {unknown} id */
export const idOrNull = (prefix, id) => (hexKey(id) === '' ? null : legacyId(prefix, id));

/** Phone normalized to E.164. @param {unknown} raw */
export const phoneOf = (raw) => normalizePhone(text(raw), PHONE_FORMAT);

/** Normalized phone or raw text. @param {unknown} raw */
export const phoneText = (raw) => phoneOf(raw) ?? text(raw);

/** `{ createdAt }` when time is valid. @param {unknown} value */
export const created = (value) => {
	const at = iso(value);
	return at === null ? {} : { createdAt: at };
};

/**
 * Deterministic derived ID for virtual CT records.
 * @param {string} prefix
 * @param {string} name
 */
export const derivedId = (prefix, name) =>
	legacyId(prefix, createHash('sha256').update(`chandni-traders:${name}`).digest('hex').slice(0, 24));
