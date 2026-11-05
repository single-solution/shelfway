# AGENTS.md - System Architecture, Engineering Standards, and Operational Constitution for Shelfway

This document is the binding, non-negotiable architectural constitution for all AI coding agents (Antigravity, Cursor, Claude Code, Copilot, Gemini) and human contributors working across the Shelfway monorepo.

Every agent and developer must read, understand, and strictly follow these standards. Violating any of these rules constitutes a regression and will fail automated verification.

---

## 1. Monorepo Map and Architectural Boundaries

Shelfway is structured as a strictly bounded monorepo. Every directory has a defined scope and responsibility:

```
singleSolutionSaas/
  |-- platform/          # Next.js control plane (merchant and admin consoles, public site, API server)
  |-- packages/
  |   |-- ui/            # @shelfway/ui: The Unite design system (only UI primitives allowed)
  |   |-- schema/        # @shelfway/schema: Shared validation schemas, types, and RFC 7807/9457 problem helpers
  |   |-- config/        # @shelfway/config: ESLint rules, Prettier configuration, Vitest presets
  |   |-- app-kit/       # @shelfway/app-kit: Runtime adapter for micro-products (protocol compliance, fail-closed)
  |   |-- cli/           # @shelfway/cli: Shelfway developer CLI (app validate, imports)
  |   \-- importer-*/    # Data migration tools for external platforms
  |-- products/          # Micro-products (accounts, chat, ecommerce, growth, notifications, payments)
  \-- e2e/               # Real integration and browser end-to-end test suites
```

### Architectural Responsibilities:

- **`platform/` (The Control Plane)**: Handles identity, authentication, merchant accounts, website management, billing, catalog placement, and product SSO launch. It is NOT a documentation hub or a storefront.
- **`packages/ui` (The Single Design System)**: The sole provider of visual components. No application component or product may define ad-hoc design primitives, unvetted CSS cascades, or custom input styles.
- **`packages/schema` (The Shared Contract)**: Pure schemas, RFC 9457 problem helpers, and type definitions shared across platform and products.
- **`packages/app-kit` (The Runtime Guard)**: Micro-products integrate with the platform runtime exclusively via `app-kit`. It enforces fail-closed authorization (`allows()`) and denylists invalid operations.
- **`products/*` (Independent Micro-Products)**: Each product (accounts, chat, ecommerce, growth, notifications, payments) runs as an autonomous subsystem communicating via validated protocol calls. Products configure dashboards mounted inside the platform and must never bypass platform RBAC or invent ad-hoc tokens.
- **The Binding Plan (`PLAN.md`) Wins**: When architectural disputes arise, `PLAN.md` takes precedence over unit README files.

---

## 2. Universal Architectural Bans (Never Ship These)

The following practices are strictly forbidden across the entire repository:

1. **NO Raw HTML Form Controls**: Never write raw `<input>`, `<textarea>`, `<select>`, or `<button>` elements in user-facing components. Always use `@shelfway/ui`.
2. **NO Hand-Rolled Modal Overlays**: Never write custom `fixed inset-0`, background backdrops, or z-index overlay stacks. Always use `@shelfway/ui` `Dialog` or confirm dialog variants.
3. **NO Second Design System**: Never introduce a parallel design framework, custom utility cascade, or alternate component library. The Unite theme pack (`packages/ui/THEME-PACK.md`, tokens in `packages/ui/src/theme.css`) is the only design system.
4. **NO Accordion / Expand-One-Field Settings**: Settings fields must remain visible in calm, open sections. Never make a user click disclosure triangles to expand and edit a single setting field.
5. **NO Password Re-Entry as Routine Step-Up**: Sensitive actions (opening configure dashboards, generating developer packs, revealing tokens) must use OTP step-up (authenticator or recovery codes), never repeated password prompts.
6. **NO Duplicate Modal Mounts**: Any dialog or modal must have a single source of truth in the DOM, controlled via query parameters or custom event dispatchers.
7. **NO Parallel Auth Flows or Orphaned Pages**: Authentication belongs in the unified modal or designated auth routes. Never create duplicate, unlinked login screens.
8. **NO Client-Side Security Reliance ("UI Hides vs Server Denies")**: Hiding a button in the UI does not secure an action. Every mutation must be authorized on the server via RBAC (`can()`, `permission`, fail-closed).
9. **NO Direct Foreign Collection Queries**: Backend modules must communicate through `ctx.service(name)` interfaces. Never run direct MongoDB operations against another module's database collections.
10.   **NO Invented Tokens or Monolithic Keys**: Each product and website uses scoped credentials. Never generate or expect a single monolithic token across all products.
11.   **NO Secrets in Git, Bundles, or Client Payloads**: API secrets, private keys, and session secrets must never be committed or included in client-accessible API responses. All stored secrets must be sealed with `ctx.secretBox`.

---

## 3. Platform Module Architecture (platform/src/modules)

The platform backend is organized into five core modules. Modules interact strictly via `ctx.service(name)` interfaces:

### 3.1. Identity Module (`modules/identity`)

- **Responsibilities**: Merchants, Admins, Logins (`identity_logins`), Sessions, Websites, and Product Tokens (`identity_product_tokens`).
- **Identity Planes**: Strict separation between Admin (`/admin/*`, roles: `owner`, `support`, `finance`) and Merchant (`merchantId`).
- **Tokens**: Browser tokens and sealed server tokens (`ctx.secretBox` bound with AAD website, product, and jti).
- **Session Revocation**: `sessions.revokeAll` immediately terminates all active web and configure sessions when passwords change, resets occur, roles change, or merchants are suspended.

### 3.2. Catalog Module (`modules/catalog`)

- **Responsibilities**: Connected products registry, product placement on websites, SSO configure launches, advisor profiles, and event notices.
- **Connect Handshake**: Handshake verifies product manifest and price list before activating (`validateManifest`, `validatePriceReport`).
- **SSO Launches**: Issues cryptographically signed launches (`issueLaunch`) scoped to the current session expiry.
- **Notices**: Queues and signs events delivered to product endpoints (`/.well-known/shelfway-events`).

### 3.3. Commerce Module (`modules/commerce`)

- **Responsibilities**: Products on websites, price lists, feature switches, ledger, and merchant billing.
- **The Money Function**: Pure ledger accounting (`core/money.js`). All balances are integer millicredits.
- **Append-Only Ledger**: Stored in `commerce_ledger` with cryptographic hash chaining (`receipt` positive, `day_charge` negative).
- **Status Computation**: Computes merchant and website status (`active`, `grace`, `stopped`, `suspended`) with maximum 5-minute validity caches.

### 3.4. Website Module (`modules/website`)

- **Responsibilities**: Shared website settings (`business`, `brand`, `region`, `pages`, `team`), database and storage connections, and inter-product links.
- **Shared Settings**: Stored once per website and pushed to all placed products via `website.settings_changed`.
- **Connections & Links**: Manages sealed MongoDB connection strings, S3 credentials, and signed inter-product link tokens. Never reveals raw secret values back to consoles.

### 3.5. System Module (`modules/system`)

- **Responsibilities**: Platform settings, public branding, activity audit logging (`system_activity`), and master encryption key re-sealing (`resealSecrets`).

---

## 4. Design System Contract (@shelfway/ui)

All user interfaces across `platform/` and `products/` must be built from `@shelfway/ui` primitives. Automated ESLint AST rules enforce this restriction.

### Component Catalog:

| Need                         | Component                                                      | Import Path    | Never Do                                       |
| ---------------------------- | -------------------------------------------------------------- | -------------- | ---------------------------------------------- |
| Modal dialogs                | `Dialog`                                                       | `@shelfway/ui` | Hand-rolled `fixed inset-0` div overlays       |
| Confirmation prompts         | `ConfirmDialog`, `PasswordConfirmDialog`, `TypedConfirmDialog` | `@shelfway/ui` | Native `window.confirm` or raw popups          |
| Text, email, password inputs | `Input`                                                        | `@shelfway/ui` | Raw `<input>` tags                             |
| Multiline text inputs        | `TextArea`                                                     | `@shelfway/ui` | Raw `<textarea>` tags                          |
| Dropdowns and choices        | `Select`, `Checkbox`, `Switch`                                 | `@shelfway/ui` | Raw `<select>` or `<input type="checkbox">`    |
| Buttons and links            | `Button`, `IconButton`, `ButtonLink`                           | `@shelfway/ui` | Raw `<button>` or unstyled `<a>` tags          |
| Form errors and callouts     | `FormError`, `Callout`                                         | `@shelfway/ui` | Unstyled error paragraphs or alert popups      |
| Badges and status pills      | `Badge`                                                        | `@shelfway/ui` | Ad-hoc rounded spans with arbitrary colors     |
| Loading indicators           | `Spinner`                                                      | `@shelfway/ui` | Custom CSS spinners                            |
| System icons                 | `Icon`                                                         | `@shelfway/ui` | Inlined raw `<svg>` elements                   |
| Field layouts                | `FieldGrid`, `Form`                                            | `@shelfway/ui` | Ad-hoc spacing containers that misalign labels |
| Page structure               | `Page`, `Row`, `Toolbar`                                       | `@shelfway/ui` | Inconsistent custom layout wrappers            |

### Layout and Spacing Standard:

- Use `Form` from `@shelfway/ui` to wrap inputs. It automatically handles container queries, responsive field grids, and keyboard submission.
- Use `Input` with built-in `label`, `help`, and `error` props. Do not create separate `<label>` and error `<div>` tags manually.
- Use `FieldGrid` for responsive multi-column layouts that adapt to container width rather than viewport width.

---

## 5. Two-Tier Form Validation and Error Handling Standard

Every form submitting user data must follow this exact two-tier pattern:

### Tier 1: Client-Side Pre-Validation

Before initiating any network request:

1. Validate required fields, email formatting (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), password presence, and value bounds.
2. Collect errors into a local state object: `{ email: 'Email address is required.', password: 'Password is required.' }`.
3. Pass errors directly to the input: `<Input error={errors.email} ... />`.
4. Prevent submission if any client-side validation errors exist.

### Tier 2: Server-Side Problem Mapping (RFC 7807 / RFC 9457)

When the backend returns an error:

1. Parse the RFC 7807 problem response.
2. Map field-specific errors using `fieldErrors(problem)` from `@shelfway/ui` and populate the input error props.
3. Render general or unmapped errors at the top or bottom of the form using `<FormError problem={problem} fields={['email', 'password']} />`.
4. Keep the submit button disabled with `loading={busy}` while the action is in flight to prevent race conditions and duplicate submissions.

---

## 6. Product Configure Dashboard Standard (packages/ui ProductDashboard)

Every micro-product configure dashboard (opened via merchant or admin SSO launch) must adhere to the Calm UX standard:

1. **Capabilities Over Feature Rows**: Group settings by customer-facing capabilities (around 10 to 12 per product), never as an endless wall of 40+ raw feature keys.
2. **Open Section Hierarchy**: Present fields in open, visible sections. Never introduce disclosure triangles or accordions to hide single fields.
3. **Sub-Pages for Complex Lists**: Complex list configurations must navigate to dedicated sub-pages or views rather than nesting expanders inside settings cards.
4. **Shared Layout Shell**: Utilize the standard tabs: Overview, Settings, Texts, Developers, Defaults (Owner), and Prices (Owner).
5. **No Micro-Price Grids**: Merchants configure capabilities; admins set capability prices, not confusing per-setting micro-fees.

---

## 7. Security, RBAC, and Authentication Protocol

Security is a primary invariant across all modules:

1. **Server-Side Enforcement**:
   - Every API endpoint must enforce rights via `can()` and route permissions.
   - "UI hides" never replaces "server denies".
2. **CSRF & Cookie Protection**:
   - Authentication cookies use `HttpOnly`, `SameSite=Lax`, and `Secure` / `__Host-` prefixes.
   - All state mutations require `Sec-Fetch-Site: same-origin` and verified Origin headers (`checkCsrf`).
3. **Rate Limiting & Payload Caps**:
   - Sensitive auth routes are strictly throttled (e.g. 5 failures / 15 minutes trigger progressive lockouts).
   - All request bodies are capped (`readBody`) to prevent memory exhaustion attacks.
4. **Step-Up Verification (PLAN A5)**:
   - High-privilege mutations (revealing server tokens, generating developer packs, opening configure dashboards) require OTP verification (authenticator or backup code).
   - Routine password re-entry step-ups are strictly banned.
5. **SSRF Defense**:
   - All outbound requests to product endpoints or webhooks must route through `@shelfway/net` with private IP protection and loopback blocking.

---

## 8. Contributor and AI Agent Invariants

When working in this codebase, all human contributors and AI agents must adhere to these rules:

1. **Inspect Before Inventing**:
   - Always search `packages/ui/src/` and `platform/src/console/views/` to find existing, tested patterns before writing any new component or view.
2. **Touch-Scope Only**:
   - Touch only the files directly required for the task. Do not perform purity renames or format unrelated files.
3. **Pure ASCII Prose and Strings**:
   - All comments, commit messages, documentation, and user-facing copy must use pure ASCII characters only.
   - Never use unicode arrows, em dashes, en dashes, or curly quotes.
4. **No Unapproved Commits**:
   - Never commit, push, or open a pull request without explicit authorization from the user.
5. **Mandatory Full Verification**:
   - Before considering any task complete, you must run and pass the full verification command:
      ```bash
      pnpm check
      ```
   - This verifies Prettier code style, ESLint rules (including design system AST checks), TypeScript type checking, and all Vitest unit, integration, and E2E test suites across all packages.
