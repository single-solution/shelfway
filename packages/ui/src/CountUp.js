'use client';
/**
 * The figure of a `Stat`: when its value changes from one number to another it counts from the old number to the new
 * one (about 400 ms, easing out) instead of jumping. It needs state and a frame loop, so it lives apart from
 * `display.js`, which stays usable from server components.
 * @module
 */
import { useLayoutEffect, useRef, useState } from 'react';

/** @typedef {import('react').ReactNode} ReactNode */
/** @typedef {{ before: string, after: string, number: number, grouped: boolean, decimals: number }} Figure */

/** How long a count takes (ms). */
export const COUNT_MS = 400;

/**
 * The number inside a plain number or a text such as `1,284`, `$82` or `12.5%`, with the text around it. Text with no
 * number, or with more than one (`3 of 12`, a date), is not a figure: it just swaps.
 * @param {unknown} value
 * @returns {Figure | null}
 */
export const figureOf = (value) => {
	const text = typeof value === 'number' ? String(value) : value;
	if (typeof text !== 'string') return null;
	const found = [...text.matchAll(/-?\d[\d,]*(?:\.\d+)?/g)];
	const [hit] = found;
	if (found.length !== 1 || !hit || hit.index === undefined) return null;
	const number = Number(hit[0].replaceAll(',', ''));
	if (!Number.isFinite(number)) return null;
	return {
		before: text.slice(0, hit.index),
		after: text.slice(hit.index + hit[0].length),
		number,
		grouped: hit[0].includes(','),
		decimals: (hit[0].split('.')[1] ?? '').length,
	};
};

/**
 * A number written like the target figure: its text around it, its thousands separators and its decimals.
 * @param {number} n
 * @param {Figure} to
 * @param {Figure} from
 */
const written = (n, to, from) => {
	const decimals = Math.max(to.decimals, from.decimals);
	const body =
		to.grouped || from.grouped
			? n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
			: n.toFixed(decimals);
	return to.before + body + to.after;
};

/** Whether the person asked for less motion. */
const reducedMotion = () =>
	typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The figure of a tile. The first draw shows the value as it is; a later change from one number to another (same text
 * around it) counts up or down to the new one; anything else, and reduced motion, just swaps. A new value fades in.
 * @param {{ value: ReactNode, className?: string }} props
 */
export function CountUp({ value, className }) {
	const ref = useRef(/** @type {HTMLDivElement | null} */ (null));
	const settled = useRef(value);
	const live = useRef(/** @type {number | null} */ (null));
	const [, setComplete] = useState(0);
	useLayoutEffect(() => {
		const before = settled.current;
		const running = live.current;
		settled.current = value;
		live.current = null;
		if (Object.is(before, value) || reducedMotion() || typeof requestAnimationFrame !== 'function') return undefined;
		const to = figureOf(value);
		const from = figureOf(before);
		if (!to || !from || to.before !== from.before || to.after !== from.after || to.number === from.number) return undefined;
		const start = running ?? from.number;
		let begun = /** @type {number | null} */ (null);
		let id = 0;
		const tick = (/** @type {number} */ now) => {
			begun ??= now;
			const t = Math.min(1, (now - begun) / COUNT_MS);
			if (t >= 1) {
				live.current = null;
				if (ref.current) ref.current.textContent = written(to.number, to, from);
				setComplete((c) => c + 1);
				return;
			}
			const n = start + (to.number - start) * (1 - (1 - t) ** 3);
			live.current = n;
			if (ref.current) ref.current.textContent = written(n, to, from);
			id = requestAnimationFrame(tick);
		};
		live.current = start;
		// the old number shows from the first paint, so the new one never flashes before the count starts
		if (ref.current) ref.current.textContent = written(start, to, from);
		id = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(id);
	}, [value]);
	return (
		<div ref={ref} {...(className ? { className } : {})}>
			{live.current !== null ? (ref.current?.textContent ?? value) : value}
		</div>
	);
}
