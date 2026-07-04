# Spendly Design Specification

## 1. Design Goal

Spendly should feel like a practical student-built finance/productivity tool: clear, trustworthy, fast to scan, and easy to demo. The UI should prioritize receipt entry, comparison clarity, and balance status over decoration.

Avoid landing-page heaviness. The first screen can explain the product, but authenticated users should land in a working dashboard.

## 2. Design Principles

- Clarity over decoration.
- Dense but readable information.
- Mobile-first forms.
- Visible labels and clear errors.
- One primary action per screen.
- No emojis as structural icons.
- Use semantic colors: success/savings, danger, neutral.
- Do not rely on color alone.
- Keep card radius at 8px or less.
- Avoid cards inside cards.

## 3. Visual Language

Current base:
- Background: `bg-slate-100`
- Surface: `bg-white`
- Text primary: `text-slate-950`
- Text secondary: `text-slate-600`
- Primary action: `bg-slate-950 text-white`
- Accent: `emerald`
- Borders: `border-slate-300`

Recommended future design tokens:

```css
--spendly-bg: #f1f5f9;
--spendly-surface: #ffffff;
--spendly-text: #0f172a;
--spendly-muted: #475569;
--spendly-border: #cbd5e1;
--spendly-primary: #0f172a;
--spendly-accent: #047857;
--spendly-danger: #dc2626;
```

Typography:
- Current: Geist Sans and Geist Mono.
- Keep body text at 16px minimum.
- Use tabular numbers for prices, totals, quantities, and balances.
- Use short headings inside app panels, not hero-sized text.

## 4. Layout System

Breakpoints:
- 375px: small phone.
- 768px: tablet.
- 1024px: desktop layout begins.
- 1440px: wide desktop.

Container:
- `max-w-6xl` for dashboard/product pages.
- `px-4` or `px-6` mobile.
- More horizontal whitespace only on desktop.

Spacing:
- Use 4/8px rhythm.
- Common values: `gap-2`, `gap-3`, `gap-4`, `gap-6`, `py-8`.

Touch:
- Buttons and inputs minimum height: 44px.
- Clickable cards need clear hover/focus state.
- Use `cursor-pointer` on custom clickable controls.

## 5. Navigation

Initial simple nav:
- Landing: Sign in, Open dashboard.
- App dashboard: action cards to receipt entry, comparison, balances.

Future app nav:
- Desktop: top header or left sidebar.
- Mobile: top header with compact action list; avoid bottom nav until app has stable top-level sections.

Primary sections:
- Dashboard.
- Receipts.
- Compare.
- Balances.
- Settings.

Back behavior:
- Detail pages must link back to list/dashboard.
- Forms must warn before losing unsaved changes if multi-step draft support is added.

## 6. Page Designs

### 6.1 Landing Page `/`

Purpose:
- Explain Spendly in one screen.
- Send users to login/dashboard.

Current content:
- App name.
- Headline.
- Short description.
- Sign in link.
- Dashboard link.
- Receipt preview panel.

Improve later:
- Replace fake static preview with real recent receipt if authenticated.
- Add “built for school project” only if needed for presentation.

### 6.2 Login `/login`

Purpose:
- Start GitHub OAuth.

Requirements:
- One primary CTA: Continue with GitHub.
- Explain Supabase Auth and R2 briefly.
- Do not show username/password fields.
- If OAuth error query exists, show clear error.

### 6.3 Dashboard `/dashboard`

Purpose:
- Authenticated home.

Core sections:
- Header with app name and user identity.
- Quick actions.
- Recent receipts.
- Price watch/comparison shortcut.
- Balance summary.

Empty state:
- “No receipts yet.”
- Primary action: “Log first receipt.”

### 6.4 Receipt Create `/receipts/new`

Purpose:
- Let user enter receipt manually.

Recommended form sections:
1. Store.
2. Date and totals.
3. Line items.
4. Optional image.
5. Review.

Line item row fields:
- Product select/create.
- Raw item name.
- Quantity.
- Unit.
- Line total.
- Computed normalized unit price preview.

Validation:
- Store required.
- Date required.
- At least one item.
- Quantity > 0.
- Line total >= 0.
- Unit must match product category.

### 6.5 Receipt Detail `/receipts/[id]`

Purpose:
- Show receipt and actions.

Sections:
- Store/date/total summary.
- Image preview if available.
- Item table.
- Split actions.
- Delete receipt action.

Destructive action:
- Delete receipt requires confirmation.
- Delete should also remove R2 object if image exists.

### 6.6 Compare `/compare`

Purpose:
- Compare current price for one product at two stores.

Controls:
- Product select.
- Store A select.
- Store B select.
- Unit select only if needed.

Result:
- Two metric cards.
- Price per normalized unit.
- Purchase date.
- Source receipt link.
- Winner/cheaper store label.

Empty states:
- Product missing in one store.
- No receipt data yet.

### 6.7 Product History `/products/[id]/history`

Purpose:
- Show price trend over time.

UI:
- Line chart for trend.
- Accessible data table below.
- Filter by unit if applicable.

Chart rules:
- Axis includes unit, such as `$ / kg`.
- Tooltip shows store, date, price, receipt link.
- Empty chart state includes action to log receipt.

### 6.8 Split Detail `/splits/[id]`

Purpose:
- Show who owes what for one split.

UI:
- Payer.
- Split target: receipt or item.
- Method: even/custom.
- Participant share list.
- Settlement status.

Rules:
- Payer is not listed as debtor.
- Settled rows visually distinct.
- Mark settled button requires confirmation for clarity.

### 6.9 Balances `/balances`

Purpose:
- Show current netted balances.

UI:
- List of netted pairs.
- Direction: “You owe X” or “X owes you”.
- Amount.
- Link to underlying split detail if future drill-down exists.

Empty state:
- “No unsettled balances.”

## 7. Forms and Feedback

All forms:
- Visible labels.
- Helper text for complex fields.
- Inline error below field.
- Submit button loading state.
- Disabled button while submitting.
- Error summary for multi-error forms.

Receipt form:
- Use repeatable item rows.
- Add item button below list.
- Delete item button must be clearly secondary/destructive.
- Preserve input values after validation failure.

Image upload:
- Show accepted types: JPEG, PNG, WebP.
- Show max size: 5MB.
- Show upload progress if client implementation supports it.
- On success, show filename/key or preview.

## 8. Accessibility

Minimum:
- 4.5:1 contrast for normal text.
- Visible focus rings.
- Keyboard reachable controls.
- Semantic headings.
- Form labels connected to inputs.
- No color-only meaning.
- `aria-live="polite"` for toast/status messages.

Charts:
- Provide table alternative.
- Provide text summary of trend.
- Tooltips must not be hover-only.

Images:
- Receipt image preview alt text: “Uploaded receipt image for <store> on <date>”.
- Decorative images get empty alt.

## 9. Motion

Use motion lightly:
- 150-300ms transitions.
- Hover/focus state changes.
- Loading skeletons for async data over 300ms.
- Respect `prefers-reduced-motion`.

Avoid:
- Decorative animation loops.
- Layout-shifting animation.
- Blocking input during animation.

## 10. Data Display

Prices:
- Format to 2 decimals for display.
- Normalized unit price may need up to 4 decimals internally but display can round to 2-3 decimals.
- Always show unit: `$2.40 / l`, `$8.00 / kg`, `$0.35 / each`.

Dates:
- Use locale-aware date formatting.
- Keep raw DB date as ISO.

Balances:
- Use tabular numbers.
- Positive/negative alone is not enough; show wording.

## 11. Component Candidates

Create these when implementing feature UI:
- `AppShell`
- `PageHeader`
- `PrimaryButton`
- `SecondaryButton`
- `DangerButton`
- `EmptyState`
- `FormField`
- `MoneyInput`
- `UnitSelect`
- `ReceiptItemEditor`
- `ReceiptItemsTable`
- `PriceMetricCard`
- `BalanceRow`
- `ConfirmDialog`

Do not create component library too early. Extract components after at least two real usages or when file size becomes hard to follow.

## 12. UI Quality Checklist

Before shipping UI:
- No horizontal scroll at 375px.
- All buttons/inputs at least 44px high.
- Keyboard tab order matches visual order.
- Focus ring visible.
- Loading states exist for async submits.
- Empty states exist for no receipts, no compare data, no history, no balances.
- Errors explain fix.
- Destructive actions confirm first.
- Charts include table fallback.
- `npm run lint` passes.
- `npm run build` passes.

