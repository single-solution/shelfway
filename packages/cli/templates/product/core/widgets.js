/**
 * Names the widgets and the docs share (PLAN 0.4.10): the browser global of `widget.js` (`window.Shelfway<Product>`) and
 * the attribute of the elements the merchant places for widgets (`<div data-shelfway-<id>="note_form"></div>`).
 * @module
 */

/** The browser global `widget.js` sets: `window.{{global}}.admin({ getTicket })`. */
export const WIDGET_GLOBAL = '{{global}}';

/** Widgets mount only into elements with this attribute; its value is the widget key from manifest.json. */
export const WIDGET_ATTRIBUTE = 'data-shelfway-{{id}}';
