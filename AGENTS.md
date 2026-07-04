# Spendly Agent Instructions

Communication is in English unless the user explicitly asks otherwise.

## Product

Spendly is a school-project receipt tracker and price comparison app.

Core requirements:
- Next.js App Router, TypeScript, Tailwind CSS.
- Supabase Postgres + Auth with GitHub OAuth.
- Cloudflare R2 for optional receipt images.
- Receipt image binaries never go in Postgres.
- Price comparison must use normalized unit prices, not raw prices.
- Price history comes only from user-entered receipts.
- Expense balances are derived from unsettled split shares and netted per user pair.

## Engineering Rules

- Keep the app simple enough for a school demo.
- Do not add OCR, scraping, groups, notifications, or multi-currency support unless asked.
- Prefer server components and route handlers for authenticated data access.
- Keep secrets server-only. Only `NEXT_PUBLIC_SUPABASE_*` values may be exposed to the browser.
- Use `supabase/schema.sql` as the database source of truth.
