/**
 * The widgets' CSS, injected into their shadow roots only. Colors, font and corner radius come from the website's
 * theme (`--shelfway-color-<name>`, `--shelfway-font-family`, `--shelfway-radius`), with fallbacks for light and dark.
 * @module
 */
export const WIDGET_CSS = `
:host { display: block; font-family: var(--shelfway-font-family, inherit); color: var(--shelfway-color-text, #1f2937); }
:host([data-shelfway-mode='dark']) { color: var(--shelfway-color-text, #f3f4f6); }
.box { border: 1px solid var(--shelfway-color-border, #d1d5db); border-radius: var(--shelfway-radius, 0.35rem); padding: 16px;
  background: var(--shelfway-color-background, #ffffff); }
:host([data-shelfway-mode='dark']) .box { background: var(--shelfway-color-background, #111827); border-color: var(--shelfway-color-border, #374151); }
h2 { font-size: 1.1em; margin: 0 0 8px; }
label { display: block; font-size: 0.9em; margin: 8px 0 4px; }
textarea, input { width: 100%; box-sizing: border-box; font: inherit; color: inherit; background: transparent; padding: 8px;
  border: 1px solid var(--shelfway-color-border, #d1d5db); border-radius: var(--shelfway-radius, 0.35rem); }
button { margin-top: 12px; font: inherit; padding: 8px 16px; border: 0; border-radius: var(--shelfway-radius, 0.35rem);
  background: var(--shelfway-color-accent, #0f766e); color: var(--shelfway-color-onAccent, #ffffff); cursor: pointer; }
button[disabled] { opacity: 0.6; cursor: default; }
.status { margin: 8px 0 0; font-size: 0.9em; }
ul { list-style: none; margin: 0; padding: 0; }
li { padding: 8px 0; border-top: 1px solid var(--shelfway-color-border, #e5e7eb); white-space: pre-wrap; overflow-wrap: anywhere; }
.meta { display: block; font-size: 0.8em; opacity: 0.7; }
`;
