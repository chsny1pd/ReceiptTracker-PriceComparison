# Spendly Product and Technical Specification

## 1. Product Definition

Spendly is a full-stack web app for a school project. It helps users compare prices before buying, log receipts after buying, review receipt-derived price insights, split shared costs, configure how they receive money, and settle debts with payment proof.

Spendly supports two equal first-class daily workflows:
- Compare-first: decide what to buy now.
- Receipt-first: log what was bought quickly and reliably.

Spendly is not a public price crawler. Saved price insights and history come only from user-entered receipt data. Manual compare remains available for pre-purchase decisions.

## 2. Success Criteria

Spendly is successful when a grader can:
- Sign in with GitHub.
- Reach a dashboard that clearly exposes both compare and receipt workflows.
- Run a quick manual compare before buying.
- Turn a compare result into a receipt draft.
- Save and resume receipt drafts across devices.
- Create a final receipt with store, date, totals, items, and optional images.
- View receipt-derived price history and receipt-derived compare insights.
- Create a split from a receipt or line item.
- See balances inside the Splits area, netted from unsettled or unconfirmed shares.
- Configure receiving payment methods, including optional QR image uploads.
- Submit a payment slip for a share and have the receiver confirm or reject it.
- Verify that images live in Cloudflare R2 and Postgres stores metadata only.

## 3. Fixed Technology

Do not replace these technologies:
- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase Postgres
- Supabase Auth with GitHub OAuth
- Cloudflare R2 object storage
- Vercel deployment

## 4. Non-Goals

Do not build these unless requested later:
- OCR scanning
- External price scraping
- Store API integration
- Persistent household/group model
- Push/email notifications
- Multi-currency support
- Item-level tax allocation
- Inventory management
- Budget planning
- Public social sharing

## 5. Product Structure

Authenticated users land on `/dashboard`.

Top-level app navigation:
- `/dashboard`
- `/compare`
- `/receipts`
- `/splits`
- `/settings`

Navigation responsibilities:
- Dashboard: operational home for both primary workflows and pending actions.
- Compare: manual compare plus receipt-derived insights.
- Receipts: final receipts plus visible draft management.
- Splits: debt, balances, payment proof, and settlement review.
- Settings: theme, language, profile, payment methods, QR uploads.

`/balances` is no longer a primary destination. It may remain as a compatibility route or redirect, but balances belong under Splits.

## 6. Auth and Ownership

Supabase Auth owns authentication. Spendly mirrors users into `public.profiles`.

Requirements:
- Only authenticated users access private app data.
- Server routes must call `supabase.auth.getUser()` before protected work.
- RLS stays enabled on all app tables.
- Never trust client-supplied ownership fields.
- R2 server credentials must never reach the browser.
- Split participants may view source receipts and receipt/item images for splits they are involved in, but source receipt edits remain owner-only.

## 7. Database Source of Truth

Database source file:

```text
supabase/schema.sql
```

The schema includes:
- Core product tables for profiles, stores, products, receipts, receipt items, splits, and split shares.
- Draft storage separate from final receipts.
- User payment methods with optional QR image metadata.
- Share payment proof metadata.
- RLS policies and helper functions for visibility, proof submission, and proof review.

## 8. Core Data Model

### 8.1 Final Receipts

Final receipt data remains relational:
- `receipts`
- `receipt_items`

Final receipts are the only source of:
- receipt-derived store comparison
- saved price insights
- price history

### 8.2 Receipt Drafts

Drafts must stay separate from final receipts.

Table:
- `receipt_drafts`

Behavior:
- owned by one user
- stores a draft payload as JSON
- payload includes an explicit user-edited draft title / item name for resume UX
- can be autosaved locally and server-backed
- can be resumed, updated, discarded, or finalized into a real receipt
- must not appear in saved price history, saved insights, balances, or split logic

### 8.3 Payment Methods

Users can configure multiple receiving payment methods.

Table:
- `user_payment_methods`

Fields include:
- label
- provider name
- account name
- account reference
- promptpay id
- optional QR image object key
- optional note
- one default method per user

Visibility:
- owner always
- other authenticated users only when they currently owe the owner and need the selected method for payment

### 8.4 Split Share Status

Each `expense_split_shares` row has a payment lifecycle status:
- `unpaid`
- `submitted`
- `confirmed`
- `rejected`

Supporting timestamps:
- `payment_submitted_at`
- `payment_confirmed_at`
- `payment_rejected_at`
- existing `settled_at` remains the final settlement timestamp and is set when confirmed

Balance derivation uses only shares that are not yet confirmed.

### 8.5 Share Payment Proofs

Payment slips are stored as metadata rows plus R2 object keys.

Table:
- `share_payment_proofs`

Fields include:
- `share_id`
- `uploader_user_id`
- `receiver_user_id`
- `image_object_key`
- optional note
- review status
- review timestamps

One share may have many proof submissions.
The latest submission is treated as the active proof under review.

Visibility:
- uploader
- original receiver only

Review authority:
- original receiver only

## 9. Split and Payment Workflow

### 9.1 Split Creation

Supported:
- whole receipt split
- line item split
- even split
- custom split

Current invariant remains:
- payer never gets an `expense_split_shares` row
- split share rows represent only people who owe the payer

Detailed allocation behavior:
- the UI may collect one detailed split plan across many receipt items
- the first implementation may persist that plan as multiple item-level custom splits behind the scenes
- each generated split still follows the current invariant that only non-payer debtors receive `expense_split_shares` rows
- payer remainder is computed per item as `item total - participant allocations`

### 9.2 Payment Flow

Expected lifecycle:
1. Share starts as `unpaid`
2. Debtor views selected receiver payment method
3. Debtor uploads payment proof
4. Share becomes `submitted`
5. Receiver reviews latest proof
6. Receiver confirms or rejects
7. If confirmed, share becomes `confirmed` and stops contributing to balances
8. If rejected, share becomes `rejected` and debtor may submit a new proof later

Receiver-selected payment method:
- stored on `expense_splits.receiver_payment_method_id`
- defaults to receiver’s default method
- may be overridden per split

## 10. Compare and Receipt Workflow

### 10.1 Compare

`/compare` is the fast decision page:
- manual entry for pre-purchase comparison
- user enters candidate brands/options
- app compares normalized unit prices
- cheapest option can be added to a cart
- compare cart can become a receipt draft in one step
- do not dedicate page space to a low-value saved-insights side panel

### 10.2 Receipts

`/receipts` must show:
- final receipts
- visible draft receipts
- resume or discard actions for drafts

`/receipts/new` must support:
- explicit item / draft title field in receipt details
- local autosave
- server-backed autosave
- draft resume from visible draft list
- compare-to-receipt handoff

`/receipts/[id]` must support:
- normal full access for the receipt owner
- read-only source-receipt access for split participants who owe or review that receipt
- owner-only edit, delete, and split-creation controls

Receipt-first improvement priority:
- protect work first with autosave and resumption
- then streamline entry ergonomics

## 11. Image Upload Rules

Receipt images, item images, QR images, and payment slip images must:
- be stored in Cloudflare R2
- use Postgres metadata only
- never store image binaries in Postgres

Browser-side upload behavior:
- accept jpeg/png/webp input
- auto-compress only when needed
- resize or re-encode large images before upload
- skip recompression for already-small suitable files
- keep enough quality for receipt, QR, and payment-slip readability
- block upload with a clear error if compression fails and the file is still too large

## 12. Theme and Language

### 12.1 Theme

Spendly must support:
- light mode
- dark mode
- visible toggle
- system default with manual override
- persisted user choice

Dark mode must keep major pages readable and usable.

### 12.2 Language

Spendly must support:
- English
- Thai
- visible in-app language switcher
- persisted user choice
- locale-neutral routes

Core navigation and major pages must support both languages.
Avoid scattering hardcoded user-facing strings throughout components.

## 13. Routes and Page Responsibilities

Implemented or required routes:
- `/`
- `/login`
- `/dashboard`
- `/compare`
- `/receipts`
- `/receipts/new`
- `/receipts/[id]`
- `/products/[id]/history`
- `/splits`
- `/splits/[id]`
- `/settings`
- `/auth/sign-in`
- `/auth/callback`
- `/auth/sign-out`

Upload and view routes may include:
- receipt image presign/view
- item image presign/view
- payment method QR presign/view
- share payment proof presign/view

## 14. API and Server Action Expectations

Server handlers should stay thin.

Prefer:
- existing split RPCs where they still fit
- database functions for proof submission/review when business rules are sensitive
- direct authenticated inserts/updates only where the logic is simple and still protected by RLS

New server-side behavior must cover:
- receipt draft save/load/delete/finalize
- payment method CRUD
- QR upload metadata flow
- detailed item-allocation split creation
- payment proof submission
- payment proof confirmation/rejection
- theme/language preference persistence if implemented server-side

## 15. UX Requirements

### Dashboard

Dashboard is action-first, not analytics-first.

It should prioritize:
- Quick Compare
- New Receipt
- Resume Draft
- Pending proof review
- Debts needing action

Secondary content may include:
- spending summary
- recent receipts
- recent saved insights

### Compare

Compare must feel operational:
- full-width quick compare flow
- clear compare -> cart -> receipt progression
- no filler side panel that distracts from the in-store decision task

### Receipts

Receipts must feel safe for rushed use:
- draft persistence
- visible resume path
- draft list labels based on explicit item / draft names, not store placeholders
- fewer chances to lose work

### Splits

Splits must clearly show:
- who owes whom
- current share status
- payment method to use
- proof submission state
- proof review actions
- item-level allocation when a receipt is shared in detail
- per-person totals and payer remainder before split creation
- a visually obvious payment-slip upload action, not only a plain file input

### Settings

Settings must include:
- theme
- language
- payment methods
- QR upload

## 16. Quality Gates

Run before handoff:

```bash
npm run lint
npm run build
```

Add targeted unit tests for new pure logic where practical.

Manual verification should cover:
- `/` renders
- `/login` renders
- auth redirect still works
- dashboard redirects unauthenticated users
- dashboard shows both primary workflow entry points
- compare dual-mode UX works
- compare-to-receipt handoff works
- receipt draft save/resume works
- theme toggle works and persists
- language toggle works and persists
- receipt image upload still works
- QR upload works
- payment slip upload works
- receiver can confirm or reject proof
- balances remain netted from non-confirmed shares
- unauthorized users cannot access private payment methods or proof images
- mobile layout works at 375px width
- dark mode keeps readable contrast

## 17. AI Implementation Rules

When another AI continues this project:
- read `AGENTS.md`, `SPECS.md`, `DESIGN.md`, `TODO.md`, and `supabase/schema.sql`
- do not change the tech stack
- do not add out-of-scope features
- keep Compare and Receipts as equal first-class workflows
- keep balances derived, not materialized
- keep RLS enabled
- keep image binaries out of Postgres
- keep route handlers and server actions thin
- update `SPECS.md` whenever behavior, data shape, access rules, or non-goals change

## 18. Diagrams

This section is the visual reference for the product. Keep every diagram in sync with `supabase/schema.sql` and the route list in Section 13 whenever either changes.

### 18.1 System Architecture

```mermaid
flowchart TB
    User((User / Browser))

    subgraph Next["Next.js App Router (Vercel)"]
        MW["middleware.ts\n(session refresh)"]
        RSC["Server Components\n(pages, layouts)"]
        RA["Server Actions\n(src/app/actions/*)"]
        API["Route Handlers\n(/api/*, /auth/*)"]
    end

    subgraph SB["Supabase"]
        Auth["Supabase Auth\n(GitHub OAuth)"]
        PG[("Postgres\nRLS-protected tables + RPCs")]
    end

    R2[("Cloudflare R2\nreceipt / item / QR / proof images")]
    GH[["GitHub OAuth"]]

    User -->|HTTPS| RSC
    User -->|form submit| RA
    User -->|fetch / upload| API
    RSC --> MW
    RA --> MW
    API --> MW
    MW -->|"auth.getUser()"| Auth
    Auth <-->|OAuth code exchange| GH
    RSC -->|"select (RLS)"| PG
    RA -->|"insert/update/RPC (RLS)"| PG
    API -->|"presigned PUT/GET"| R2
    PG -.->|"object_key metadata only"| API
```

### 18.2 Entity Relationship Diagram

```mermaid
erDiagram
    PROFILES ||--o{ STORES : owns
    PROFILES ||--o{ PRODUCTS : owns
    PROFILES ||--o{ RECEIPTS : owns
    PROFILES ||--o{ RECEIPT_DRAFTS : owns
    PROFILES ||--o{ USER_PAYMENT_METHODS : configures
    PROFILES ||--o{ EXPENSE_SPLITS : "creates / pays"
    PROFILES ||--o{ EXPENSE_SPLIT_SHARES : "owes as participant"
    PROFILES ||--o{ SHARE_PAYMENT_PROOFS : "uploads / reviews"

    STORES ||--o{ RECEIPTS : "sold at"
    RECEIPTS ||--o{ RECEIPT_ITEMS : contains
    PRODUCTS ||--o{ RECEIPT_ITEMS : "normalized as"

    RECEIPTS ||--o{ EXPENSE_SPLITS : "split from"
    RECEIPT_ITEMS |o--o{ EXPENSE_SPLITS : "optional line-item split"
    USER_PAYMENT_METHODS |o--o{ EXPENSE_SPLITS : "receiver method"

    EXPENSE_SPLITS ||--o{ EXPENSE_SPLIT_SHARES : has
    EXPENSE_SPLIT_SHARES ||--o{ SHARE_PAYMENT_PROOFS : "proof submissions"

    PROFILES {
        uuid id PK
        text github_username
        text display_name
        text avatar_url
    }
    STORES {
        uuid id PK
        uuid owner_user_id FK
        citext name
        text location
    }
    PRODUCTS {
        uuid id PK
        uuid owner_user_id FK
        citext name
        enum unit_category
        enum default_unit
    }
    RECEIPTS {
        uuid id PK
        uuid owner_user_id FK
        uuid store_id FK
        text title
        date purchased_at
        numeric subtotal
        numeric tax
        numeric total
        text image_object_key
    }
    RECEIPT_ITEMS {
        uuid id PK
        uuid receipt_id FK
        uuid product_id FK
        int line_number
        text raw_name
        numeric quantity
        enum unit
        numeric normalized_quantity
        enum normalized_unit
        numeric line_total
        numeric normalized_unit_price
        text image_object_key
    }
    RECEIPT_DRAFTS {
        uuid id PK
        uuid owner_user_id FK
        text title
        text source
        jsonb payload
    }
    USER_PAYMENT_METHODS {
        uuid id PK
        uuid owner_user_id FK
        text label
        text provider_name
        text promptpay_id
        text qr_image_object_key
        bool is_default
    }
    EXPENSE_SPLITS {
        uuid id PK
        uuid receipt_id FK
        uuid receipt_item_id FK
        uuid created_by_user_id FK
        uuid payer_user_id FK
        uuid receiver_payment_method_id FK
        enum split_method
        numeric total_amount
    }
    EXPENSE_SPLIT_SHARES {
        uuid id PK
        uuid split_id FK
        uuid participant_user_id FK
        numeric owed_amount
        enum share_status
        uuid latest_payment_proof_id FK
        timestamptz settled_at
    }
    SHARE_PAYMENT_PROOFS {
        uuid id PK
        uuid share_id FK
        uuid uploader_user_id FK
        uuid receiver_user_id FK
        text image_object_key
        enum review_status
        timestamptz reviewed_at
    }
```

### 18.3 Site Map

```mermaid
flowchart LR
    Root["/"] --> Login["/login"]
    Login -->|GitHub OAuth| Dashboard["/dashboard"]

    Dashboard --> Compare["/compare"]
    Dashboard --> Receipts["/receipts"]
    Dashboard --> Splits["/splits"]
    Dashboard --> Settings["/settings"]

    Compare -->|"add to cart -> draft"| ReceiptNew["/receipts/new"]
    Receipts --> ReceiptNew
    Receipts --> ReceiptDetail["/receipts/[id]"]
    ReceiptDetail --> ProductHistory["/products/[id]/history"]
    ReceiptDetail -->|create split| Splits

    Splits --> SplitDetail["/splits/[id]"]
    SplitDetail -->|"source receipt (read-only)"| ReceiptDetail

    Settings -->|payment methods + QR| Settings

    Balances["/balances (compat redirect)"] -.-> Splits
```

### 18.4 Authentication Sequence

```mermaid
sequenceDiagram
    actor U as User
    participant B as Browser
    participant MW as middleware.ts
    participant SA as Supabase Auth
    participant GH as GitHub OAuth
    participant DB as Postgres

    U->>B: Click "Continue with GitHub"
    B->>SA: signInWithOAuth(github)
    SA->>GH: Redirect to authorize
    GH-->>U: Consent screen
    U->>GH: Approve
    GH-->>B: Redirect to /auth/callback?code=...
    B->>SA: exchangeCodeForSession(code)
    SA-->>B: Set session cookies
    SA->>DB: trigger handle_new_user() upserts profiles
    B->>MW: Next request with session cookie
    MW->>SA: auth.getUser()
    SA-->>MW: user
    MW-->>B: allow, continue to /dashboard
```

### 18.5 Receipt Draft Lifecycle

```mermaid
stateDiagram-v2
    [*] --> LocalDraft: user starts typing
    LocalDraft --> LocalDraft: local autosave (debounced)
    LocalDraft --> ServerDraft: server-backed autosave succeeds
    ServerDraft --> ServerDraft: edit / resume across devices
    ServerDraft --> Finalized: finalize into receipt + receipt_items
    ServerDraft --> Discarded: user discards draft
    LocalDraft --> Discarded: user discards before sync
    Finalized --> [*]
    Discarded --> [*]

    note right of Finalized
        Only finalized receipts count
        toward price history, saved
        insights, and splits.
    end note
```

### 18.6 Compare → Cart → Receipt Draft Flow

```mermaid
sequenceDiagram
    actor U as User
    participant C as /compare
    participant Cart as Compare Cart (client state)
    participant RA as Server Action (drafts.ts)
    participant DB as Postgres

    U->>C: Select product + Store A + Store B
    C->>DB: compare_product_between_stores() RPC
    DB-->>C: normalized unit prices per store
    C-->>U: Show cheaper option
    U->>Cart: Add cheapest item to cart
    U->>Cart: Repeat for more products
    U->>C: "Turn cart into receipt draft"
    C->>RA: createDraftFromCompareCart(cartItems)
    RA->>DB: insert into receipt_drafts (payload = cart)
    DB-->>RA: draft id
    RA-->>U: redirect to /receipts/new?draft=<id>
```

### 18.7 Split Creation Flow

```mermaid
sequenceDiagram
    actor U as Payer
    participant R as /receipts/[id]
    participant RA as Server Action (splits.ts)
    participant DB as Postgres

    U->>R: Choose "Split this receipt / item"
    U->>R: Pick split type (even / custom / detailed items)
    R->>RA: createSplit(receiptId, participants, allocations)
    alt even split
        RA->>DB: create_even_expense_split() RPC
    else custom split
        RA->>DB: create_custom_expense_split() RPC
    else detailed item allocation
        RA->>DB: create_detailed_expense_splits() RPC
    end
    DB->>DB: validate_expense_split() / validate_expense_split_share()
    DB-->>RA: expense_splits + expense_split_shares rows
    RA-->>U: redirect to /splits/[id]

    Note over DB: Payer never receives an\nexpense_split_shares row.
```

### 18.8 Payment Proof Submission & Review

```mermaid
sequenceDiagram
    actor D as Debtor
    actor Rcv as Receiver
    participant S as /splits/[id]
    participant API as /api/payment-proofs/presign
    participant R2 as Cloudflare R2
    participant RA as Server Action (payment-proofs.ts)
    participant DB as Postgres

    D->>S: View receiver's selected payment method
    D->>API: Request presigned upload URL
    API-->>D: Presigned PUT URL
    D->>R2: PUT payment slip image
    D->>RA: submitPaymentProof(shareId, imageObjectKey)
    RA->>DB: submit_share_payment_proof() RPC
    DB->>DB: share_status -> submitted,\npayment_submitted_at = now()
    DB-->>RA: proof row
    RA-->>D: confirmation

    Rcv->>S: Open pending proof review
    S->>API: Request presigned view URL for proof image
    API->>R2: GET (presigned)
    R2-->>Rcv: Image preview
    Rcv->>RA: reviewProof(proofId, decision)
    RA->>DB: review_share_payment_proof() RPC
    alt confirmed
        DB->>DB: share_status -> confirmed,\nsettled_at = now()
    else rejected
        DB->>DB: share_status -> rejected
    end
    DB-->>Rcv: updated share status
```

### 18.9 Split Share Status State Machine

```mermaid
stateDiagram-v2
    [*] --> unpaid
    unpaid --> submitted: debtor uploads payment proof
    submitted --> confirmed: receiver confirms proof
    submitted --> rejected: receiver rejects proof
    rejected --> submitted: debtor submits new proof
    confirmed --> [*]: excluded from balances

    note right of confirmed
        get_current_balances() only
        nets shares that are not
        yet confirmed.
    end note
```

### 18.10 Image Upload Pattern (generic)

Receipt, item, QR, and payment-proof images all follow the same presign pattern; only the route and ownership check differ.

```mermaid
sequenceDiagram
    actor U as User (owner or authorized viewer)
    participant Page as App Page
    participant API as /api/*/presign route
    participant DB as Postgres (RLS check)
    participant R2 as Cloudflare R2

    Note over Page: Upload path
    U->>Page: Select image file
    Page->>Page: Compress/resize if needed (client-image.ts)
    Page->>API: Request presigned PUT (object key)
    API->>DB: auth.getUser() + ownership/visibility check
    DB-->>API: authorized
    API-->>Page: Presigned PUT URL
    Page->>R2: PUT compressed image
    Page->>DB: Save object_key metadata (server action)

    Note over Page: View path
    U->>API: Request presigned GET for object_key
    API->>DB: auth.getUser() + can_view_* check
    DB-->>API: authorized / denied
    API-->>Page: Presigned GET URL or 403
    Page->>R2: GET image via presigned URL
```

### 18.11 Balance Derivation

```mermaid
flowchart LR
    ES[(expense_splits)] --> ESS[(expense_split_shares)]
    ESS -->|"filter: share_status != confirmed"| Unsettled["Unsettled shares"]
    Unsettled -->|"group by participant_user_id, payer_user_id"| Netting["Net per user pair"]
    Netting --> GCB["get_current_balances() RPC"]
    GCB --> Splits["/splits balances panel"]
    GCB --> Dashboard["/dashboard debts widget"]

    style ES fill:#f1f5f9,stroke:#475569
    style ESS fill:#f1f5f9,stroke:#475569
```

### 18.12 Data Ownership & Access Boundaries

```mermaid
flowchart TB
    subgraph Owner["Receipt Owner"]
        O1["Full CRUD on own\nreceipts/items/drafts"]
        O2["Create/manage splits\nfrom own receipts"]
    end

    subgraph Participant["Split Participant (non-owner)"]
        P1["Read-only source receipt\n+ receipt/item images"]
        P2["Submit payment proof"]
        P3["View receiver payment method\n(only while owing)"]
    end

    subgraph Receiver["Split Receiver / Payer"]
        RC1["Confirm/reject payment proof"]
        RC2["View own payment methods\nand QR always"]
    end

    Receipt[("receipts / receipt_items")]
    Split[("expense_splits / expense_split_shares")]
    Proof[("share_payment_proofs")]
    PM[("user_payment_methods")]

    O1 --> Receipt
    O2 --> Split
    P1 -.->|RLS: can_access_receipt| Receipt
    P2 --> Proof
    P3 -.->|RLS: can_view_payment_method| PM
    RC1 --> Proof
    RC2 --> PM
```
