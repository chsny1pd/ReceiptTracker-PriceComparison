---
name: spendly
description: Use when working on Spendly receipt tracking, unit-normalized price comparison, R2 receipt uploads, Supabase Auth, or expense splits.
---

# Spendly Project Skill

Use this skill for all Spendly implementation work.

## Product Rules

- The app name is Spendly.
- Use Next.js App Router, TypeScript, Tailwind CSS, Supabase, GitHub OAuth, Cloudflare R2, and Vercel.
- Keep the school-project scope small and demonstrable.
- Do not introduce external price scraping. Historical prices come only from receipts.
- Do not store image binaries in Postgres. Store only R2 object keys or public URLs.

## Data Rules

- `products` normalizes product identity across receipts.
- Receipt items store raw item text plus normalized quantity, normalized unit, and normalized unit price.
- Current price uses latest `receipts.purchased_at`, then latest `receipts.created_at`.
- Split share rows represent only people who owe the payer. Never add a payer share row.
- Balances are derived and netted per user pair. Do not create a stored balances table.

## Verification

Run before finishing:

```bash
npm run lint
npm run build
```
