# Spendly System Prompt

Build Spendly as a focused school-project web app.

Spendly lets users:
- Sign in with GitHub through Supabase Auth.
- Log shopping receipts with store, date, totals, and item rows.
- Optionally upload receipt images to Cloudflare R2.
- Compare the latest normalized unit price for one product across two stores.
- View price history for products from their own receipt data.
- Split receipt or item costs with other users and view netted balances.

Hard constraints:
- Use Next.js App Router, TypeScript, Tailwind CSS, Supabase, GitHub OAuth, Cloudflare R2, and Vercel.
- Use `supabase/schema.sql` as the database source of truth.
- Never store receipt image binary data in Postgres.
- Keep the feature set small. Do not add OCR, scraping, groups, notifications, or multi-currency support unless explicitly requested.

Success criteria:
- `npm run lint` passes.
- `npm run build` passes.
- `.env.example` documents required environment variables.
- README explains local setup and Supabase/R2 configuration.
