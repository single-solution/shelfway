'use client';
/**
 * Overlays (Unite shell: editing opens in a RIGHT DRAWER that keeps the page in view; modals only for
 * short confirmations): `role="dialog"` + `aria-modal`, labeled by its title, traps focus (Tab / Shift+Tab cycle
 * inside), close on Escape and on backdrop click, lock page scroll, and restore focus to the element that opened them.
 * A drawer slides in from the right (the whole screen on phones); a centered dialog scales in (a bottom sheet on
 * phones); both animate out when they close (PLAN 0.6 motion).
 * @module
 */
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './Button.js';
import { cx } from './cx.js';
import { FieldLayoutContext } from './fields.js';
import { StatusPill } from './display.js';
import { Icon } from './icons.js';
import { DRAWER, DRAWER_WIDTH } from './layout-metrics.js';
import { usePresence } from './motion.js';
import { HeaderActions, useNarrow } from './Page.js';
import { DrawerBodySkeleton } from './skeletons.js';

/** @typedef {import('react').ReactNode} ReactNode */

const FOCUSABLE =
	'a[href],area[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),' +
	'textarea:not([disabled]),iframe,[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

/**
 * Focusable descendants in tab order.
 * @param {HTMLElement} root
 * @returns {HTMLElement[]}
 */
const focusableIn = (root) =>
	/** @type {HTMLElement[]} */ ([...root.querySelectorAll(FOCUSABLE)]).filter(
		(el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
	);

let overlayLockCount = 0;
let previousOverflow = '';

/**
 * Shared scroll lock counter (point 48): lock while any overlay is open.
 * @param {Document} doc
 */
const lockScroll = (doc) => {
	const body = doc.body;
	if (overlayLockCount === 0) {
		previousOverflow = body.style.overflow;
		body.style.overflow = 'hidden';
	}
	overlayLockCount++;
};

/**
 * Unlock scroll when all overlays are closed.
 * @param {Document} doc
 */
const unlockScroll = (doc) => {
	const body = doc.body;
	overlayLockCount = Math.max(0, overlayLockCount - 1);
	if (overlayLockCount === 0) {
		body.style.overflow = previousOverflow;
	}
};

/**
 * Focus trap + Escape + focus restore for an open overlay.
 * @param {import('react').RefObject<HTMLElement | null>} ref
 * @param {boolean} open
 * @param {() => void} onClose
 */
export const useFocusTrap = (ref, open, onClose) => {
	const close = useRef(onClose);
	close.current = onClose;
	useEffect(() => {
		if (!open) return undefined;
		const root = ref.current;
		if (!root) return undefined;
		const previous = /** @type {HTMLElement | null} */ (root.ownerDocument.activeElement);
		const initial = /** @type {HTMLElement | null} */ (root.querySelector('[data-autofocus]')) ?? focusableIn(root)[0] ?? root;
		initial.focus();
		/** @param {KeyboardEvent} event */
		const onKey = (event) => {
			if (event.key === 'Escape') {
				event.stopPropagation();
				close.current();
				return;
			}
			if (event.key !== 'Tab') return;
			const items = focusableIn(root);
			if (items.length === 0) {
				event.preventDefault();
				root.focus();
				return;
			}
			const first = /** @type {HTMLElement} */ (items[0]);
			const last = /** @type {HTMLElement} */ (items[items.length - 1]);
			const active = root.ownerDocument.activeElement;
			if (event.shiftKey && (active === first || active === root)) {
				event.preventDefault();
				last.focus();
			} else if (!event.shiftKey && active === last) {
				event.preventDefault();
				first.focus();
			}
		};
		root.addEventListener('keydown', onKey);
		lockScroll(root.ownerDocument);
		return () => {
			root.removeEventListener('keydown', onKey);
			unlockScroll(root.ownerDocument);
			if (previous && typeof previous.focus === 'function') previous.focus();
		};
	}, [open, ref]);
};

/**
 * @typedef {{ open: boolean, onClose: () => void, title: ReactNode, eyebrow?: ReactNode, description?: ReactNode, children?: ReactNode,
 *   footer?: ReactNode, size?: 'sm' | 'md' | 'lg', closeLabel?: string, dismissible?: boolean,
 *   placement?: 'right' | 'center', icon?: ReactNode, status?: import('./Page.js').PageStatus[],
 *   actions?: import('./Page.js').PageActions, loading?: boolean, skeleton?: ReactNode }} OverlayProps
 */

/**
 * @typedef {{ open: boolean, onClose: () => void, title: ReactNode, eyebrow?: ReactNode, description?: ReactNode, children?: ReactNode,
 *   footer?: ReactNode, size?: 'md' | 'lg', status?: import('./Page.js').PageStatus[],
 *   actions?: import('./Page.js').PageActions, loading?: boolean, skeleton?: ReactNode, closeLabel?: string,
 *   dismissible?: boolean }} DrawerProps
 */

/**
 * The right drawer for editing or reading one record while the page stays in view (layout contract item 8): about 480 px
 * wide (`md`) or 760 px (`lg`, for a big record such as an order), the whole screen on phones. It has its own one-line
 * header (the title, status pills, the actions - a primary button, up to two secondary ones and a More menu, folded on
 * phones - and the close button), a body that is the only part that scrolls, and a fixed footer (Save / Cancel).
 * `loading` keeps the header and footer and draws a skeleton body (`skeleton` replaces it); `description` is a muted
 * line at the top of the body.
 * @param {DrawerProps} props
 */
export function Drawer({
	open,
	onClose,
	title,
	eyebrow,
	description,
	children,
	footer,
	size = 'md',
	status,
	actions,
	loading = false,
	skeleton,
	closeLabel = 'Close',
	dismissible = true,
}) {
	const ref = useRef(/** @type {HTMLDivElement | null} */ (null));
	const titleId = useId();
	const descriptionId = useId();
	const narrow = useNarrow();
	const close = () => {
		if (dismissible) onClose();
	};
	const presence = usePresence(open);
	useFocusTrap(ref, open, close);
	if (!presence.mounted) return null;
	const panel = (
		<div
			ref={presence.ref}
			data-state={presence.closing ? 'closed' : 'open'}
			data-placement="right"
			className={cx(
				'group fixed inset-0 z-50 flex bg-overlay/70',
				DRAWER.layer,
				'animate-shelfway-fade data-[state=closed]:pointer-events-none data-[state=closed]:animate-shelfway-fade-out',
			)}
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) close();
			}}>
			<div
				ref={ref}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={description ? descriptionId : undefined}
				aria-busy={loading || undefined}
				tabIndex={-1}
				className={cx(
					DRAWER.panel,
					DRAWER_WIDTH[size],
					'animate-shelfway-side group-data-[state=closed]:animate-shelfway-side-out focus:outline-none',
				)}>
				<div data-shelfway-part="header" className={DRAWER.header}>
					<div className="min-w-0 flex-1">
						{eyebrow ? (
							<p className="mb-0.5 text-xs font-mono font-bold tracking-widest uppercase text-primary">{eyebrow}</p>
						) : null}
						<h2 id={titleId} className="font-display min-w-0 truncate text-lead font-semibold tracking-tight text-fg">
							{title}
						</h2>
					</div>
					{status && status.length > 0 ? (
						<div className="flex shrink-0 items-center gap-1.5">
							{status.map((pill, i) => (
								<StatusPill key={i} status={pill.status} {...(pill.title ? { title: pill.title } : {})}>
									{pill.label}
								</StatusPill>
							))}
						</div>
					) : null}
					<div className="ml-auto flex shrink-0 items-center gap-2">
						{actions ? <HeaderActions actions={actions} narrow={narrow} /> : null}
						{dismissible ? (
							<button
								type="button"
								onClick={onClose}
								aria-label={closeLabel}
								className="shelfway-motion shelfway-press cursor-pointer rounded-control p-1.5 text-muted hover:bg-surface-2 hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:bg-surface-2">
								<Icon name="close" size={16} />
							</button>
						) : null}
					</div>
				</div>
				<div data-shelfway-part="body" className={DRAWER.body}>
					{description ? (
						<p id={descriptionId} className="text-sm text-muted">
							{description}
						</p>
					) : null}
					{loading ? (
						(skeleton ?? <DrawerBodySkeleton />)
					) : (
						<FieldLayoutContext.Provider value="stack">{children}</FieldLayoutContext.Provider>
					)}
				</div>
				{footer ? (
					<div data-shelfway-part="footer" className={DRAWER.footer}>
						{footer}
					</div>
				) : null}
			</div>
		</div>
	);
	return typeof document === 'undefined' ? panel : createPortal(panel, document.body);
}

/**
 * A short centered dialog (a bottom sheet on phones): a confirmation or a link to copy.
 * @param {Omit<OverlayProps, 'placement'>} props
 */
function CenterDialog({
	open,
	onClose,
	title,
	eyebrow,
	description,
	children,
	footer,
	size,
	status,
	actions,
	loading = false,
	skeleton,
	closeLabel = 'Close',
	dismissible = true,
	icon,
}) {
	const ref = useRef(/** @type {HTMLDivElement | null} */ (null));
	const titleId = useId();
	const descriptionId = useId();
	const narrow = useNarrow();
	const close = () => {
		if (dismissible) onClose();
	};
	const presence = usePresence(open);
	useFocusTrap(ref, open, close);
	if (!presence.mounted) return null;
	const panel = (
		<div
			ref={presence.ref}
			data-state={presence.closing ? 'closed' : 'open'}
			data-placement="center"
			className={cx(
				'group fixed inset-0 z-50 flex items-end justify-center bg-overlay/70 p-0 sm:items-center sm:p-4',
				'animate-shelfway-fade data-[state=closed]:pointer-events-none data-[state=closed]:animate-shelfway-fade-out',
			)}
			onMouseDown={(event) => {
				if (event.target === event.currentTarget) close();
			}}>
			<div
				ref={ref}
				role="dialog"
				aria-modal="true"
				aria-labelledby={titleId}
				aria-describedby={description ? descriptionId : undefined}
				aria-busy={loading || undefined}
				tabIndex={-1}
				className={cx(
					'flex max-h-[92vh] w-full flex-col rounded-t-card border border-line bg-surface text-fg focus:outline-none sm:rounded-card',
					'animate-shelfway-sheet group-data-[state=closed]:animate-shelfway-sheet-out sm:animate-shelfway-pop sm:group-data-[state=closed]:animate-shelfway-pop-out',
					size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl',
				)}>
				<div className="flex items-start justify-between gap-4 px-6 pt-6 pb-2">
					<div className="flex items-start gap-3 min-w-0">
						{icon ? <div className="shrink-0 mt-0.5">{icon}</div> : null}
						<div className="min-w-0">
							{eyebrow ? (
								<p className="mb-1 text-xs font-mono font-bold tracking-widest uppercase text-primary">{eyebrow}</p>
							) : null}
							<h2 id={titleId} className="font-display text-xl font-bold tracking-tight text-fg">
								{title}
							</h2>
							{description ? (
								<p id={descriptionId} className="mt-1 text-xs text-muted leading-relaxed">
									{description}
								</p>
							) : null}
						</div>
					</div>
					<div className="ml-auto flex shrink-0 items-center gap-2">
						{status && status.length > 0 ? (
							<div className="flex shrink-0 items-center gap-1.5">
								{status.map((pill, i) => (
									<StatusPill key={i} status={pill.status} {...(pill.title ? { title: pill.title } : {})}>
										{pill.label}
									</StatusPill>
								))}
							</div>
						) : null}
						{actions ? <HeaderActions actions={actions} narrow={narrow} /> : null}
						{dismissible ? (
							<button
								type="button"
								onClick={onClose}
								aria-label={closeLabel}
								className="shelfway-motion shelfway-press cursor-pointer rounded-control p-1.5 text-muted hover:bg-surface-2 hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:bg-surface-2">
								<Icon name="close" size={16} />
							</button>
						) : null}
					</div>
				</div>
				<div className="shelfway-scroll min-h-0 flex-1 space-y-4 px-6 py-4">
					{loading ? (
						(skeleton ?? <DrawerBodySkeleton />)
					) : (
						<FieldLayoutContext.Provider value="stack">{children}</FieldLayoutContext.Provider>
					)}
				</div>
				{footer ? (
					<div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>
				) : null}
			</div>
		</div>
	);
	return typeof document === 'undefined' ? panel : createPortal(panel, document.body);
}

/**
 * An overlay that holds a short task. For `sm` (or `placement="center"`) it is a centered dialog (a bottom sheet on
 * phones) for a short confirmation or a link to copy; otherwise it is a {@link Drawer} on the right (`md`, `lg`), so
 * every edit panel of the products is the one drawer.
 * @param {OverlayProps} props
 */
export function Dialog({ placement, size = 'md', ...rest }) {
	if ((placement ?? (size === 'sm' ? 'center' : 'right')) === 'right') {
		return <Drawer {...rest} size={size === 'lg' ? 'lg' : 'md'} />;
	}
	return <CenterDialog {...rest} size={size} />;
}

/**
 * Confirmation dialog for destructive or irreversible actions. Focus starts on the action that is safe: Cancel when `danger`
 * is set, the confirm button otherwise.
 * @param {{ open: boolean, onClose: () => void, onConfirm: () => void, title: ReactNode, children?: ReactNode,
 *   confirmLabel?: string, cancelLabel?: string, danger?: boolean, busy?: boolean, busyLabel?: string, error?: ReactNode }} props
 */
export function ConfirmDialog({
	open,
	onClose,
	onConfirm,
	title,
	children,
	confirmLabel = 'Confirm',
	cancelLabel = 'Cancel',
	danger = false,
	busy = false,
	busyLabel,
	error,
}) {
	const activeConfirmLabel = busy ? (busyLabel ?? (confirmLabel === 'Save' ? 'Saving…' : confirmLabel)) : confirmLabel;
	return (
		<Dialog
			open={open}
			onClose={busy ? () => undefined : onClose}
			title={title}
			size="sm"
			dismissible={!busy}
			footer={
				<>
					<Button variant="secondary" onClick={onClose} disabled={busy} data-autofocus={danger ? '' : undefined}>
						{cancelLabel}
					</Button>
					<Button
						variant={danger ? 'danger' : 'primary'}
						onClick={onConfirm}
						loading={busy}
						data-autofocus={danger ? undefined : ''}>
						{activeConfirmLabel}
					</Button>
				</>
			}>
			{children}
			{error ? (
				<p role="alert" className="animate-shelfway-shake text-sm font-medium text-danger">
					{error}
				</p>
			) : null}
		</Dialog>
	);
}
