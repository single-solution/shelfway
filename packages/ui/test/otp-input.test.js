// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OtpInput } from '../src/index.js';
import { act, byLabel, cleanup, keydown, render, type } from '../src/testing.js';

describe('OtpInput', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders 6 segmented digit inputs by default and associates with label', () => {
		const { container } = render(<OtpInput label="Verification code" help="Enter the 6-digit code." />);
		const inputs = container.querySelectorAll('input:not([type="hidden"])');
		expect(inputs).toHaveLength(6);
		const first = inputs[0];
		expect(first).toBeDefined();
		if (first) {
			expect(byLabel(container, 'Verification code')).toBe(first);
		}
		expect(container.textContent).toContain('Enter the 6-digit code.');
	});

	it('supports single-digit input and calls onChange and onComplete', () => {
		const onChange = vi.fn();
		const onComplete = vi.fn();
		const { container } = render(<OtpInput label="Two-step code" onChange={onChange} onComplete={onComplete} />);
		const inputs = /** @type {NodeListOf<HTMLInputElement>} */ (container.querySelectorAll('input:not([type="hidden"])'));

		const [i0, i1, i2, i3, i4, i5] = Array.from(inputs);
		if (!i0 || !i1 || !i2 || !i3 || !i4 || !i5) throw new Error('inputs missing');

		type(i0, '4');
		expect(onChange).toHaveBeenLastCalledWith('4');

		type(i1, '8');
		expect(onChange).toHaveBeenLastCalledWith('48');

		type(i2, '1');
		type(i3, '5');
		type(i4, '9');
		type(i5, '2');

		expect(onChange).toHaveBeenLastCalledWith('481592');
		expect(onComplete).toHaveBeenCalledWith('481592');
	});

	it('handles multi-character paste and auto-fills all slots', () => {
		const onChange = vi.fn();
		const onComplete = vi.fn();
		const { container } = render(<OtpInput label="Two-step code" onChange={onChange} onComplete={onComplete} />);
		const inputs = /** @type {NodeListOf<HTMLInputElement>} */ (container.querySelectorAll('input:not([type="hidden"])'));

		const [i0, i1, i2, i3, i4, i5] = Array.from(inputs);
		if (!i0 || !i1 || !i2 || !i3 || !i4 || !i5) throw new Error('inputs missing');

		act(() => {
			const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
			Object.defineProperty(pasteEvent, 'clipboardData', {
				value: {
					getData: () => '987 654',
				},
			});
			i0.dispatchEvent(pasteEvent);
		});

		expect(onChange).toHaveBeenLastCalledWith('987654');
		expect(onComplete).toHaveBeenCalledWith('987654');
		expect(i0.value).toBe('9');
		expect(i1.value).toBe('8');
		expect(i2.value).toBe('7');
		expect(i3.value).toBe('6');
		expect(i4.value).toBe('5');
		expect(i5.value).toBe('4');
	});

	it('supports backspace navigation', () => {
		const onChange = vi.fn();
		const { container } = render(<OtpInput label="Two-step code" onChange={onChange} />);
		const inputs = /** @type {NodeListOf<HTMLInputElement>} */ (container.querySelectorAll('input:not([type="hidden"])'));

		const [i0, i1, i2] = Array.from(inputs);
		if (!i0 || !i1 || !i2) throw new Error('inputs missing');

		type(i0, '1');
		type(i1, '2');
		expect(onChange).toHaveBeenLastCalledWith('12');

		// Backspace on empty slot 2 moves back and clears slot 1
		keydown(i2, 'Backspace');
		expect(onChange).toHaveBeenLastCalledWith('1');
	});

	it('renders error state and accessible descriptions', () => {
		const { container } = render(<OtpInput label="Two-step code" error="Invalid verification code." />);
		const inputs = container.querySelectorAll('input:not([type="hidden"])');
		const first = inputs[0];
		expect(first).toBeDefined();
		if (first) {
			expect(first.getAttribute('aria-invalid')).toBe('true');
		}
		expect(container.textContent).toContain('Invalid verification code.');
	});
});
