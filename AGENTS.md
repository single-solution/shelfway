# AGENTS.md - Repository Standards and Guardrails for Shelfway SaaS

This document defines the strict, non-negotiable architectural rules, design system contracts, and workflow standards for all AI coding agents (Antigravity, Cursor, Claude Code, Copilot, Gemini) and human contributors working in this repository.

## 1. Absolute Rule: Design System First (@shelfway/ui)

Never invent or write raw HTML form controls or custom modal overlays in user-facing components. All interactive UI in `platform/` and `products/` MUST import and use primitives from `@shelfway/ui`:

- **Dialogs and Modals**: Import `Dialog`, `ConfirmDialog`, `PasswordConfirmDialog`, or `TypedConfirmDialog` from `@shelfway/ui`. Never hand-roll custom `fixed inset-0` modal overlays or backdrop layers.
- **Form Inputs**: Import `Input`, `TextArea`, `Select`, `Checkbox`, `Switch` from `@shelfway/ui`. Never write raw `<input>` or `<textarea>` tags.
- **Buttons and Links**: Import `Button`, `IconButton`, `ButtonLink` from `@shelfway/ui`. Never write raw `<button>` with custom utility cascades.
- **Feedback and Errors**: Import `FormError`, `Callout`, `Badge`, `Spinner`, `Toast` from `@shelfway/ui`.
- **Icons**: Import `Icon` from `@shelfway/ui`. Never inline raw `<svg>` elements when an icon exists in `@shelfway/ui`.

Any code introducing raw `<input>`, raw `<button>`, or hand-rolled modal overlays in application components is a direct violation of repository policy.

## 2. Form Validation and Error Handling Contract

Every user-facing form must follow this two-tier validation contract:

1. **Client-side Pre-Validation**:
   - Validate field formats before making network requests (e.g., standard email regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, password presence and length requirements, required fields).
   - Display field errors immediately below the corresponding input using `error={errors.fieldName}` on `@shelfway/ui` `Input`.
   - Never rely on generic alert dialogs or browser default tooltips for form feedback.
2. **Server-side Problem Mapping**:
   - Map RFC 7807 problem responses using `fieldErrors(problem)` from `@shelfway/ui`.
   - Render unmapped or general API problems using `<FormError problem={problem} />`.
   - Keep the submit button disabled with `loading={busy}` while an action is in flight to prevent duplicate submissions.

## 3. Inspect Before Inventing (Reuse Established Patterns)

Before creating any new view, modal, or handler:

1. Search `packages/ui/src/` to identify existing primitives.
2. Search `platform/src/console/views/` (such as `sign-in.js`, `common.js`, `websites.js`) to see established, battle-tested implementations.
3. Reuse and adapt the existing domain logic rather than authoring parallel code paths.

## 4. Verification and Code Quality

- Every change MUST pass full repo verification:
  `pnpm check` (Prettier code style + ESLint + TypeScript typecheck + all Vitest test suites).
- All prose, comments, and strings MUST use pure ASCII (no em dashes, en dashes, curly quotes, or unicode arrows).
- Preserve existing comments and architecture boundaries.
- No secrets or credentials in git commits, test files, or client bundles.
