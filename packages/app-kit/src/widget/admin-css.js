/**
 * The CSS of the admin widget building blocks (admin.js), shared by every product so a status badge, a More menu, a dialog or an empty state looks and
 * behaves the same in Accounts, Ecommerce, Growth and Payments. A product puts it right after `CONTROLS_CSS` (which has
 * the tokens it uses) in its own widget CSS and adds only what is its own. Colors come from the website's theme
 * (`--shelfway-color-<name>`) with a fallback for light and dark (Unite tokens in `@shelfway/ui` theme.css); each color keeps its
 * meaning: green success, yellow-amber warning, red danger, teal info, orange needs attention, pink new. A `wide` dialog
 * (an edit form) opens as a right drawer that keeps the page in view, like the consoles; a plain dialog (a short
 * confirmation) stays centered.
 * Spacing uses logical properties (`inline-start`, `inline-end`, `text-align: start`), so the blocks follow the page's
 * direction when it is right to left. A product that uses `split` makes its widget a size container
 * (`container-type: inline-size`): the list sits beside the detail from 720 px of the widget's own width.
 * @module
 */
export const ADMIN_KIT_CSS = `
button.icon { min-width: 32px; min-height: 32px; padding: 6px 10px; line-height: 1; }
button.danger { background: var(--shelfway-kit-bad); color: var(--shelfway-color-onDanger, #ffffff); }
.status.error { color: var(--shelfway-kit-bad); }
.state { display: grid; justify-items: start; gap: 8px; padding: 12px 0; }
.state p { margin: 0; }
.state.error p { color: var(--shelfway-kit-bad); }
.state button { margin-top: 0; }
.state.loading { display: flex; align-items: center; gap: 8px; margin: 0; opacity: 0.8; }
.state.loading::before { content: ''; flex: none; width: 14px; height: 14px; box-sizing: border-box; border-radius: 50%;
  border: 2px solid currentColor; border-inline-end-color: transparent; animation: shelfway-spin 800ms linear infinite; }
.dot { width: 8px; height: 8px; flex: none; border-radius: 50%; background: var(--shelfway-color-muted, #8790a3); }
.dot.success { background: var(--shelfway-kit-ok); } .dot.warning { background: var(--shelfway-kit-warn); } .dot.danger { background: var(--shelfway-kit-bad); }
.dot.info { background: var(--shelfway-kit-info); } .dot.attention { background: var(--shelfway-kit-attn); } .dot.new { background: var(--shelfway-kit-new); }
.badge { display: inline-flex; align-items: center; gap: 6px; flex: none; padding: 2px 8px; border-radius: 999px; font-size: 0.75em;
  font-weight: 500; line-height: 1.5; white-space: nowrap; background: var(--shelfway-kit-soft); }
.badge:is(.success, .warning, .danger, .info, .attention, .new)::before { content: ''; width: 6px; height: 6px; flex: none; border-radius: 50%; background: currentColor; }
.badge.success { color: var(--shelfway-kit-ok); background: color-mix(in srgb, var(--shelfway-kit-ok) 14%, transparent); }
.badge.warning { color: var(--shelfway-kit-warn); background: color-mix(in srgb, var(--shelfway-kit-warn) 14%, transparent); }
.badge.danger { color: var(--shelfway-kit-bad); background: color-mix(in srgb, var(--shelfway-kit-bad) 14%, transparent); }
.badge.info { color: var(--shelfway-kit-info); background: color-mix(in srgb, var(--shelfway-kit-info) 14%, transparent); }
.badge.attention { color: var(--shelfway-kit-attn); background: color-mix(in srgb, var(--shelfway-kit-attn) 14%, transparent); }
.badge.new { color: var(--shelfway-kit-new); background: color-mix(in srgb, var(--shelfway-kit-new) 14%, transparent); }
.facts { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 170px), 1fr)); gap: 12px 16px; margin: 12px 0; }
.facts > div { min-width: 0; } .facts dt { font-size: 0.8em; opacity: 0.7; } .facts dd { margin: 2px 0 0; overflow-wrap: anywhere; }
.split { display: grid; gap: 16px; margin-top: 12px; }
.split > .pane { box-sizing: border-box; padding: 16px 18px; border: 1px solid var(--shelfway-kit-hair); border-radius: var(--shelfway-kit-rc);
  background: var(--shelfway-kit-card); box-shadow: var(--shelfway-kit-shadow); }
.split[data-view='list'] .detail-pane, .split[data-view='detail'] .list-pane { display: none; }
.pane { min-width: 0; }
.back { margin: 0 0 8px; }
@container (min-width: 720px) {
  .split { grid-template-columns: minmax(240px, 2fr) 3fr; align-items: start; }
  .split[data-view] .list-pane, .split[data-view] .detail-pane { display: block; }
  .back { display: none; }
}
.more { position: relative; display: inline-block; }
.menu { position: absolute; inset-inline-end: 0; top: calc(100% + 4px); z-index: 5; min-width: 200px; max-width: calc(100vw - 32px);
  padding: 4px; border: 1px solid var(--shelfway-kit-hair); border-radius: var(--shelfway-kit-rc); background: var(--shelfway-kit-card);
  box-shadow: var(--shelfway-kit-pop); animation: shelfway-pop 120ms ease-out; }
.menu button { display: block; width: 100%; min-height: 32px; margin: 0; padding: 6px 10px; font-weight: 500; text-align: start;
  background: transparent; color: inherit; box-shadow: none; border-radius: calc(var(--shelfway-kit-r) - 2px); }
.menu button:hover, .menu button:focus-visible { background: var(--shelfway-kit-soft); }
.menu button.danger { color: var(--shelfway-kit-bad); }
.overlay { position: fixed; inset: 0; z-index: 2147483000; display: grid; place-items: center; padding: 16px;
  background: rgb(10 28 64 / 0.32); backdrop-filter: blur(2px); animation: shelfway-fade 150ms ease-out; }
.overlay:has(> .dialog.wide) { place-items: stretch end; padding: 12px; }
.dialog { width: min(560px, 100%); max-height: calc(100vh - 32px); overflow: auto; box-sizing: border-box; padding: 22px 24px;
  border: 1px solid var(--shelfway-kit-hair); border-radius: var(--shelfway-kit-rc); background: var(--shelfway-kit-card);
  box-shadow: var(--shelfway-kit-pop); animation: shelfway-pop 150ms ease-out; container-type: inline-size; }
.dialog.wide { width: min(672px, 100%); max-height: none; padding: 24px; animation: shelfway-side 200ms ease-out; }
.dialog h3 { margin: 0 0 12px; font-size: 1.25em; font-weight: 600; letter-spacing: -0.01em; }
.dialog .actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; margin-top: 16px; }
.dialog .actions button { margin-top: 0; }
@media (max-width: 639px) { .overlay, .overlay:has(> .dialog.wide) { padding: 0; } .dialog, .dialog.wide { width: 100%; height: 100%; max-height: none; border-radius: 0; } }
@keyframes shelfway-pop { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: none; } }
@keyframes shelfway-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes shelfway-side { from { opacity: 0; transform: translateX(32px); } to { opacity: 1; transform: none; } }
@keyframes shelfway-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) { .menu, .overlay, .dialog, .dialog.wide { animation: none; } .state.loading::before { animation-duration: 3s; } }
`;
