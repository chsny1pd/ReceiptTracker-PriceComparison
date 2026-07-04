# Spendly TODO

This roadmap is ordered for fastest working school demo.

## Phase 0: Project Setup

- [x] Clone GitHub repository.
- [x] Scaffold Next.js App Router project.
- [x] Add TypeScript and Tailwind CSS.
- [x] Add Supabase dependencies.
- [x] Add R2 dependencies.
- [x] Add `.env.example`.
- [x] Add complete Supabase schema.
- [x] Add project prompts and skill docs.
- [x] Verify `npm run lint`.
- [x] Verify `npm run build`.

## Phase 1: Live Service Setup

- [ ] Create Supabase project.
- [ ] Enable GitHub OAuth provider.
- [ ] Add local callback URL: `http://localhost:3000/auth/callback`.
- [ ] Add production callback URL after Vercel deploy.
- [ ] Run `supabase/schema.sql` in Supabase SQL editor.
- [ ] Confirm all 7 core tables exist.
- [ ] Confirm RLS is enabled on all app tables.
- [ ] Create Cloudflare R2 private bucket.
- [ ] Create R2 access key.
- [ ] Configure R2 CORS for local and production origins.
- [ ] Add env vars to `.env.local`.
- [ ] Add env vars to Vercel.

## Phase 2: Auth Demo

- [ ] Add login error display for `/login?error=oauth`.
- [ ] Add sign-out route/action.
- [ ] Add sign-out button on dashboard.
- [ ] Verify GitHub login creates `profiles` row.
- [ ] Verify unauthenticated `/dashboard` redirects to `/login`.
- [ ] Verify authenticated `/dashboard` renders user identity.

## Phase 3: Receipt CRUD

- [ ] Create `/receipts/new`.
- [ ] Build store create/select UI.
- [ ] Build product create/select UI.
- [ ] Build receipt header fields: store, purchase date, subtotal, tax, total, notes.
- [ ] Build repeatable receipt item editor.
- [ ] Add unit select: `g`, `kg`, `ml`, `l`, `each`.
- [ ] Add client-side normalized price preview.
- [ ] Add server action or route for receipt creation.
- [ ] Insert receipt and items in one transaction-like flow.
- [ ] Add `/receipts/[id]`.
- [ ] Show receipt header and item table.
- [ ] Add receipt delete action.
- [ ] Verify receipt item trigger computes normalized fields.

## Phase 4: R2 Image Upload UI

- [ ] Add image picker to receipt form.
- [ ] Call `POST /api/receipt-images/presign`.
- [ ] Upload file directly to returned R2 URL.
- [ ] Store `objectKey` on receipt create.
- [ ] Show receipt image preview on detail page.
- [ ] Add R2 object delete when receipt deleted.
- [ ] Verify DB stores only `image_object_key`, not binary image data.

## Phase 5: Price Comparison

- [ ] Create `/compare`.
- [ ] Add product selector.
- [ ] Add Store A and Store B selectors.
- [ ] Call `compare_product_between_stores` RPC.
- [ ] Show price cards for both stores.
- [ ] Show latest purchase date and source receipt link.
- [ ] Show cheaper store based on `normalized_unit_price`.
- [ ] Add empty state when one store lacks data.
- [ ] Verify latest tie-breaker: `purchased_at desc`, `created_at desc`, `line_number asc`.

## Phase 6: Product History

- [ ] Create `/products/[id]/history`.
- [ ] Call `get_product_price_history` RPC.
- [ ] Render line chart.
- [ ] Render accessible table below chart.
- [ ] Add store/date/price tooltip.
- [ ] Add empty state when no history exists.
- [ ] Verify data comes only from receipts.

## Phase 7: Splits

- [ ] Create split UI from receipt detail.
- [ ] Let user choose whole receipt or line item.
- [ ] Add user search from `profiles`.
- [ ] Add even split flow.
- [ ] Add custom split flow.
- [ ] Call `create_even_expense_split` RPC.
- [ ] Call `create_custom_expense_split` RPC.
- [ ] Create `/splits/[id]`.
- [ ] Show payer, participants, owed amounts, settlement status.
- [ ] Verify payer never gets `expense_split_shares` row.

## Phase 8: Balances

- [ ] Create `/balances`.
- [ ] Call `get_current_balances` RPC.
- [ ] Show netted balance list.
- [ ] Hide zero-net pairs.
- [ ] Add mark-settled action through `mark_split_share_settled`.
- [ ] Verify opposing debts collapse into one row.

## Phase 9: Quality and Demo Polish

- [x] Add GitHub Actions workflow for lint/build.
- [x] Add seed/demo instructions.
- [x] Add loading states for async pages.
- [x] Add form validation summaries.
- [x] Add accessible chart table.
- [x] Test at 375px mobile width.
- [x] Test keyboard navigation.
- [x] Test no horizontal scroll.
- [x] Run `npm run lint`.
- [x] Run `npm run build`.
- [ ] Deploy to Vercel.

