/**
 * Names the widgets, the docs and Chat's product cards share (PLAN 0.4.10): the browser global of `widget.js`
 * (`window.ShelfwayEcommerce`), the attribute of the elements the merchant places (`<div data-shelfway-ecommerce="cart"></div>`),
 * the add-to-cart event other widgets on the page (Chat's product cards) dispatch, and the
 * keys the shopper's browser keeps.
 * @module
 */

/** The browser global `widget.js` sets: `window.ShelfwayEcommerce.identify(signIn)`, `.addToCart(…)`, `.admin({ getTicket })`. */
export const WIDGET_GLOBAL = 'ShelfwayEcommerce';

/** Widgets mount only into elements with this attribute; its value is the widget key from manifest.json. */
export const WIDGET_ATTRIBUTE = 'data-shelfway-ecommerce';

/**
 * The window event that adds a product to the shopper's cart (PLAN 0.8.4: how Add to cart works from a Chat card).
 * Chat's product card dispatches it, cancelable, with `detail: { productId, variantId?, quantity? }`; Ecommerce's
 * widget adds the item to its cart, opens the cart and calls `preventDefault()`. When no Ecommerce widget handled it,
 * Chat opens the product page instead.
 */
export const ADD_TO_CART_EVENT = 'shelfway-ecommerce:add-to-cart';

/**
 * localStorage keys of the shopper's browser: the cart and compare list live in the browser (PLAN 0.8.4), and so do a
 * guest's order keys (E21).
 */
export const STORAGE_KEYS = Object.freeze({
	cart: 'shelfway-ecommerce-cart',
	compare: 'shelfway-ecommerce-compare',
	orderKeys: 'shelfway-ecommerce-order-keys',
});
