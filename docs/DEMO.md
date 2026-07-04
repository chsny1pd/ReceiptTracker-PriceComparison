# Spendly Demo Guide

Use this script for a school-project walkthrough. All prices come from receipts you enter manually.

## Prerequisites

- `.env.local` configured and `/setup` shows **Connected** for Supabase and R2
- GitHub OAuth enabled in Supabase
- `supabase/schema.sql` applied
- Two GitHub accounts if you want to demo splits and balances

## Suggested Demo Data

Create these once before presenting:

| Store | Product | Example use |
|-------|---------|---------------|
| Fresh Market | Milk (volume) | History + compare |
| Value Grocery | Milk (volume) | Compare cheaper store |
| Fresh Market | Rice (mass) | Unit normalization |

Then log receipts like:

1. Fresh Market, Milk, 2 L, line total $4.80, date: 2026-06-01
2. Value Grocery, Milk, 2 L, line total $4.20, date: 2026-06-15
3. Fresh Market, Milk, 2 L, line total $4.50, date: 2026-07-01
4. Fresh Market, Rice, 5 kg, line total $9.50, date: 2026-07-02

Optional: attach a receipt image on one entry to show R2 upload.

## 5-Minute Demo Flow

1. **Sign in** at `/login` with GitHub.
2. **Dashboard** at `/dashboard` — point out receipt, compare, balances, setup links.
3. **Log a receipt** at `/receipts/new`
   - Quick-add store/product if needed
   - Show normalized unit price preview on line items
   - Optional image upload
4. **Receipt detail** at `/receipts/[id]`
   - Line items with normalized prices
   - Link to product history
5. **Compare** at `/compare`
   - Product: Milk
   - Store A vs Store B
   - Show cheaper store from normalized unit price
6. **Product history** at `/products/[id]/history`
   - Line chart + accessible table from receipt data only
7. **Split** from receipt detail (second GitHub account required)
   - Even or custom split
   - Open `/splits/[id]` and show payer vs participants
8. **Balances** at `/balances`
   - Netted “You owe / owes you” cards
   - Mark a share settled and refresh

## What To Say About Architecture

- Postgres stores receipt metadata only; images live in Cloudflare R2
- Product normalization enables fair `$ / kg` or `$ / L` comparison
- Balances are derived from unsettled split shares, netted per user pair
- No external price scraping; history is receipt-derived only

## Production Deploy Checklist (Vercel)

1. Push repository to GitHub
2. Import project in Vercel
3. Add all env vars from `.env.example`
4. Supabase Auth → add production callback:
   `https://<your-vercel-domain>/auth/callback`
5. R2 CORS → add production origin:
   `https://<your-vercel-domain>`
6. Redeploy and run through this demo flow on production

## Troubleshooting

| Issue | Fix |
|-------|-----|
| GitHub login fails | Enable GitHub provider in Supabase |
| Image upload fetch error | Add R2 CORS for your localhost/production origin |
| No participants for split | Second user must sign in once to create a `profiles` row |
| Compare empty for one store | Log a receipt for that store and product first |
