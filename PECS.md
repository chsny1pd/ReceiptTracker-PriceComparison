# Spendly Product Engineering Context Specification

> Purpose: this file is the canonical handoff document for AI agents and
> engineers working on Spendly. It describes what the app is, what already
> exists, what must be built next, what must not be built, and how to verify
> each part of the system.

## 1. Project Identity

**Product name:** Spendly

**Repository:** `chsny1pd/ReceiptTracker-PriceComparison`

**Local project root used during setup:**

```text
/Users/krit/Documents/Codex/2026-07-03/claude-md-behavioral-guidelines-to-reduce/ReceiptTracker-PriceComparison
```

**Product type:** School-project web application.

**Primary value proposition:** Spendly helps a user log shopping receipts,
compare fair unit prices across stores, view product price history from their
own logged receipts, and split receipt/item costs with other users.

**Intended audience:**
- Teacher grading the technical implementation.
- Classmates trying the demo.
- The project owner continuing development with AI assistance.

**Success for the school project:**
- The app has a working GitHub login flow through Supabase Auth.
- The database has at least 5 relational tables.
- Users can enter receipts with store, date, totals, and line items.
- Price comparison uses normalized unit prices, not raw line prices.
- Historical price trends come only from logged receipt data.
- Receipt photos are stored in Cloudflare R2, not in Postgres.
- Users can split a receipt or item and view who owes whom.
- The deployed app runs on Vercel.

## 2. Fixed Tech Stack

Do not suggest or migrate away from this stack unless the project owner
explicitly changes the assignment requirements.

| Layer | Choice |
|---|---|
| Framework | Next.js App Router |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Auth | Supabase Auth |
| OAuth Provider | GitHub |
| Database | Supabase Postgres |
| Object Storage | Cloudflare R2 |
| Deployment | Vercel |
| Package Manager | npm |

Current package versions are defined in `package.json`.

Important current dependencies:
- `next`
- `react`
- `react-dom`
- `@supabase/ssr`
- `@supabase/supabase-js`
- `@aws-sdk/client-s3`
- `@aws-sdk/s3-request-presigner`
- `tailwindcss`
- `typescript`
- `eslint`

## 3. Current Repository State

The repository already contains a base project.

### Existing files and responsibilities

| Path | Responsibility |
|---|---|
| `README.md` | Human setup guide for local development and deploy basics |
| `AGENTS.md` | AI agent rules for Spendly |
| `CLAUDE.md` | Prompt/context for Claude-style coding agents |
| `.codex/skills/spendly/SKILL.md` | Codex project skill for Spendly-specific work |
| `docs/prompts/spendly-system-prompt.md` | Reusable system prompt for other AI agents |
| `.env.example` | Required environment variable names |
| `supabase/schema.sql` | Complete database schema source of truth |
| `src/app/page.tsx` | Public landing page |
| `src/app/login/page.tsx` | GitHub login page |
| `src/app/dashboard/page.tsx` | Protected dashboard shell |
| `src/app/auth/sign-in/route.ts` | Starts Supabase GitHub OAuth |
| `src/app/auth/callback/route.ts` | Exchanges OAuth code for Supabase session |
| `src/app/api/receipt-images/presign/route.ts` | Creates authenticated R2 presigned upload URL |
| `src/app/api/receipt-images/[receiptId]/route.ts` | Creates authenticated R2 signed view URL |
| `src/lib/env.ts` | Required environment variable helpers |
| `src/lib/r2.ts` | Cloudflare R2 S3-compatible client helper |
| `src/lib/supabase/client.ts` | Browser Supabase client factory |
| `src/lib/supabase/server.ts` | Server Supabase client factory |
| `src/lib/supabase/middleware.ts` | Supabase session refresh helper |
| `middleware.ts` | App-wide Supabase session middleware |

### Current verification status

These commands passed after the base setup:

```bash
npm run lint
npm run build
```

Any future AI agent must rerun both before claiming implementation is complete.

## 4. Non-Negotiable Scope Rules

Build the smallest complete Spendly that satisfies the assignment.

### Must build

- GitHub OAuth login.
- Receipt CRUD.
- Store management as part of receipt entry.
- Product management or product selection as part of receipt entry.
- Receipt line items with quantity, unit, line total, and normalized unit price.
- Price comparison between two stores for one product.
- Product price history from logged receipt data.
- Optional receipt image upload to Cloudflare R2.
- Receipt/image delete behavior that also removes R2 objects.
- Direct user-to-user receipt/item splits.
- Netted balances per user pair.

### Must not build unless explicitly requested

- OCR receipt scanning.
- External price scraping.
- Store API integrations.
- Barcode scanning.
- Persistent groups.
- Notifications.
- Multi-currency support.
- Tax allocation per item.
- Social sharing.
- Admin panels.
- Analytics dashboards beyond what is needed for the demo.
- A separate stored `net_balances` table.

### Product name rule

Use **Spendly** everywhere user-facing unless the project owner renames the app.

## 5. Environment Variables

The current `.env.example` defines:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=
```

Rules:
- Only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` may be
  exposed to the browser.
- R2 credentials must stay server-only.
- Do not commit `.env`, `.env.local`, or real secrets.
- Vercel must be configured with the same variables.

## 6. Database Source of Truth

Use `supabase/schema.sql` as the canonical schema.

Do not create future migrations unless the project owner asks for migration
history. This school project currently uses a complete first-run schema file.

### Core tables

| Table | Purpose |
|---|---|
| `profiles` | App profile linked one-to-one with `auth.users` |
| `stores` | User-owned store names and optional locations |
| `products` | User-owned normalized product identities |
| `receipts` | Receipt header: owner, store, date, totals, image key |
| `receipt_items` | Receipt line items with normalized quantity and unit price |
| `expense_splits` | Split event for a receipt or one receipt item |
| `expense_split_shares` | Non-payer participants who owe the payer |

### Important schema decisions

- The app uses `products`; do not rely on string matching for product history.
- `receipts.image_object_key` stores the Cloudflare R2 object key.
- `receipts.image_public_url` exists only for optional public/demo bucket use.
- Postgres must never store image binary data.
- `receipt_items.normalized_unit_price` is computed by trigger.
- A split can target either a whole receipt or a single receipt item.
- `expense_split_shares` contains only non-payer debts.
- The payer never gets an `expense_split_shares` row.
- Balances are computed from unsettled shares and netted at read time.

### Unit model

Allowed units:
- `g`
- `kg`
- `ml`
- `l`
- `each`

Allowed normalized units:
- `kg`
- `l`
- `each`

Unit categories:
- `mass`
- `volume`
- `each`

Normalization rules:
- `g` converts to `kg`.
- `kg` stays `kg`.
- `ml` converts to `l`.
- `l` stays `l`.
- `each` stays `each`.

Examples:
- `500 g` with line total `$4.00` becomes `0.5 kg` and `$8.0000 / kg`.
- `2 each` with line total `$6.00` becomes `$3.0000 / each`.
- `750 ml` with line total `$3.75` becomes `0.75 l` and `$5.0000 / l`.

### Price comparison rule

Current/latest price for a product at a store:

1. Filter by `product_id`.
2. Filter by store through `receipts.store_id`.
3. Filter by matching `normalized_unit` when provided.
4. Order by `receipts.purchased_at desc`.
5. Tie-break by `receipts.created_at desc`.
6. If the winning receipt has multiple matching rows, use lowest
   `receipt_items.line_number`.

The SQL function `get_latest_product_price` already implements this rule.

### Price history rule

Product history:
- Comes only from the current user's logged receipt items.
- Uses `receipts.purchased_at` as the primary timeline date.
- Includes store name and normalized unit price.
- Does not use external data.

The SQL function `get_product_price_history` already supports this.

### Balance rule

`GET /api/balances` or equivalent server action must return netted balances.

For every user pair:
- Sum unsettled shares where A owes B.
- Sum unsettled shares where B owes A.
- Subtract the two sums.
- Return one direction only.
- Omit pairs where net amount is zero.

The SQL function `get_current_balances` already supports this for the current
authenticated user.

## 7. Auth Architecture

Use Supabase Auth with GitHub OAuth.

### Current auth files

| Path | Role |
|---|---|
| `src/app/login/page.tsx` | Presents GitHub login button |
| `src/app/auth/sign-in/route.ts` | Calls `signInWithOAuth({ provider: "github" })` |
| `src/app/auth/callback/route.ts` | Exchanges OAuth code for session |
| `src/lib/supabase/server.ts` | Server-side Supabase client |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/middleware.ts` | Refreshes auth cookies |
| `middleware.ts` | Applies Supabase session middleware to routes |

### Required auth behavior

- Unauthenticated users can view `/` and `/login`.
- Protected app routes must redirect unauthenticated users to `/login`.
- `/dashboard` is already protected at the page level.
- Future receipt, compare, history, split, and balance pages must also be
  protected.
- Supabase RLS must enforce data access even if route code has a bug.

### Profile creation

`supabase/schema.sql` contains `handle_new_user()` and an auth trigger:

```sql
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
```

This creates/updates `profiles` from GitHub metadata.

## 8. R2 Receipt Image Architecture

Receipt image files go to Cloudflare R2. Postgres stores only metadata.

### Current R2 files

| Path | Role |
|---|---|
| `src/lib/r2.ts` | Creates S3-compatible R2 client |
| `src/app/api/receipt-images/presign/route.ts` | Authenticated presigned upload URL |
| `src/app/api/receipt-images/[receiptId]/route.ts` | Authenticated signed view URL |

### Upload flow

1. User selects image in receipt form.
2. Client sends `contentType` and `fileSize` to
   `POST /api/receipt-images/presign`.
3. Route verifies Supabase auth.
4. Route rejects unsupported content types.
5. Route rejects files larger than 5 MB.
6. Route returns `objectKey` and short-lived `uploadUrl`.
7. Client uploads directly to R2 with `PUT`.
8. Receipt creation stores `image_object_key = objectKey`.

Allowed content types:
- `image/jpeg`
- `image/png`
- `image/webp`

### View flow

1. Client requests `GET /api/receipt-images/[receiptId]`.
2. Route verifies Supabase auth.
3. Route fetches receipt by `id` and `owner_user_id`.
4. Route returns a short-lived signed R2 `GET` URL.

### Delete flow to build

When deleting a receipt:
1. Fetch receipt by `id` and current user.
2. If `image_object_key` exists, delete the object from R2.
3. Delete the receipt row.
4. Rely on `on delete cascade` to delete receipt items and related splits.

## 9. Required Pages

Build these pages for the complete demo.

| Route | Status | Purpose |
|---|---|---|
| `/` | Exists | Public landing page |
| `/login` | Exists | GitHub login |
| `/dashboard` | Exists shell | Protected app dashboard |
| `/receipts/new` | Needed | Create receipt, store, products, line items, optional image |
| `/receipts/[id]` | Needed | Receipt detail, image preview, item list, split action |
| `/compare` | Needed | Compare latest unit price for one product at two stores |
| `/products/[id]/history` | Needed | Product price history table/chart |
| `/splits/[id]` | Needed | Split detail and settlement state |
| `/balances` | Needed | Netted who-owes-whom balances |
| `/settings` | Optional | Minimal profile/account display |

For school demo speed, the first complete version may use simple forms and
tables instead of complex charts.

## 10. Required API Routes or Server Actions

Prefer server actions for form submissions where simple. Use route handlers
when the endpoint is naturally API-like or needs direct client calls.

### Existing route handlers

| Route | Status | Purpose |
|---|---|---|
| `GET /auth/sign-in` | Exists | Start GitHub OAuth |
| `GET /auth/callback` | Exists | Exchange OAuth code |
| `POST /api/receipt-images/presign` | Exists | Return R2 upload URL |
| `GET /api/receipt-images/[receiptId]` | Exists | Return R2 signed view URL |

### Needed server actions/routes

| Route/action | Input | Output | Database/system |
|---|---|---|---|
| `createReceipt` | store, date, totals, items, optional image key | receipt id | `stores`, `products`, `receipts`, `receipt_items` |
| `deleteReceipt` | receipt id | success | `receipts`, R2 delete |
| `getReceipt` | receipt id | receipt detail | `receipts`, `receipt_items`, `stores`, `products` |
| `getCompareResult` | product id, store A, store B, unit | latest prices | SQL function `compare_product_between_stores` |
| `getProductHistory` | product id, unit | history rows | SQL function `get_product_price_history` |
| `searchUsers` | query | matching profiles | `profiles` |
| `createEvenSplit` | receipt/item, participant ids | split id | SQL function `create_even_expense_split` |
| `createCustomSplit` | receipt/item, payer share, shares JSON | split id | SQL function `create_custom_expense_split` |
| `settleShare` | share id | updated share | SQL function `mark_split_share_settled` |
| `getBalances` | current user | netted balances | SQL function `get_current_balances` |

## 11. UI and UX Requirements

The UI should feel like a practical school/demo tool, not a marketing site.

### Visual principles

- Use clear pages, simple forms, tables, and small summary cards.
- Avoid decorative complexity.
- Keep all text readable on mobile and desktop.
- Use restrained color: slate neutrals plus emerald accents already exist.
- Use cards only for repeated items, forms, and framed tool panels.
- Do not nest cards inside cards.

### Required workflows

#### Receipt creation

User should be able to:
1. Choose or create a store.
2. Enter purchase date.
3. Enter subtotal, tax, and total.
4. Add multiple item rows.
5. For each item, choose or create a product.
6. Enter raw item name, quantity, unit, and line total.
7. Optionally upload image.
8. Save receipt.

Validation:
- Store name required.
- Purchase date required.
- Total must be non-negative.
- Each item needs product, raw name, quantity, unit, and line total.
- Quantity must be positive.
- Unit must match product unit category.

#### Price comparison

User should be able to:
1. Pick one product.
2. Pick two stores.
3. Pick normalized unit if needed.
4. See latest price at each store.
5. See which store is cheaper.
6. See date of each latest price.

Empty states:
- If one store has no price for that product, show a clear "No logged price"
  message.
- Do not compare raw prices when normalized units differ.

#### Product history

User should be able to:
1. Pick/open a product.
2. See all logged prices over time.
3. See store, date, normalized unit price, and line total.

For the first version, a table is acceptable. A chart is a nice enhancement
only after core functionality works.

#### Splitting

User should be able to:
1. Open a receipt.
2. Start a split for the full receipt or one line item.
3. Choose existing Spendly users.
4. Choose even or custom split.
5. Save split.
6. See share rows.
7. Mark a share settled.

Rules:
- Payer is the current receipt owner.
- Payer is not added as a share row.
- Even split among N people including payer creates N minus 1 share rows.
- Custom split requires payer share plus non-payer shares to equal split total.

#### Balances

User should be able to:
1. Open `/balances`.
2. See one row per non-zero user pair.
3. See direction: who owes whom.
4. See net amount.
5. Avoid duplicate opposite-direction rows.

## 12. Data Access and Security Rules

### RLS is mandatory

Keep RLS enabled on all app tables.

Never bypass RLS from the web app with a service-role key. The service-role key
must not be used in browser or route code for this project.

### Current RLS intent

- Users manage their own stores, products, receipts, and receipt items.
- Profiles are readable by authenticated users so split participants can be
  searched.
- Split creators/payers/participants can view relevant split rows.
- Split creators manage split rows.

### Server-side checks

Every server action or route handler must:
1. Create a Supabase server client.
2. Call `supabase.auth.getUser()`.
3. Return 401 or redirect if no user.
4. Scope queries to `user.id` or rely on RLS-backed RPCs.

### R2 security

- Use private bucket for real receipt images.
- Use short-lived signed URLs for upload and view.
- Validate content type and file size before signing upload.
- Object key format should include user id:

```text
receipts/{user.id}/{uuid}.{extension}
```

## 13. Implementation Plan

This section is written for AI agents. Implement tasks in order. Each task
should end with `npm run lint` and `npm run build` unless the task is
documentation-only.

### Task 1: Confirm environment and database setup

Files:
- Read: `.env.example`
- Read: `supabase/schema.sql`
- Modify only if setup docs are incorrect: `README.md`

Steps:
1. Confirm `.env.local` exists locally or document that runtime auth/R2 tests
   cannot be performed without it.
2. Confirm Supabase project has GitHub OAuth enabled.
3. Run `supabase/schema.sql` in the Supabase SQL editor or Supabase CLI.
4. Log in through `/login`.
5. Confirm a `profiles` row is created.

Verification:

```bash
npm run lint
npm run build
```

Manual verification:
- Visiting `/dashboard` while logged out redirects to `/login`.
- GitHub login redirects back to `/dashboard`.

### Task 2: Add typed domain helpers

Create:
- `src/lib/domain/units.ts`
- `src/lib/domain/money.ts`
- `src/lib/domain/types.ts`

Required exports:

```ts
export type SpendlyUnit = "g" | "kg" | "ml" | "l" | "each";
export type NormalizedUnit = "kg" | "l" | "each";
export type UnitCategory = "mass" | "volume" | "each";
```

`units.ts` must expose:

```ts
export function categoryForUnit(unit: SpendlyUnit): UnitCategory;
export function normalizedUnitFor(unit: SpendlyUnit): NormalizedUnit;
export function normalizeQuantity(quantity: number, unit: SpendlyUnit): number;
```

`money.ts` must expose:

```ts
export function roundMoney(value: number): number;
export function formatMoney(value: number): string;
```

Verification:
- Unit helper tests can be plain TypeScript functions if no test framework has
  been added yet.
- At minimum, run lint/build.

### Task 3: Build receipt creation

Create or modify:
- `src/app/receipts/new/page.tsx`
- `src/app/receipts/actions.ts`
- `src/components/receipt/receipt-form.tsx`
- `src/components/receipt/receipt-item-row.tsx`

Implementation:
- Use a client component for dynamic item rows.
- Use a server action to insert receipt data.
- Insert or reuse store by case-insensitive name.
- Insert or reuse product by case-insensitive name.
- Let the database trigger compute normalized quantity and unit price.
- Save `image_object_key` only after R2 upload succeeds.

Minimum form fields:
- Store name.
- Optional store location.
- Purchase date.
- Subtotal.
- Tax.
- Total.
- Optional receipt image.
- Item rows: product name, product category, raw name, quantity, unit, line total.

Verification:
- Create a receipt with at least two items.
- Confirm rows appear in `receipts` and `receipt_items`.
- Confirm normalized unit price is populated by the database.
- Run lint/build.

### Task 4: Build receipt detail and image viewing

Create or modify:
- `src/app/receipts/[id]/page.tsx`
- `src/components/receipt/receipt-detail.tsx`
- `src/app/receipts/actions.ts`

Implementation:
- Fetch receipt by id for current user.
- Show store, date, totals, item rows, and normalized prices.
- If `image_object_key` exists, call existing signed-view route and show image.
- Add delete receipt action.
- Delete R2 object before deleting receipt row.

Verification:
- Receipt detail loads for owner.
- Non-owner access is blocked by RLS/page logic.
- Image view works through signed URL.
- Receipt delete removes DB rows and R2 object.
- Run lint/build.

### Task 5: Build price comparison

Create or modify:
- `src/app/compare/page.tsx`
- `src/app/compare/actions.ts`
- `src/components/compare/compare-form.tsx`
- `src/components/compare/compare-result.tsx`

Implementation:
- User selects product and two stores.
- Call SQL function `compare_product_between_stores`.
- Display latest normalized price for each store.
- Show cheaper store only if both prices exist and units match.
- Show date and store name for each result.

Verification:
- Same product at two stores compares by normalized price.
- Tie-break uses purchase date then receipt creation date through SQL function.
- Missing data shows a clear empty state.
- Run lint/build.

### Task 6: Build product history

Create or modify:
- `src/app/products/[id]/history/page.tsx`
- `src/app/products/actions.ts`
- `src/components/products/price-history-table.tsx`

Implementation:
- Fetch product by id for current user.
- Call SQL function `get_product_price_history`.
- Show date, store, normalized unit price, quantity, and line total.
- A table is required; a chart is optional after the table works.

Verification:
- Product history includes multiple dates and stores.
- No external price data is used.
- Run lint/build.

### Task 7: Build splits

Create or modify:
- `src/app/splits/[id]/page.tsx`
- `src/app/splits/actions.ts`
- `src/components/splits/split-form.tsx`
- `src/components/splits/split-share-list.tsx`
- `src/app/api/users/search/route.ts`

Implementation:
- Search authenticated profiles for participants.
- Create even splits via `create_even_expense_split`.
- Create custom splits via `create_custom_expense_split`.
- Do not send payer as a participant.
- Show share rows.
- Mark shares settled via `mark_split_share_settled`.

Verification:
- Even split among payer plus 2 participants creates 2 share rows.
- Custom split validates payer share plus owed shares equals total.
- Payer never appears in `expense_split_shares`.
- Settled share gets `settled_at`.
- Run lint/build.

### Task 8: Build balances

Create or modify:
- `src/app/balances/page.tsx`
- `src/app/balances/actions.ts`
- `src/components/balances/balance-list.tsx`

Implementation:
- Call SQL function `get_current_balances`.
- Display debtor, creditor, and amount.
- Show empty state when no unsettled net balances exist.

Verification:
- Opposite-direction debts net into one row.
- Zero-net pairs are omitted.
- Settled shares disappear from active balances.
- Run lint/build.

### Task 9: Final demo polish

Create or modify:
- `src/app/dashboard/page.tsx`
- `README.md`
- Any small UI components needed for navigation.

Implementation:
- Add dashboard links to receipt creation, compare, balances.
- Add recent receipts summary if time permits.
- Keep styling consistent with existing slate/emerald palette.
- Update README with any new setup or demo steps.

Verification:
- A teacher can demo: login, create receipt, compare prices, view history,
  upload/view receipt image, create split, settle share, view balances.
- Run lint/build.

## 14. Recommended File Organization

Use this structure as the project grows:

```text
src/
  app/
    api/
    auth/
    balances/
    compare/
    dashboard/
    login/
    products/
    receipts/
    splits/
  components/
    balances/
    compare/
    products/
    receipt/
    splits/
    ui/
  lib/
    domain/
    supabase/
    env.ts
    r2.ts
```

Guidelines:
- Keep server actions near their route group.
- Keep reusable domain logic in `src/lib/domain`.
- Keep visual components under `src/components`.
- Avoid large all-purpose files.
- Do not add a global state library for this project.

## 15. Testing and Verification Strategy

There is no full test framework configured yet. For now, every implementation
task must at least pass:

```bash
npm run lint
npm run build
```

Recommended next testing addition:
- Add Vitest for pure domain helpers such as unit normalization and money
  formatting.

Do not add end-to-end testing until the core demo flows exist.

Manual acceptance checklist:
- Login works with GitHub.
- Protected pages reject unauthenticated users.
- Receipt creation works with multiple items.
- Unit normalization is correct.
- Price comparison uses normalized unit price.
- History uses receipt data only.
- R2 image upload stores only `image_object_key`.
- Receipt image view uses signed URL.
- Receipt delete deletes R2 image.
- Even split creates no payer share row.
- Custom split validates total math.
- Balances are netted by pair.
- Lint passes.
- Build passes.

## 16. Deployment Notes

Deploy to Vercel.

Vercel environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `CLOUDFLARE_R2_ACCOUNT_ID`
- `CLOUDFLARE_R2_ACCESS_KEY_ID`
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `CLOUDFLARE_R2_BUCKET`

Supabase configuration:
- Enable GitHub OAuth provider.
- Add local callback URL:

```text
http://localhost:3000/auth/callback
```

- Add deployed callback URL:

```text
https://<vercel-domain>/auth/callback
```

Cloudflare R2 configuration:
- Use a private bucket for real receipt images.
- Create S3-compatible access keys.
- Configure CORS for local and deployed origins.
- Allow `PUT` and `GET`.
- Allow image content types used by the app.

## 17. AI Agent Operating Instructions

When another AI agent works on this repo:

1. Read `PECS.md`, `AGENTS.md`, `README.md`, and `supabase/schema.sql`.
2. Check `git status --short` before editing.
3. Do not overwrite user changes.
4. Keep changes small and tied to one task.
5. Use the schema functions instead of duplicating split/price logic in app code.
6. Never put R2 secrets in client components.
7. Never store image binaries in Postgres.
8. Do not add out-of-scope features.
9. Run `npm run lint`.
10. Run `npm run build`.
11. Summarize changed files and verification.

Preferred commit style:

```text
feat: add receipt creation
feat: add price comparison
feat: add receipt splitting
fix: correct R2 image delete
docs: expand Spendly implementation spec
```

## 18. Known Current Gaps

The base project is intentionally not feature-complete yet.

Missing application features:
- Receipt create form.
- Receipt detail page.
- Receipt delete with R2 delete.
- Compare page.
- Product history page.
- Split create/detail pages.
- Balances page.
- User search route.
- Domain helper tests.
- Deployed Supabase/R2/Vercel environment configuration.

Existing foundation:
- Base Next.js app.
- Supabase auth route scaffolding.
- Supabase SSR clients.
- R2 presigned upload/view routes.
- Complete SQL schema.
- Project prompt and skill docs.
- Landing, login, dashboard shell.

## 19. Definition of Done

Spendly is complete for the school project when:

- A fresh clone can install dependencies with `npm install`.
- `.env.local` can be created from `.env.example`.
- Supabase schema can be created from `supabase/schema.sql`.
- GitHub login works.
- Receipt CRUD works.
- Receipt image upload/view/delete works through R2.
- Product comparison works with normalized unit prices.
- Product history works from receipt data.
- Splits work for receipt-level and item-level costs.
- Balances are netted per user pair.
- `npm run lint` passes.
- `npm run build` passes.
- The app is deployed on Vercel with required environment variables.

