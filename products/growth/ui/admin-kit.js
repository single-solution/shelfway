/**
 * What Growth's admin widgets share besides the kit's blocks (`@shelfway/app-kit/widget`: the More menu, dialogs and fact
 * grids): filter chips with counts, ranked lists with share bars, and the texts of refused calls. Text is always set
 * as text, never as HTML.
 * @module
 */
import { chipGroup, rankList } from '@shelfway/app-kit/widget';

export { chipGroup, rankList };

/** The widget texts of the problem codes any admin widget may get. */
export const PROBLEM_TEXTS = Object.freeze({
	forbidden: 'problem.forbidden',
	feature_off: 'problem.feature_off',
	database_not_connected: 'problem.database_not_connected',
	product_unavailable: 'problem.product_unavailable',
	rate_limited: 'problem.rate_limited',
});

/**
 * The widget text of a refused call (PLAN 0.4.10: never the server's English detail, OT-4): the text of the field a
 * `validation_failed` problem names (`validation_failed:<field>`), else of its code, else `fallback`.
 * @param {{ data?: any }} answer
 * @param {Readonly<Record<string, string>>} keys text keys by problem code and by `validation_failed:<field>`
 * @param {string} fallback
 * @returns {string} a text key
 */
export const problemKey = (answer, keys, fallback) => {
	const type = typeof answer.data?.type === 'string' ? answer.data.type : '';
	const code = type.slice(type.lastIndexOf('/') + 1);
	const field = `${code}:${String(answer.data?.errors?.[0]?.path ?? '').slice(1)}`;
	const found = [field, code].find((name) => name !== '' && Object.hasOwn(keys, name));
	return found === undefined ? fallback : /** @type {string} */ (keys[found]);
};
