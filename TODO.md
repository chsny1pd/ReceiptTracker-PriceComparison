# Spendly TODO

This file tracks the practical backlog for the current Spendly direction.
It is ordered by user impact, not by subsystem purity.

## Current Status

- Product direction is now receipt-first and compare-first, with both workflows treated as first-class.
- Authenticated landing page is `/dashboard`.
- Primary navigation is `Dashboard`, `Compare`, `Receipts`, `Splits`, `Settings`.
- Receipt drafts exist as separate server-backed records.
- Compare-to-receipt draft handoff exists.
- Payment methods and QR uploads exist.
- Payment proof upload and review flow exists.
- Shared source receipts can now be opened read-only by split participants.
- Theme and language preferences exist and now apply visibly in major app areas.

## Done

### Foundation

- [x] Next.js App Router app scaffolded.
- [x] TypeScript and Tailwind CSS configured.
- [x] Supabase SSR integration added.
- [x] Cloudflare R2 upload flow added.
- [x] `.env.example` added.
- [x] `supabase/schema.sql` established as database source of truth.
- [x] `SPECS.md`, `DESIGN.md`, `README.md`, and audit docs added.

### Auth and App Shell

- [x] GitHub OAuth sign-in flow wired through Supabase.
- [x] Protected app routes redirect unauthenticated users to `/login`.
- [x] Shared authenticated app shell added.
- [x] Theme selector added to app shell.
- [x] Language selector added to app shell.
- [x] Sign-out action added to app shell.

### Dashboard and IA

- [x] Dashboard repositioned as dual-entry home.
- [x] Top-level nav updated to `Dashboard`, `Compare`, `Receipts`, `Splits`, `Settings`.
- [x] Balances removed as primary nav destination.

### Receipts

- [x] Receipt creation flow implemented.
- [x] Receipt detail page implemented.
- [x] Receipt delete flow implemented.
- [x] Receipt and item image upload flow implemented.
- [x] Receipt drafts stored separately from final receipts.
- [x] Local + server-backed receipt draft autosave implemented.
- [x] Visible draft list added to `/receipts`.
- [x] Draft resume flow implemented.
- [x] Compare cart can seed a new receipt draft.
- [x] Receipt detail access widened to split participants as read-only.

### Compare and History

- [x] Manual compare flow implemented.
- [x] Compare cart implemented.
- [x] Compare winner can be turned into a receipt draft.
- [x] Product price history route implemented.
- [x] History chart and table implemented from receipt-derived data only.

### Splits and Payments

- [x] Split creation from receipt or line item implemented.
- [x] Even split RPC flow implemented.
- [x] Custom split RPC flow implemented.
- [x] Splits hub implemented.
- [x] Split detail page implemented.
- [x] Payment receiving methods stored in Postgres metadata.
- [x] QR image upload stored in R2.
- [x] Payment proof upload stored in R2 with Postgres metadata.
- [x] Payment proof review flow implemented.
- [x] Share states include `unpaid`, `submitted`, `confirmed`, `rejected`.

### Quality Gates Reached

- [x] `npm run lint` passes with warnings only.
- [x] `npm run build` passes.
- [x] Manual verification done for shared receipt access fix.
- [x] Manual verification done for visible theme switching.
- [x] Manual verification done for major Thai switching in splits flow.

## In Progress

### i18n Coverage Completion

- [ ] Remove remaining hardcoded English from less-traveled routes and components.
- [ ] Translate remaining modal, empty-state, error, and helper text consistently.
- [ ] Decide whether browser-controlled file input labels need custom wrappers for full localization.

### Theme Consistency

- [ ] Sweep all major pages for dark-mode contrast and surface consistency.
- [ ] Fix remaining light/dark inconsistencies in tables, alerts, inputs, and empty states.
- [ ] Check 375px mobile layout in both light and dark themes.

### Performance

- [ ] Measure slow routes in local dev and production build separately.
- [ ] Profile remaining Supabase-heavy pages:
  - `/dashboard`
  - `/receipts/new`
  - `/splits`
  - `/splits/[id]`
- [ ] Reduce redundant data fetching beyond the auth caching fix already landed.
- [ ] Check whether any page is over-fetching related rows not needed for first paint.

## Next Priority Work

### 1. Finish Language Support Properly

- [ ] Complete dictionary coverage for:
  - split form
  - balances panels
  - receipt detail
  - price history components
  - dashboard charts and carousel controls
  - landing page and login polish text
- [ ] Standardize dictionary naming so new strings do not get re-hardcoded later.
- [ ] Replace ad hoc fallback English where Thai should exist.

### 2. Finish Theme Support Properly

- [ ] Verify all top-level pages render correctly in:
  - light
  - dark
  - system
- [ ] Confirm theme persists after:
  - reload
  - navigation
  - auth redirect
- [ ] Audit dark-mode readability for:
  - compare cards
  - receipt forms
  - split tables
  - settings forms
  - alerts and empty states

### 3. Make Receipt Entry Faster

- [ ] Reduce scroll height in `/receipts/new`.
- [ ] Tighten spacing and grouping for mobile-first entry.
- [ ] Reconsider wording of `Item name` vs actual receipt purpose.
- [ ] Add better defaults for first line item and store/product selection.
- [ ] Simplify save/review messaging so rushed entry feels lighter.
- [ ] Improve draft list labels and last-updated messaging.

### 4. Improve Compare UX

- [ ] Fix remaining awkward layout density in compare cards.
- [ ] Make compare brand rows clearer on narrow screens.
- [ ] Improve copy and labels around normalized price and cart action.
- [ ] Confirm compare-to-receipt handoff covers:
  - title
  - line items
  - quantity
  - unit
  - line total

### 5. Improve Splits UX

- [ ] Localize split form and balances panels fully.
- [ ] Make payer vs participant responsibilities visually clearer.
- [ ] Reduce text duplication across split detail and payment proof sections.
- [ ] Expose current receiver payment method more clearly when paying.
- [ ] Re-check whether participants should see richer source receipt metadata without breaking RLS boundaries.

## Manual Verification Backlog

- [ ] `/` renders correctly in both languages.
- [ ] `/login` renders correctly in both languages.
- [ ] GitHub OAuth still works.
- [ ] Authenticated users reach `/dashboard`.
- [ ] Theme toggle persists after reload.
- [ ] Theme toggle persists after navigation.
- [ ] Language toggle persists after reload.
- [ ] Language toggle persists after navigation.
- [ ] `/compare` works in both languages.
- [ ] `/receipts/new` works in both languages.
- [ ] Receipt creation still works.
- [ ] Receipt draft resume still works.
- [ ] Receipt image upload still works.
- [ ] Item image upload still works.
- [ ] Compare-to-receipt handoff still works.
- [ ] Payment method QR upload still works.
- [ ] Payment proof upload still works.
- [ ] Payment proof review still works.
- [ ] Shared receipt read-only access still works.
- [ ] Unauthorized users still cannot view private receipt assets.
- [ ] 375px mobile layout is usable on:
  - dashboard
  - compare
  - receipts/new
  - splits
  - settings

## Technical Cleanup

- [ ] Consider replacing remaining raw `<img>` usage with `next/image` where appropriate.
- [ ] Add helper abstraction for repeated translated status labels.
- [ ] Add targeted unit coverage for:
  - theme persistence helpers
  - locale persistence helpers
  - compare-to-draft transform
  - receipt draft serialization
  - split/payment status label mapping
- [ ] Review whether any compatibility route like `/balances` should redirect explicitly into `/splits`.

## Deployment and Environment

- [ ] Re-verify Supabase and R2 env values in local and deployment targets.
- [ ] Deploy the current app to Vercel.
- [ ] Validate GitHub OAuth callback URLs for production.
- [ ] Re-run smoke tests against deployed environment, not only localhost.

## Definition of Near-Term Done

Spendly is ready for the next handoff when all of the following are true:

- [ ] Major user-facing text is translated on primary flows.
- [ ] Theme switching is visually correct on all major routes.
- [ ] Primary authenticated routes feel acceptably fast for demo use.
- [ ] Receipt creation, compare handoff, split payment proof, and shared receipt review all pass manual smoke checks.
- [ ] `npm run lint` passes with no new warnings beyond current known image warnings.
- [ ] `npm run build` passes.
