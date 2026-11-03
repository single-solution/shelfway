import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('../src/theme.css', import.meta.url), 'utf8');

/** The text of the first `@media (prefers-reduced-motion: reduce)` blocks, joined. */
const reduced = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]).join('\n');

describe('motion tokens (layout contract item 12)', () => {
	it('defines the three durations and the one easing', () => {
		expect(css).toMatch(/--dur-fast:\s*120ms/);
		expect(css).toMatch(/--dur:\s*160ms/);
		expect(css).toMatch(/--dur-slow:\s*220ms/);
		expect(css).toMatch(/--ease:\s*cubic-bezier\(0\.22,\s*1,\s*0\.36,\s*1\)/);
	});

	it('points the older motion names at the new tokens, so every curve is the one easing', () => {
		expect(css).toMatch(/--shelfway-motion:\s*var\(--dur\)/);
		expect(css).toMatch(/--shelfway-motion-fast:\s*var\(--dur-fast\)/);
		expect(css).toMatch(/--shelfway-motion-slow:\s*var\(--dur-slow\)/);
		for (const name of ['--shelfway-ease', '--shelfway-ease-move', '--shelfway-ease-exit'])
			expect(css).toMatch(new RegExp(`${name}:\\s*var\\(--ease\\)`));
	});

	it('enters with a fade and a 4px rise, and opens menus from scale .98', () => {
		expect(css).toMatch(/@keyframes shelfway-enter \{\s*from \{\s*opacity: 0;\s*translate: 0 4px;/);
		expect(css).toMatch(/@keyframes shelfway-pop \{\s*from \{\s*opacity: 0;\s*scale: 0\.98;/);
	});

	it('moves nothing but opacity with prefers-reduced-motion', () => {
		for (const name of [
			'shelfway-enter',
			'shelfway-pop',
			'shelfway-sheet',
			'shelfway-drawer',
			'shelfway-side',
			'shelfway-toast',
			'shelfway-pop-out',
			'shelfway-side-out',
		])
			expect(reduced).toMatch(new RegExp(`@keyframes ${name} \\{[^}]*\\{[^}]*opacity: 0;\\s*\\}`));
		expect(reduced).not.toMatch(/translate:\s*[-\d]/);
		expect(reduced).not.toMatch(/scale:\s*0/);
		expect(reduced).toMatch(/shelfway-press/);
	});
});

describe('the Page fills the pane', () => {
	it('lets a wrapper around a page (the page transition) pass the pane height on', () => {
		expect(css).toMatch(/\[data-shelfway-transition\]:has\(\[data-shelfway-page\]\)/);
	});
});
