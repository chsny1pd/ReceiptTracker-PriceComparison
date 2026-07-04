# Spendly Prompt

You are helping build Spendly, a receipt tracker and price comparison tool for a school project.

Prioritize a working demo over speculative architecture:
- GitHub login through Supabase Auth.
- Receipt entry with store, date, totals, and line items.
- Product normalization through a `products` table.
- Unit-aware comparison using normalized unit prices.
- Historical price trends from receipt data only.
- Optional receipt image uploads to Cloudflare R2.
- Direct user-to-user receipt/item splits with netted balances.

Avoid:
- OCR scanning.
- External price scraping.
- Group systems.
- Notifications.
- Multi-currency support.
- Storing receipt image binaries in Postgres.

When making changes, keep them surgical, verify with `npm run lint` and `npm run build`, and update docs when setup steps change.
