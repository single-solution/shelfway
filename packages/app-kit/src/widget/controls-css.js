/**
 * The look of every widget control (PLAN 0.6), one copy for every product: the tokens, buttons, text fields, selects,
 * checkboxes, radios and switches, and the blocks that group them. A product puts it first in its own widget CSS,
 * then `ADMIN_KIT_CSS` if it is an admin widget, and adds only what is its own.
 *
 * The controls are the browser's own inputs with the native look reset (`appearance: none`), so the keyboard, the
 * form value and the screen reader keep working; the shapes are drawn here. Everything takes the website's theme
 * (`--shelfway-color-accent`, `-onAccent`, `-text`, `-background`, `-border`, `-danger`, `--shelfway-radius`): no brand color is
 * written here, only fallbacks. Cards and fields use the theme's radius (cards one and a half times it), a hairline line
 * and the level-1 shadow (none in dark, where the hairline carries the edge); light and dark come from `data-shelfway-mode` on
 * the host. A field's setting row puts the label in a left column (about 280 px) and the field beside it (at most
 * 560 px), stacking when the widget is narrow; no control stretches across the whole widget. Nothing stays at the
 * browser's defaults: scrollbars (thin, shown on hover), selection, autofill, number fields, date and file inputs,
 * selects and `details` / `summary` take the theme too. Spacing uses logical properties, so the blocks follow
 * a right to left page. Motion is short and stops with `prefers-reduced-motion`.
 *
 * The fallbacks follow the consoles' tokens (Unite, `@shelfway/ui` theme.css): teal for the accent and focus, and the
 * meaning colors as AA text shades — green success, amber warning, rose danger, bright teal info (`--shelfway-kit-info`),
 * amber needs-attention (`--shelfway-kit-attn`) and pink new (`--shelfway-kit-new`) — with ink hairlines and shadows, and the
 * lighter shades on an ink card in dark mode.
 *
 * The classes the builders in controls.js set: `check` (checkbox or radio with its text), `switch`, `setting`
 * (`wide` when its control is a field), `choice-grid` with `choice` (cards), `segmented`, `field` with `hint` (`error`), `fields` (a grid of fields),
 * `affix` (field with `pre` / `suf`), `block` with `block-head`, `help`, and the existing `box`.
 * @module
 */
export const CONTROLS_CSS = `
[hidden] { display: none !important; }
:host { --shelfway-kit-focus: var(--shelfway-color-accent, #0f766e); --shelfway-kit-ok: var(--shelfway-color-success, #047857);
  --shelfway-kit-warn: var(--shelfway-color-warning, #92400e); --shelfway-kit-bad: var(--shelfway-color-danger, #be123c);
  --shelfway-kit-info: var(--shelfway-color-info, #0f766e); --shelfway-kit-attn: var(--shelfway-color-attention, #b45309); --shelfway-kit-new: var(--shelfway-color-new, #be185d);
  --shelfway-kit-line: var(--shelfway-color-border, color-mix(in srgb, currentColor 20%, transparent));
  --shelfway-kit-hair: color-mix(in srgb, currentColor 10%, transparent); --shelfway-kit-soft: color-mix(in srgb, currentColor 7%, transparent);
  --shelfway-kit-r: var(--shelfway-radius, 0.35rem); --shelfway-kit-rc: var(--shelfway-radius, 0.35rem); --shelfway-kit-card: var(--shelfway-color-background, #ffffff);
  --shelfway-kit-shadow: 0 1px 2px rgb(11 18 32 / 0.04); --shelfway-kit-pop: 0 12px 32px -12px rgb(11 18 32 / 0.2);
  --shelfway-kit-thumb: color-mix(in srgb, currentColor 22%, transparent); }
:host([data-shelfway-mode='dark']) { --shelfway-kit-focus: var(--shelfway-color-accent, #2dd4bf); --shelfway-kit-ok: var(--shelfway-color-success, #4ade80);
  --shelfway-kit-warn: var(--shelfway-color-warning, #fbbf24); --shelfway-kit-bad: var(--shelfway-color-danger, #fb7185);
  --shelfway-kit-info: var(--shelfway-color-info, #2dd4bf); --shelfway-kit-attn: var(--shelfway-color-attention, #fbbf24); --shelfway-kit-new: var(--shelfway-color-new, #f472b6);
  --shelfway-kit-card: var(--shelfway-color-background, #141c2c); --shelfway-kit-shadow: 0 0 #0000; --shelfway-kit-pop: 0 0 0 1px var(--shelfway-kit-hair); }
* { scrollbar-width: thin; scrollbar-color: transparent transparent; }
*:hover, *:focus-within { scrollbar-color: var(--shelfway-kit-thumb) transparent; }
::selection { background: color-mix(in srgb, var(--shelfway-kit-focus) 22%, transparent); }
:host { accent-color: var(--shelfway-kit-focus); }
.box { border: 1px solid var(--shelfway-kit-hair); border-radius: var(--shelfway-kit-rc); padding: 20px; background: var(--shelfway-kit-card); box-shadow: var(--shelfway-kit-shadow); }
.box.admin { padding: 8px; border: 0; background: transparent; box-shadow: none; }
.box.admin > :is(.block, form, .split, .picker) { margin-top: 16px; }
label { display: block; margin: 12px 0 6px; font-size: 0.875em; font-weight: 500; }
:where(textarea, select, input:not([type='checkbox'], [type='radio'], [type='range'], [type='file'], [type='color'], [type='hidden'])) {
  width: 100%; box-sizing: border-box; min-height: 38px; padding: 8px 12px; font: inherit; color: inherit; background-color: transparent;
  border: 1px solid var(--shelfway-kit-line); border-radius: var(--shelfway-kit-r); transition: border-color 120ms, box-shadow 120ms; }
textarea { min-height: 84px; line-height: 1.45; resize: vertical; max-width: 40rem; }
input:-webkit-autofill, textarea:-webkit-autofill, select:-webkit-autofill { -webkit-text-fill-color: currentColor;
  transition: background-color 600000s 0s, color 600000s 0s; }
input[type='number'] { -moz-appearance: textfield; appearance: textfield; }
input[type='number']::-webkit-inner-spin-button, input[type='number']::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.55; } ::-webkit-calendar-picker-indicator:hover { opacity: 0.9; }
input[type='file'] { font: inherit; font-size: 0.875em; max-width: 100%; }
::file-selector-button { margin-inline-end: 12px; padding: 6px 12px; font: inherit; font-weight: 500; color: inherit; cursor: pointer;
  border: 1px solid var(--shelfway-kit-line); border-radius: var(--shelfway-kit-r); background: var(--shelfway-kit-card); }
::file-selector-button:hover { background: var(--shelfway-kit-soft); }
summary { cursor: pointer; list-style: none; } summary::-webkit-details-marker { display: none; }
details > summary::before { content: ''; display: inline-block; width: 6px; height: 6px; margin-inline-end: 8px; margin-bottom: 2px;
  border-inline-end: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: rotate(-45deg); opacity: 0.6; transition: transform 120ms; }
details[open] > summary::before { transform: rotate(45deg); }
option { background: var(--shelfway-kit-card); color: inherit; }
select { appearance: none; padding-inline-end: 34px; cursor: pointer; background-repeat: no-repeat; background-size: 5px 5px;
  background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position: calc(100% - 18px) 50%, calc(100% - 13px) 50%; }
select:dir(rtl) { background-position: 18px 50%, 13px 50%; }
select[multiple] { background-image: none; padding-inline-end: 12px; }
:is(input, textarea, select):hover:not(:disabled) { border-color: color-mix(in srgb, currentColor 38%, transparent); }
:is(textarea, select, input:not([type='checkbox'], [type='radio'], [type='range'], [type='file'], [type='color'], [type='hidden'])):focus { outline: 2px solid transparent;
  border-color: var(--shelfway-kit-focus); box-shadow: 0 0 0 3px color-mix(in srgb, var(--shelfway-kit-focus) 24%, transparent); }
:is(input, textarea, select)[aria-invalid='true'] { border-color: var(--shelfway-kit-bad); }
:is(input, textarea, select)[aria-invalid='true']:focus { box-shadow: 0 0 0 3px color-mix(in srgb, var(--shelfway-kit-bad) 24%, transparent); }
:is(input, textarea, select):disabled { opacity: 0.55; cursor: not-allowed; background-color: var(--shelfway-kit-soft); }
::placeholder { color: inherit; opacity: 0.42; }
button:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, summary:focus-visible,
:where([tabindex]:not([tabindex='-1'])):focus-visible { outline: 2px solid var(--shelfway-kit-focus); outline-offset: 2px; }
.field { display: grid; align-content: start; gap: 6px; min-width: 0; margin: 12px 0 0; }
.field > label, .field > .cap { margin: 0; font-size: 0.875em; font-weight: 500; }
.fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); gap: 0 16px; }
.fields > .field { margin-top: 12px; }
.field > .hint, .help { display: block; margin: 0; font-size: 0.85em; font-weight: 400; opacity: 0.7; }
.field > .hint.error { color: var(--shelfway-kit-bad); opacity: 1; }
.affix { display: flex; align-items: stretch; border: 1px solid var(--shelfway-kit-line); border-radius: var(--shelfway-kit-r); overflow: hidden;
  transition: border-color 120ms, box-shadow 120ms; }
.affix:focus-within { border-color: var(--shelfway-kit-focus); box-shadow: 0 0 0 3px color-mix(in srgb, var(--shelfway-kit-focus) 24%, transparent); }
.affix:has([aria-invalid='true']) { border-color: var(--shelfway-kit-bad); }
.affix > input, .affix > select { flex: 1 1 auto; min-width: 0; border: 0; border-radius: 0; box-shadow: none; }
.affix > input:focus, .affix > select:focus { border: 0; box-shadow: none; }
.affix > .pre, .affix > .suf { display: flex; align-items: center; padding: 0 12px; font-size: 0.9em; white-space: nowrap; background: var(--shelfway-kit-soft); }
.affix > .pre { border-inline-end: 1px solid var(--shelfway-kit-hair); } .affix > .suf { border-inline-start: 1px solid var(--shelfway-kit-hair); }
input:is([type='checkbox'], [type='radio']) { appearance: none; flex: none; display: inline-grid; place-content: center; box-sizing: border-box;
  width: 18px; height: 18px; min-width: 0; min-height: 0; margin: 0; padding: 0; cursor: pointer; background-color: transparent;
  border: 1.5px solid color-mix(in srgb, currentColor 40%, transparent); border-radius: 5px; transition: background-color 120ms, border-color 120ms; }
input[type='radio'] { border-radius: 50%; }
input:is([type='checkbox'], [type='radio'])::before { content: ''; width: 10px; height: 10px; background: var(--shelfway-color-onAccent, #ffffff);
  transform: scale(0); transition: transform 120ms; clip-path: polygon(14% 44%, 0 59%, 40% 100%, 100% 20%, 86% 5%, 40% 70%); }
input[type='radio']::before { width: 6px; height: 6px; border-radius: 50%; clip-path: none; }
input:is([type='checkbox'], [type='radio']):is(:checked, :indeterminate) { background-color: var(--shelfway-kit-focus); border-color: var(--shelfway-kit-focus); }
input:is([type='checkbox'], [type='radio']):is(:checked, :indeterminate)::before { transform: scale(1); }
input[type='checkbox']:indeterminate::before { clip-path: inset(38% 6%); }
input[role='switch'] { display: inline-flex; align-items: center; place-content: normal; width: 40px; height: 24px; border: 0; border-radius: 999px;
  background-color: color-mix(in srgb, currentColor 30%, transparent); }
input[role='switch']::before, input[role='switch']:checked::before { width: 18px; height: 18px; margin-inline-start: 3px; border-radius: 50%; clip-path: none;
  background: #ffffff; transform: none; box-shadow: 0 1px 3px rgb(0 0 0 / 0.3); transition: margin-inline-start 160ms; }
input[role='switch']:checked::before { margin-inline-start: 19px; }
input:is([type='checkbox'], [type='radio']):disabled { opacity: 0.5; cursor: not-allowed; }
.check, .switch { display: flex; align-items: flex-start; gap: 10px; margin: 8px 0; font-size: 1em; font-weight: 400; cursor: pointer; }
.check > input, .choice > input { margin-top: 2px; } .switch > input { margin-top: 0; }
.opt > .help { margin-inline-start: 28px; }
.setting { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 16px; padding: 16px 0; border-top: 1px solid var(--shelfway-kit-hair); }
.setting:first-child { border-top: 0; padding-top: 4px; }
.setting > .text { display: grid; flex: 1 1 14rem; gap: 2px; min-width: 0; }
.setting > .text > label { margin: 0; font-size: 1em; cursor: pointer; }
.setting > .ctl { flex: 0 1 auto; min-width: 0; }
.setting.wide { align-items: flex-start; justify-content: flex-start; column-gap: 40px; }
.setting.wide > .text { flex: 0 1 17.5rem; padding-top: 8px; } .setting.wide > .ctl { flex: 1 1 16rem; max-width: 35rem; }
@container (max-width: 30rem) { .setting.wide > .ctl { max-width: none; } }
.choice-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 200px), 1fr)); gap: 10px; margin: 8px 0; }
.choice { display: flex; align-items: flex-start; gap: 12px; margin: 0; padding: 12px 14px; font-size: 1em; font-weight: 400; cursor: pointer;
  border: 1px solid var(--shelfway-kit-line); border-radius: var(--shelfway-kit-r); transition: border-color 120ms, background-color 120ms; }
.choice:hover { border-color: color-mix(in srgb, currentColor 40%, transparent); }
.choice:has(:checked) { border-color: var(--shelfway-kit-focus); background: color-mix(in srgb, var(--shelfway-kit-focus) 8%, transparent); }
.choice:has(:focus-visible) { outline: 2px solid var(--shelfway-kit-focus); outline-offset: 2px; }
.choice > span { display: grid; gap: 2px; min-width: 0; } .choice b { font-weight: 600; }
.segmented { display: inline-flex; max-width: 100%; gap: 2px; padding: 3px; overflow-x: auto; border-radius: calc(var(--shelfway-kit-r) + 3px); background: var(--shelfway-kit-soft); }
.segmented label { position: relative; display: flex; align-items: center; box-sizing: border-box; min-height: 32px; margin: 0; padding: 6px 14px;
  font-size: 0.9em; font-weight: 500; white-space: nowrap; cursor: pointer; border-radius: var(--shelfway-kit-r); transition: background-color 120ms; }
.segmented label:has(:checked) { background: var(--shelfway-kit-card); font-weight: 600; box-shadow: 0 1px 3px rgb(10 28 64 / 0.14); }
.segmented label:has(:focus-visible) { outline: 2px solid var(--shelfway-kit-focus); outline-offset: 1px; }
.segmented input { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0; }
fieldset, .block { box-sizing: border-box; min-width: 0; margin: 0; padding: 18px 20px 20px; border: 1px solid var(--shelfway-kit-hair);
  border-radius: var(--shelfway-kit-rc); background: var(--shelfway-kit-card); box-shadow: var(--shelfway-kit-shadow); }
fieldset + fieldset, .block + .block, :is(fieldset, .block) + :is(fieldset, .block) { margin-top: 16px; }
:is(fieldset, .block, .pane, .box:not(.admin)) :is(fieldset, .block, .box) { background: transparent; box-shadow: none; border-color: var(--shelfway-kit-hair); }
legend { float: left; width: 100%; margin: 0 0 12px; padding: 0; font-size: 0.9375em; font-weight: 600; } legend + * { clear: both; }
.block-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 8px 16px; margin-bottom: 12px; }
.block-head > div:first-child { flex: 1 1 14rem; min-width: 0; }
.block-head h3 { margin: 0; font-size: 0.9375em; font-weight: 600; } .block-head p { margin: 2px 0 0; font-size: 0.8125em; opacity: 0.7; }
.block-head .actions { margin: 0; align-items: center; }
button { font: inherit; font-weight: 500; line-height: 1.25; min-height: 36px; padding: 8px 14px; border: 0; border-radius: var(--shelfway-kit-r); cursor: pointer;
  background: var(--shelfway-color-accent, #0f766e); color: var(--shelfway-color-onAccent, #ffffff);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 0.14), 0 1px 2px rgb(10 28 64 / 0.12); transition: filter 120ms, background-color 120ms, transform 80ms; }
button:not(.secondary, .link, .chip):hover:not(:disabled) { filter: brightness(1.1); }
button:active:not(:disabled) { transform: translateY(1px); }
button.secondary { background: var(--shelfway-kit-card); color: inherit; box-shadow: inset 0 0 0 1px var(--shelfway-kit-line), var(--shelfway-kit-shadow); }
button.secondary:hover:not(:disabled) { background: var(--shelfway-kit-soft); }
button.link { background: transparent; box-shadow: none; }
button:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
@media (forced-colors: active) { input:is([type='checkbox'], [type='radio'], [role='switch']):checked { background-color: Highlight; border-color: Highlight; } }
@media (prefers-reduced-motion: reduce) { * , *::before { transition: none !important; } }
`;
