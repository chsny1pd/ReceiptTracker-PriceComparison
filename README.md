# Spendly

Spendly is a school-project receipt tracker and price comparison app.

Users can log receipts, normalize item prices by unit, compare the latest price
for the same product across stores, view receipt-based price history, upload
receipt images to Cloudflare R2, and track netted who-owes-whom balances.

## Getting Started

Install dependencies:

```bash
npm install
```

Copy environment variables:

```bash
cp .env.example .env.local
```

Required services:

- Supabase project with GitHub OAuth enabled.
- Supabase SQL editor run with `supabase/schema.sql`.
- Cloudflare R2 bucket and S3-compatible access keys.
- R2 CORS allowing the Vercel/local app origin to `PUT` and `GET` receipt
  images.

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

- `src/app` - App Router pages and route handlers.
- `src/lib/supabase` - Supabase browser/server/middleware clients.
- `src/lib/r2.ts` - Cloudflare R2 S3-compatible client helpers.
- `supabase/schema.sql` - Complete Spendly database schema.
- `docs/prompts/spendly-system-prompt.md` - Project prompt.
- `.codex/skills/spendly/SKILL.md` - Project-specific skill notes.

## Verification

```bash
npm run lint
npm run build
```

## Scope

Spendly intentionally does not include OCR, external price scraping, groups,
notifications, or multi-currency support in the base project.

## Deploy

Deploy on Vercel and add the same environment variables from `.env.example`.
