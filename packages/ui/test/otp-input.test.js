// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OtpInput } from '../src/index.js';
import { byLabel, cleanup, render, type } from '../src/testing.js';

describe('OtpInput', () => {
	afterEach(() => {
		cleanup();
	});

	it('renders segmented slots and associates the native input with label', () => {
		const { container } = render(<OtpInput label="Verification code" help="Enter the 6-digit code." />);
		const input = byLabel(container, 'Verification code');
		expect(input).toBeDefined();
		expect(input?.getAttribute('type')).toBe('text');
		expect(input?.getAttribute('inputmode')).toBe('numeric');
		expect(input?.getAttribute('autocomplete')).toBe('one-time-code');

		const slots = container.querySelectorAll('[data-slot]');
		expect(slots).toHaveLength(6);
		expect(container.textContent).toContain('Enter the 6-digit code.');
	});

	it('supports typing and calls onChange and onComplete', () => {
		const onChange = vi.fn();
		const onComplete = vi.fn();
		const { container } = render(<OtpInput label="Two-step code" onChange={onChange} onComplete={onComplete} />);
		const input = byLabel(container, 'Two-step code');
		if (!input) throw new Error('input missing');

		type(input, '481592');

		expect(onChange).toHaveBeenLastCalledWith('481592');
		expect(onComplete).toHaveBeenCalledWith('481592');

		const slots = container.querySelectorAll('[data-slot]');
		expect(slots[0]?.textContent).toBe('4');
		expect(slots[1]?.textContent).toBe('8');
		expect(slots[2]?.textContent).toBe('1');
		expect(slots[3]?.textContent).toBe('5');
		expect(slots[4]?.textContent).toBe('9');
		expect(slots[5]?.textContent).toBe('2');
	});

	it('handles multi-character paste and auto-fills all slots', () => {
		const onChange = vi.fn();
		const onComplete = vi.fn();
		const { container } = render(<OtpInput label="Two-step code" onChange={onChange} onComplete={onComplete} />);
		const input = byLabel(container, 'Two-step code');
		if (!input) throw new Error('input missing');

		type(input, '987 654');

		expect(onChange).toHaveBeenLastCalledWith('987654');
		expect(onComplete).toHaveBeenCalledWith('987654');

		const slots = container.querySelectorAll('[data-slot]');
		expect(slots[0]?.textContent).toBe('9');
		expect(slots[1]?.textContent).toBe('8');
		expect(slots[2]?.textContent).toBe('7');
		expect(slots[3]?.textContent).toBe('6');
		expect(slots[4]?.textContent).toBe('5');
		expect(slots[5]?.textContent).toBe('4');
	});

	it('supports clearing and backspace updates', () => {
		const onChange = vi.fn();
		const { container } = render(<OtpInput label="Two-step code" onChange={onChange} />);
		const input = byLabel(container, 'Two-step code');
		if (!input) throw new Error('input missing');

		type(input, '12');
		expect(onChange).toHaveBeenLastCalledWith('12');

		type(input, '1');
		expect(onChange).toHaveBeenLastCalledWith('1');

		const slots = container.querySelectorAll('[data-slot]');
		expect(slots[0]?.textContent).toBe('1');
		expect(slots[1]?.textContent).toBe('');
	});

	it('renders error state and accessible descriptions', () => {
		const { container } = render(<OtpInput label="Two-step code" error="Invalid verification code." />);
		const input = byLabel(container, 'Two-step code');
		expect(input).toBeDefined();
		if (input) {
			expect(input.getAttribute('aria-invalid')).toBe('true');
		}
		expect(container.textContent).toContain('Invalid verification code.');
	});
});
