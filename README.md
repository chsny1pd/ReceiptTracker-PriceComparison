# Spendly

Spendly is a school-project web app for receipt tracking, unit-normalized price comparison, receipt-based price history, optional receipt image uploads, and direct user-to-user expense splitting.

This repository is a base project. It already contains Next.js, Tailwind CSS, Supabase SSR auth helpers, Cloudflare R2 upload/view route scaffolding, project prompts, a project skill, and the complete Supabase schema.

## Current Status

Implemented app features:
- GitHub OAuth login and protected app shell.
- Receipt CRUD with store/product quick-add and optional R2 image upload.
- Unit-normalized price comparison across two stores.
- Product price history chart and accessible table.
- Expense splits (even/custom) and split detail page.
- Netted balances with mark-settled actions.
- Service health page at `/setup`.
- GitHub Actions CI for lint and build.

Demo walkthrough: see `docs/DEMO.md`.

Deploy target: Vercel with Supabase + R2 env vars and production OAuth/CORS URLs.

## Tech Stack

- Next.js `16.2.10`
- React `19.2.4`
- TypeScript
- Tailwind CSS `4`
- Supabase Postgres + Supabase Auth
- GitHub OAuth through Supabase Auth
- Cloudflare R2 through S3-compatible AWS SDK
- Vercel deployment target

## Local Setup

Install dependencies:

```bash
npm install
```

Create local env file:

```bash
cp .env.example .env.local
```

Fill values:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

CLOUDFLARE_R2_ACCOUNT_ID=
CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=
```

Run dev server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Supabase Setup

1. Create Supabase project.
2. Enable GitHub OAuth provider in Supabase Auth.
3. Add callback URL:

```text
http://localhost:3000/auth/callback
```

For production, also add:

```text
https://<vercel-domain>/auth/callback
```

4. Run `supabase/schema.sql` in Supabase SQL editor for a new project.

   For an existing database, run `supabase/rbac-migration.sql` instead, then promote your account:

   ```sql
   update public.profiles set role = 'admin' where github_username = 'YOUR_GITHUB_USERNAME';
   ```

5. Confirm tables exist:

```text
profiles
stores
products
receipts
receipt_items
expense_splits
expense_split_shares
```

## Cloudflare R2 Setup

1. Create private R2 bucket.
2. Create R2 API token/access key with object read/write permissions.
3. Add values to `.env.local` and Vercel env vars.
4. Configure CORS for local and production origins:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://<vercel-domain>"
    ],
    "AllowedMethods": ["GET", "PUT"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["etag"],
    "MaxAgeSeconds": 300
  }
]
```

Receipt image rule: never store image binary data in Postgres. Store only `receipts.image_object_key` and optionally `receipts.image_public_url` for demo/public buckets.

## Verification

Run:

```bash
npm run lint
npm run build
```

Expected result: both pass.

CI also runs on GitHub push/PR via `.github/workflows/ci.yml`.

## Deploy to Vercel

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Copy all variables from `.env.example` into Vercel project settings.
4. Add Supabase production callback URL and R2 production CORS origin.
5. Deploy, then verify `/setup` and run the flow in `docs/DEMO.md`.

## Important Files

```text
SPECS.md                              Full product and technical spec
DESIGN.md                             UX/UI and interaction design
PROJECT_AUDIT.md                      Current repository audit and risks
TODO.md                               Build roadmap
docs/DEMO.md                          Demo script and deploy checklist
.github/workflows/ci.yml              Lint/build CI
supabase/schema.sql                   Database source of truth
src/lib/supabase/server.ts            Supabase server client
src/lib/supabase/client.ts            Supabase browser client
src/lib/supabase/middleware.ts        Supabase session refresh middleware
src/lib/r2.ts                         Cloudflare R2 client helpers
src/app/api/receipt-images/presign    R2 upload presign endpoint
src/app/api/receipt-images/[id]       R2 signed view endpoint
```

## Scope Rules

Core:
- GitHub login.
- Receipt logging.
- Product normalization.
- Unit-aware price comparison.
- Receipt-derived historical trends.
- Optional R2 receipt image upload.
- Direct expense splits.
- Netted balances.

Out of scope unless explicitly requested:
- OCR receipt scanning.
- External price scraping.
- Persistent groups.
- Notifications.
- Multi-currency support.
- Tax allocation per item.
- Complex invite flow for users without accounts.

