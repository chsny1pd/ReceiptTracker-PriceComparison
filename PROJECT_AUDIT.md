# Spendly Project Audit

Audit date: 2026-07-04.

Scope audited:
- Current repository files.
- Next.js app scaffold.
- Supabase/R2 helper code.
- `supabase/schema.sql`.
- Documentation/prompt files.

## 1. Executive Summary

Spendly is currently a strong base scaffold, not a complete app. The foundation is correct for the fixed stack: Next.js App Router, TypeScript, Tailwind CSS, Supabase SSR helpers, R2 presigned URL scaffolding, and a complete database schema.

Biggest current gap: core product workflows are not implemented yet. Receipt CRUD, product/store UI, comparison UI, history UI, splits UI, and balances UI still need to be built.

Biggest technical risk: schema and route scaffolding have not been tested against a live Supabase/R2 environment in this repo. `npm run lint` and `npm run build` pass, but live integration remains unverified.

## 2. Current Repository Health

Positive:
- Clean Next.js scaffold.
- TypeScript strict mode enabled.
- ESLint configured.
- Build passes.
- Project docs now define scope clearly.
- Database schema is detailed and includes RLS.
- Secrets are documented through `.env.example`, not committed.

Concerns:
- No automated tests yet.
- No real feature forms yet.
- No generated Supabase TypeScript types.
- No local Supabase migration workflow.
- No CI workflow.
- R2 delete flow not implemented yet.

## 3. Architecture Audit

### 3.1 App Router Structure

Current implemented routes:
- `/`
- `/login`
- `/dashboard`
- `/auth/sign-in`
- `/auth/callback`
- `/api/receipt-images/presign`
- `/api/receipt-images/[receiptId]`

Assessment:
- Good minimal starting structure.
- Auth routes are server route handlers, which is correct.
- Dashboard is server-rendered and checks user auth.
- API routes correctly avoid client-side R2 credentials.

Needed:
- Group app routes under route groups later if the app grows:
  - `(public)`
  - `(app)`
  - `api`
- Keep this optional until route count grows.

### 3.2 Supabase Integration

Files:
- `src/lib/supabase/server.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/middleware.ts`
- `middleware.ts`

Assessment:
- Uses `@supabase/ssr`, correct for App Router.
- Middleware refreshes session.
- Server client handles cookie writes safely.

Risk:
- `getRequiredEnv` throws at runtime if env vars missing. This is fine for app startup/build with env set, but local developers need `.env.local`.
- Build currently passes because these env accessors are only invoked at request time.

### 3.3 R2 Integration

Files:
- `src/lib/r2.ts`
- `src/app/api/receipt-images/presign/route.ts`
- `src/app/api/receipt-images/[receiptId]/route.ts`

Assessment:
- Correct use of S3-compatible AWS SDK.
- Presigned upload keeps large files off Vercel server.
- Signed view URL keeps private bucket viable.
- Content type and max size validation exists.

Gaps:
- Delete receipt image route/action not implemented.
- Client upload UI not implemented.
- R2 CORS not verified.
- No server-side ownership check after upload because receipt creation not implemented yet.

## 4. Database Audit

Source:
- `supabase/schema.sql`

Tables:
- `profiles`
- `stores`
- `products`
- `receipts`
- `receipt_items`
- `expense_splits`
- `expense_split_shares`

Strengths:
- Meets 5+ relational table requirement.
- Product normalization included.
- Unit normalization enforced in DB trigger.
- Receipt/store/product ownership validated.
- Split payer/share invariant enforced.
- Netted balances implemented as derived function, not stored table.
- RLS enabled on all app tables.

Risks:
- SQL has not been executed against Supabase from this repo during this audit.
- `create_even_expense_split` rounds shares to 2 decimals. Small rounding remainder stays implicit in payer share. This is acceptable for school scope but should be documented in UI.
- Current split validation assumes payer is creator and receipt owner. This is simple and good for v1, but it means another user cannot pay for a receipt owned by someone else.
- `profiles_select_authenticated` allows authenticated users to list profiles. Acceptable for split participant search, but avoid exposing extra personal data later.

## 5. UX Audit

Current UI:
- Landing page is clear and simple.
- Login page is focused.
- Dashboard shell has useful action cards.

Strengths:
- No decorative clutter.
- Uses readable slate/emerald palette.
- Cards have restrained radius.
- CTA targets are touch-friendly.

Gaps:
- Links point to planned pages that do not exist yet: `/receipts/new`, `/compare`, `/balances`.
- No empty states beyond dashboard shell.
- No real forms.
- No chart/table accessibility yet.
- No loading/error UI yet for auth or R2.

Recommendation:
- Build receipt create flow first, because comparison/history/splits depend on receipt data.

## 6. Security Audit

Good:
- R2 credentials server-only.
- Auth required for image presign route.
- Auth required for image view route.
- Image view route checks receipt ownership.
- RLS exists in schema.

Concerns:
- No rate limiting on presign endpoint.
- No malware scanning for images; acceptable for school scope.
- No server action yet for receipt creation, so end-to-end ownership still untested.
- No CSRF-specific handling; App Router route handlers with same-site auth cookies and RLS reduce risk, but mutating route design should stay careful.

Must preserve:
- Never expose `CLOUDFLARE_R2_SECRET_ACCESS_KEY`.
- Never store image binary data in Postgres.
- Never trust `owner_user_id` from client payload.

## 7. Build/Test Audit

Known passing:

```bash
npm run lint
npm run build
```

Missing:
- Unit tests for unit normalization display helpers.
- Integration tests for API routes.
- E2E smoke tests for auth and receipt creation.
- SQL execution test or Supabase migration check.

Recommended next tests:
- Add Vitest for pure helpers when helpers exist.
- Add Playwright after first receipt flow exists.
- Add GitHub Actions for lint/build.

## 8. Documentation Audit

Now present:
- `README.md`
- `SPECS.md`
- `DESIGN.md`
- `PROJECT_AUDIT.md`
- `TODO.md`
- `AGENTS.md`
- `CLAUDE.md`
- `.codex/skills/spendly/SKILL.md`
- `docs/prompts/spendly-system-prompt.md`

Assessment:
- Good AI handoff coverage.
- Specs should be updated whenever schema/API behavior changes.

## 9. Highest Priority Risks

1. Missing receipt CRUD.
   - Impact: app cannot demonstrate core value.
   - Fix: build `/receipts/new` and receipt detail next.

2. Missing live Supabase verification.
   - Impact: schema/RLS may fail only at integration time.
   - Fix: run `supabase/schema.sql` in real Supabase project and test login.

3. Missing comparison/history UI.
   - Impact: price-comparison requirement not demoable.
   - Fix: build after receipt CRUD seeds data.

4. Missing split/balance UI.
   - Impact: expense split requirement not demoable.
   - Fix: build after receipt detail page.

5. No tests/CI.
   - Impact: easy to regress during fast school-project development.
   - Fix: add GitHub Actions lint/build soon.

## 10. Recommended Build Order

1. Live Supabase setup and schema verification.
2. Receipt CRUD.
3. Product/store creation inside receipt flow.
4. Price comparison.
5. Product history.
6. R2 upload UI.
7. Split creation.
8. Netted balances.
9. CI and demo polish.

