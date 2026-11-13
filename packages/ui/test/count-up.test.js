// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CountUp, figureOf } from '../src/CountUp.js';
import { cleanup, render } from '../src/testing.js';

afterEach(cleanup);

describe('CountUp figures parser', () => {
	it('extracts figures from numbers and formatted strings', () => {
		expect(figureOf(42)).toEqual({ before: '', number: 42, after: '', decimals: 0, grouped: false });
		expect(figureOf('$1,250.50/mo')).toEqual({
			before: '$',
			number: 1250.5,
			after: '/mo',
			decimals: 2,
			grouped: true,
		});
		expect(figureOf('invalid')).toBeNull();
		expect(figureOf(null)).toBeNull();
	});
});

describe('CountUp component', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders initial value directly', () => {
		const { container } = render(<CountUp value={100} />);
		expect(container.textContent).toBe('100');
	});

	it('counts up on value change and completes to final target', () => {
		let rafCallback = /** @type {FrameRequestCallback | null} */ (null);
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
			rafCallback = cb;
			return 1;
		});

		const { container, rerender } = render(<CountUp value="10" />);
		expect(container.textContent).toBe('10');

		rerender(<CountUp value="20" />);
		// Before RAF fires, start value is displayed
		expect(container.textContent).toBe('10');

		// Fire interim frame at 200ms
		if (rafCallback) {
			/** @type {FrameRequestCallback} */ (rafCallback)(performance.now() + 200);
		}
		expect(Number(container.textContent)).toBeGreaterThanOrEqual(10);
		expect(Number(container.textContent)).toBeLessThanOrEqual(20);

		// Fire completion frame at 500ms (COUNT_MS is 400)
		if (rafCallback) {
			/** @type {FrameRequestCallback} */ (rafCallback)(performance.now() + 500);
		}
		expect(container.textContent).toBe('20');
	});

	it('does not flash final value when parent re-renders mid-animation', () => {
		let rafCallback = /** @type {FrameRequestCallback | null} */ (null);
		vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
			rafCallback = cb;
			return 1;
		});

		const { container, rerender } = render(<CountUp value="10" />);
		rerender(<CountUp value="100" />);

		// Tick to interim value
		if (rafCallback) {
			/** @type {FrameRequestCallback} */ (rafCallback)(performance.now() + 200);
		}
		const midText = container.textContent;

		// Parent re-renders with same value
		rerender(<CountUp value="100" />);
		expect(container.textContent).toBe(midText);
	});
});
