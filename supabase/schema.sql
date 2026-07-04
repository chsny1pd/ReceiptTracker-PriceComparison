-- Spendly complete first-run SQL schema for Supabase Postgres.
-- Run this once in a new Supabase project after enabling GitHub OAuth.
-- Receipt images live in Cloudflare R2; Postgres stores only object keys/URLs.

begin;

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.spendly_unit_category as enum ('mass', 'volume', 'each');
create type public.spendly_unit as enum ('g', 'kg', 'ml', 'l', 'each');
create type public.spendly_split_method as enum ('even', 'custom');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  github_username text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  name citext not null,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_name_not_blank check (length(btrim(name::text)) > 0),
  constraint stores_owner_name_unique unique (owner_user_id, name)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  name citext not null,
  unit_category public.spendly_unit_category not null,
  default_unit public.spendly_unit not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_name_not_blank check (length(btrim(name::text)) > 0),
  constraint products_owner_name_unique unique (owner_user_id, name),
  constraint products_default_unit_matches_category check (
    (unit_category = 'mass' and default_unit = 'kg') or
    (unit_category = 'volume' and default_unit = 'l') or
    (unit_category = 'each' and default_unit = 'each')
  )
);

create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete restrict,
  purchased_at date not null,
  subtotal numeric(12, 2) not null,
  tax numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  image_object_key text,
  image_public_url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receipts_amounts_non_negative check (
    subtotal >= 0 and tax >= 0 and total >= 0
  ),
  constraint receipts_image_key_not_blank check (
    image_object_key is null or length(btrim(image_object_key)) > 0
  )
);

create table public.receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  line_number integer not null,
  raw_name text not null,
  quantity numeric(12, 3) not null,
  unit public.spendly_unit not null,
  normalized_quantity numeric(12, 3) not null,
  normalized_unit public.spendly_unit not null,
  line_total numeric(12, 2) not null,
  normalized_unit_price numeric(12, 4) not null,
  image_object_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint receipt_items_line_number_positive check (line_number > 0),
  constraint receipt_items_image_key_not_blank check (
    image_object_key is null or length(btrim(image_object_key)) > 0
  ),
  constraint receipt_items_raw_name_not_blank check (length(btrim(raw_name)) > 0),
  constraint receipt_items_quantity_positive check (quantity > 0),
  constraint receipt_items_line_total_non_negative check (line_total >= 0),
  constraint receipt_items_normalized_quantity_positive check (
    normalized_quantity > 0
  ),
  constraint receipt_items_unit_price_non_negative check (
    normalized_unit_price >= 0
  ),
  constraint receipt_items_receipt_line_unique unique (receipt_id, line_number)
);

create table public.expense_splits (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.receipts(id) on delete cascade,
  receipt_item_id uuid references public.receipt_items(id) on delete cascade,
  created_by_user_id uuid not null references public.profiles(id) on delete cascade,
  payer_user_id uuid not null references public.profiles(id) on delete cascade,
  split_method public.spendly_split_method not null,
  total_amount numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_splits_total_amount_positive check (total_amount > 0)
);

create table public.expense_split_shares (
  id uuid primary key default gen_random_uuid(),
  split_id uuid not null references public.expense_splits(id) on delete cascade,
  participant_user_id uuid not null references public.profiles(id) on delete cascade,
  owed_amount numeric(12, 2) not null,
  settled_at timestamptz,
  settled_by_user_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expense_split_shares_owed_amount_positive check (owed_amount > 0),
  constraint expense_split_shares_unique_participant unique (
    split_id,
    participant_user_id
  )
);

create index stores_owner_user_id_idx on public.stores(owner_user_id);
create index products_owner_user_id_idx on public.products(owner_user_id);
create index receipts_owner_user_id_idx on public.receipts(owner_user_id);
create index receipts_store_date_idx on public.receipts(
  store_id,
  purchased_at desc,
  created_at desc
);
create index receipt_items_receipt_id_idx on public.receipt_items(receipt_id);
create index receipt_items_product_unit_idx on public.receipt_items(
  product_id,
  normalized_unit
);
create index expense_splits_receipt_id_idx on public.expense_splits(receipt_id);
create index expense_splits_payer_user_id_idx on public.expense_splits(
  payer_user_id
);
create index expense_split_shares_split_id_idx on public.expense_split_shares(
  split_id
);
create index expense_split_shares_participant_settled_idx
  on public.expense_split_shares(participant_user_id, settled_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger stores_set_updated_at
before update on public.stores
for each row execute function public.set_updated_at();

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

create trigger receipts_set_updated_at
before update on public.receipts
for each row execute function public.set_updated_at();

create trigger receipt_items_set_updated_at
before update on public.receipt_items
for each row execute function public.set_updated_at();

create trigger expense_splits_set_updated_at
before update on public.expense_splits
for each row execute function public.set_updated_at();

create trigger expense_split_shares_set_updated_at
before update on public.expense_split_shares
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (
    id,
    github_username,
    display_name,
    avatar_url
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'user_name',
      new.raw_user_meta_data ->> 'preferred_username'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'user_name',
      new.email
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
  set
    github_username = excluded.github_username,
    display_name = excluded.display_name,
    avatar_url = excluded.avatar_url,
    updated_at = now();

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.spendly_unit_category_for_unit(
  p_unit public.spendly_unit
)
returns public.spendly_unit_category
language sql
immutable
set search_path = public
as $$
  select case
    when p_unit in ('g', 'kg') then 'mass'::public.spendly_unit_category
    when p_unit in ('ml', 'l') then 'volume'::public.spendly_unit_category
    else 'each'::public.spendly_unit_category
  end;
$$;

create or replace function public.set_receipt_item_normalized_fields()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_product_category public.spendly_unit_category;
  v_unit_category public.spendly_unit_category;
begin
  select unit_category
  into v_product_category
  from public.products
  where id = new.product_id;

  if v_product_category is null then
    raise exception 'product % does not exist', new.product_id
      using errcode = '23503';
  end if;

  v_unit_category = public.spendly_unit_category_for_unit(new.unit);

  if v_unit_category <> v_product_category then
    raise exception 'unit % does not match product category %',
      new.unit,
      v_product_category
      using errcode = '23514';
  end if;

  if new.unit = 'g' then
    new.normalized_quantity = round(new.quantity / 1000, 3);
    new.normalized_unit = 'kg';
  elsif new.unit = 'kg' then
    new.normalized_quantity = round(new.quantity, 3);
    new.normalized_unit = 'kg';
  elsif new.unit = 'ml' then
    new.normalized_quantity = round(new.quantity / 1000, 3);
    new.normalized_unit = 'l';
  elsif new.unit = 'l' then
    new.normalized_quantity = round(new.quantity, 3);
    new.normalized_unit = 'l';
  else
    new.normalized_quantity = round(new.quantity, 3);
    new.normalized_unit = 'each';
  end if;

  if new.normalized_quantity <= 0 then
    raise exception 'normalized quantity must be positive'
      using errcode = '23514';
  end if;

  new.normalized_unit_price = round(
    new.line_total / new.normalized_quantity,
    4
  );

  return new;
end;
$$;

create trigger receipt_items_normalize_before_write
before insert or update of product_id, quantity, unit, line_total
on public.receipt_items
for each row execute function public.set_receipt_item_normalized_fields();

create or replace function public.validate_receipt_store_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.stores s
    where s.id = new.store_id
      and s.owner_user_id = new.owner_user_id
  ) then
    raise exception 'receipt store must belong to receipt owner'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger receipts_validate_store_owner
before insert or update of owner_user_id, store_id
on public.receipts
for each row execute function public.validate_receipt_store_owner();

create or replace function public.validate_receipt_item_product_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.receipts r
    join public.products p on p.id = new.product_id
    where r.id = new.receipt_id
      and p.owner_user_id = r.owner_user_id
  ) then
    raise exception 'receipt item product must belong to receipt owner'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger receipt_items_validate_product_owner
before insert or update of receipt_id, product_id
on public.receipt_items
for each row execute function public.validate_receipt_item_product_owner();

create or replace function public.spendly_split_target_amount(
  p_receipt_id uuid,
  p_receipt_item_id uuid
)
returns numeric
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_amount numeric(12, 2);
begin
  if p_receipt_item_id is null then
    select r.total
    into v_amount
    from public.receipts r
    where r.id = p_receipt_id;
  else
    select ri.line_total
    into v_amount
    from public.receipt_items ri
    where ri.id = p_receipt_item_id
      and ri.receipt_id = p_receipt_id;
  end if;

  if v_amount is null then
    raise exception 'split target receipt/item does not exist'
      using errcode = '23503';
  end if;

  return v_amount;
end;
$$;

create or replace function public.validate_expense_split()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_expected_amount numeric(12, 2);
begin
  if new.created_by_user_id <> new.payer_user_id then
    raise exception 'payer must be the user creating the split'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.receipts r
    where r.id = new.receipt_id
      and r.owner_user_id = new.created_by_user_id
  ) then
    raise exception 'split receipt must belong to split creator'
      using errcode = '23514';
  end if;

  v_expected_amount = public.spendly_split_target_amount(
    new.receipt_id,
    new.receipt_item_id
  );

  if new.total_amount <> v_expected_amount then
    raise exception 'split total % must equal target amount %',
      new.total_amount,
      v_expected_amount
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger expense_splits_validate_before_write
before insert or update of receipt_id, receipt_item_id, created_by_user_id,
  payer_user_id, total_amount
on public.expense_splits
for each row execute function public.validate_expense_split();

create or replace function public.validate_expense_split_share()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_payer_user_id uuid;
begin
  select payer_user_id
  into v_payer_user_id
  from public.expense_splits
  where id = new.split_id;

  if v_payer_user_id is null then
    raise exception 'split % does not exist', new.split_id
      using errcode = '23503';
  end if;

  if new.participant_user_id = v_payer_user_id then
    raise exception 'payer must not have an expense_split_shares row'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger expense_split_shares_validate_before_write
before insert or update of split_id, participant_user_id
on public.expense_split_shares
for each row execute function public.validate_expense_split_share();

create or replace function public.can_access_split(p_split_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.expense_splits s
    where s.id = p_split_id
      and (
        s.created_by_user_id = auth.uid() or
        s.payer_user_id = auth.uid() or
        exists (
          select 1
          from public.expense_split_shares sh
          where sh.split_id = s.id
            and sh.participant_user_id = auth.uid()
        )
      )
  );
$$;

create or replace function public.can_manage_split(p_split_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.expense_splits s
    where s.id = p_split_id
      and s.created_by_user_id = auth.uid()
  );
$$;

create or replace function public.create_even_expense_split(
  p_receipt_id uuid,
  p_receipt_item_id uuid,
  p_participant_user_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid = auth.uid();
  v_total_amount numeric(12, 2);
  v_split_id uuid;
  v_participant uuid;
  v_seen uuid[] = '{}'::uuid[];
  v_non_payer_count integer;
  v_share_amount numeric(12, 2);
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_participant_user_ids is null or
     array_length(p_participant_user_ids, 1) is null then
    raise exception 'at least one non-payer participant is required'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.receipts r
    where r.id = p_receipt_id
      and r.owner_user_id = v_user_id
  ) then
    raise exception 'receipt must belong to current user'
      using errcode = '42501';
  end if;

  foreach v_participant in array p_participant_user_ids loop
    if v_participant is null then
      raise exception 'participant cannot be null' using errcode = '23514';
    end if;

    if v_participant = v_user_id then
      raise exception 'payer must not be included as a participant'
        using errcode = '23514';
    end if;

    if v_participant = any(v_seen) then
      raise exception 'duplicate participant %', v_participant
        using errcode = '23505';
    end if;

    if not exists (
      select 1 from public.profiles p where p.id = v_participant
    ) then
      raise exception 'participant % does not exist', v_participant
        using errcode = '23503';
    end if;

    v_seen = array_append(v_seen, v_participant);
  end loop;

  v_non_payer_count = array_length(p_participant_user_ids, 1);
  v_total_amount = public.spendly_split_target_amount(
    p_receipt_id,
    p_receipt_item_id
  );
  v_share_amount = round(v_total_amount / (v_non_payer_count + 1), 2);

  if v_share_amount <= 0 then
    raise exception 'split amount is too small for participant count'
      using errcode = '23514';
  end if;

  insert into public.expense_splits (
    receipt_id,
    receipt_item_id,
    created_by_user_id,
    payer_user_id,
    split_method,
    total_amount
  )
  values (
    p_receipt_id,
    p_receipt_item_id,
    v_user_id,
    v_user_id,
    'even',
    v_total_amount
  )
  returning id into v_split_id;

  foreach v_participant in array p_participant_user_ids loop
    insert into public.expense_split_shares (
      split_id,
      participant_user_id,
      owed_amount
    )
    values (
      v_split_id,
      v_participant,
      v_share_amount
    );
  end loop;

  return v_split_id;
end;
$$;

create or replace function public.create_custom_expense_split(
  p_receipt_id uuid,
  p_receipt_item_id uuid,
  p_payer_share_amount numeric,
  p_shares jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid = auth.uid();
  v_total_amount numeric(12, 2);
  v_split_id uuid;
  v_share jsonb;
  v_participant uuid;
  v_owed_amount numeric(12, 2);
  v_seen uuid[] = '{}'::uuid[];
  v_owed_sum numeric(12, 2) = 0;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_payer_share_amount is null or p_payer_share_amount < 0 then
    raise exception 'payer share amount must be non-negative'
      using errcode = '23514';
  end if;

  if p_shares is null or jsonb_typeof(p_shares) <> 'array' or
     jsonb_array_length(p_shares) = 0 then
    raise exception 'custom split requires at least one non-payer share'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.receipts r
    where r.id = p_receipt_id
      and r.owner_user_id = v_user_id
  ) then
    raise exception 'receipt must belong to current user'
      using errcode = '42501';
  end if;

  v_total_amount = public.spendly_split_target_amount(
    p_receipt_id,
    p_receipt_item_id
  );

  for v_share in select value from jsonb_array_elements(p_shares) as e(value)
  loop
    v_participant = (v_share ->> 'participant_user_id')::uuid;
    v_owed_amount = round((v_share ->> 'owed_amount')::numeric, 2);

    if v_participant is null then
      raise exception 'participant_user_id is required'
        using errcode = '23514';
    end if;

    if v_participant = v_user_id then
      raise exception 'payer must not be included as a participant'
        using errcode = '23514';
    end if;

    if v_participant = any(v_seen) then
      raise exception 'duplicate participant %', v_participant
        using errcode = '23505';
    end if;

    if v_owed_amount is null or v_owed_amount <= 0 then
      raise exception 'owed_amount must be positive'
        using errcode = '23514';
    end if;

    if not exists (
      select 1 from public.profiles p where p.id = v_participant
    ) then
      raise exception 'participant % does not exist', v_participant
        using errcode = '23503';
    end if;

    v_seen = array_append(v_seen, v_participant);
    v_owed_sum = v_owed_sum + v_owed_amount;
  end loop;

  if round(v_owed_sum + p_payer_share_amount, 2) <> v_total_amount then
    raise exception 'custom shares plus payer share must equal %',
      v_total_amount
      using errcode = '23514';
  end if;

  insert into public.expense_splits (
    receipt_id,
    receipt_item_id,
    created_by_user_id,
    payer_user_id,
    split_method,
    total_amount
  )
  values (
    p_receipt_id,
    p_receipt_item_id,
    v_user_id,
    v_user_id,
    'custom',
    v_total_amount
  )
  returning id into v_split_id;

  for v_share in select value from jsonb_array_elements(p_shares) as e(value)
  loop
    insert into public.expense_split_shares (
      split_id,
      participant_user_id,
      owed_amount
    )
    values (
      v_split_id,
      (v_share ->> 'participant_user_id')::uuid,
      round((v_share ->> 'owed_amount')::numeric, 2)
    );
  end loop;

  return v_split_id;
end;
$$;

create or replace function public.mark_split_share_settled(p_share_id uuid)
returns public.expense_split_shares
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid = auth.uid();
  v_share public.expense_split_shares;
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.expense_split_shares sh
    join public.expense_splits s on s.id = sh.split_id
    where sh.id = p_share_id
      and (
        sh.participant_user_id = v_user_id or
        s.payer_user_id = v_user_id or
        s.created_by_user_id = v_user_id
      )
  ) then
    raise exception 'split share not found or not accessible'
      using errcode = '42501';
  end if;

  update public.expense_split_shares
  set
    settled_at = coalesce(settled_at, now()),
    settled_by_user_id = coalesce(settled_by_user_id, v_user_id),
    updated_at = now()
  where id = p_share_id
  returning * into v_share;

  return v_share;
end;
$$;

create or replace function public.get_latest_product_price(
  p_product_id uuid,
  p_store_id uuid,
  p_normalized_unit public.spendly_unit default null
)
returns table (
  receipt_item_id uuid,
  receipt_id uuid,
  store_id uuid,
  product_id uuid,
  product_name text,
  purchased_at date,
  receipt_created_at timestamptz,
  normalized_quantity numeric(12, 3),
  normalized_unit public.spendly_unit,
  normalized_unit_price numeric(12, 4),
  line_total numeric(12, 2)
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    ri.id as receipt_item_id,
    r.id as receipt_id,
    r.store_id,
    ri.product_id,
    p.name::text as product_name,
    r.purchased_at,
    r.created_at as receipt_created_at,
    ri.normalized_quantity,
    ri.normalized_unit,
    ri.normalized_unit_price,
    ri.line_total
  from public.receipt_items ri
  join public.receipts r on r.id = ri.receipt_id
  join public.products p on p.id = ri.product_id
  where ri.product_id = p_product_id
    and r.store_id = p_store_id
    and (
      p_normalized_unit is null or
      ri.normalized_unit = p_normalized_unit
    )
  order by r.purchased_at desc, r.created_at desc, ri.line_number asc
  limit 1;
$$;

create or replace function public.compare_product_between_stores(
  p_product_id uuid,
  p_store_a_id uuid,
  p_store_b_id uuid,
  p_normalized_unit public.spendly_unit default null
)
returns table (
  store_label text,
  store_id uuid,
  store_name text,
  receipt_item_id uuid,
  receipt_id uuid,
  purchased_at date,
  receipt_created_at timestamptz,
  normalized_unit public.spendly_unit,
  normalized_unit_price numeric(12, 4),
  line_total numeric(12, 2)
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    requested.store_label,
    requested.store_id,
    s.name::text as store_name,
    latest.receipt_item_id,
    latest.receipt_id,
    latest.purchased_at,
    latest.receipt_created_at,
    latest.normalized_unit,
    latest.normalized_unit_price,
    latest.line_total
  from (
    values
      ('a'::text, p_store_a_id),
      ('b'::text, p_store_b_id)
  ) as requested(store_label, store_id)
  join public.stores s on s.id = requested.store_id
  left join lateral public.get_latest_product_price(
    p_product_id,
    requested.store_id,
    p_normalized_unit
  ) latest on true
  order by requested.store_label;
$$;

create or replace function public.get_product_price_history(
  p_product_id uuid,
  p_normalized_unit public.spendly_unit default null
)
returns table (
  receipt_item_id uuid,
  receipt_id uuid,
  store_id uuid,
  store_name text,
  purchased_at date,
  receipt_created_at timestamptz,
  normalized_quantity numeric(12, 3),
  normalized_unit public.spendly_unit,
  normalized_unit_price numeric(12, 4),
  line_total numeric(12, 2)
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    ri.id as receipt_item_id,
    r.id as receipt_id,
    r.store_id,
    s.name::text as store_name,
    r.purchased_at,
    r.created_at as receipt_created_at,
    ri.normalized_quantity,
    ri.normalized_unit,
    ri.normalized_unit_price,
    ri.line_total
  from public.receipt_items ri
  join public.receipts r on r.id = ri.receipt_id
  join public.stores s on s.id = r.store_id
  where ri.product_id = p_product_id
    and (
      p_normalized_unit is null or
      ri.normalized_unit = p_normalized_unit
    )
  order by r.purchased_at asc, r.created_at asc, ri.line_number asc;
$$;

create or replace function public.get_current_balances()
returns table (
  debtor_user_id uuid,
  debtor_display_name text,
  creditor_user_id uuid,
  creditor_display_name text,
  amount numeric(12, 2)
)
language sql
stable
security invoker
set search_path = public
as $$
  with visible_unsettled as (
    select
      sh.participant_user_id as debtor_user_id,
      s.payer_user_id as creditor_user_id,
      sh.owed_amount
    from public.expense_split_shares sh
    join public.expense_splits s on s.id = sh.split_id
    where sh.settled_at is null
      and (
        sh.participant_user_id = auth.uid() or
        s.payer_user_id = auth.uid()
      )
  ),
  canonical as (
    select
      case
        when debtor_user_id::text < creditor_user_id::text
          then debtor_user_id
        else creditor_user_id
      end as user_low,
      case
        when debtor_user_id::text < creditor_user_id::text
          then creditor_user_id
        else debtor_user_id
      end as user_high,
      case
        when debtor_user_id::text < creditor_user_id::text
          then owed_amount
        else -owed_amount
      end as low_owes_high_amount
    from visible_unsettled
  ),
  netted as (
    select
      user_low,
      user_high,
      round(sum(low_owes_high_amount), 2) as low_owes_high
    from canonical
    group by user_low, user_high
    having round(sum(low_owes_high_amount), 2) <> 0
  ),
  resolved as (
    select
      case
        when low_owes_high > 0 then user_low
        else user_high
      end as debtor_user_id,
      case
        when low_owes_high > 0 then user_high
        else user_low
      end as creditor_user_id,
      abs(low_owes_high)::numeric(12, 2) as amount
    from netted
  )
  select
    r.debtor_user_id,
    debtor.display_name as debtor_display_name,
    r.creditor_user_id,
    creditor.display_name as creditor_display_name,
    r.amount
  from resolved r
  join public.profiles debtor on debtor.id = r.debtor_user_id
  join public.profiles creditor on creditor.id = r.creditor_user_id
  order by creditor.display_name nulls last, debtor.display_name nulls last;
$$;

alter table public.profiles enable row level security;
alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;
alter table public.expense_splits enable row level security;
alter table public.expense_split_shares enable row level security;

create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

create policy "profiles_insert_own"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

create policy "profiles_update_own"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "stores_manage_own"
on public.stores
for all
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "products_manage_own"
on public.products
for all
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "receipts_manage_own"
on public.receipts
for all
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy "receipt_items_select_own_receipt"
on public.receipt_items
for select
to authenticated
using (
  exists (
    select 1
    from public.receipts r
    where r.id = receipt_items.receipt_id
      and r.owner_user_id = auth.uid()
  )
);

create policy "receipt_items_insert_own_receipt"
on public.receipt_items
for insert
to authenticated
with check (
  exists (
    select 1
    from public.receipts r
    where r.id = receipt_items.receipt_id
      and r.owner_user_id = auth.uid()
  )
);

create policy "receipt_items_update_own_receipt"
on public.receipt_items
for update
to authenticated
using (
  exists (
    select 1
    from public.receipts r
    where r.id = receipt_items.receipt_id
      and r.owner_user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.receipts r
    where r.id = receipt_items.receipt_id
      and r.owner_user_id = auth.uid()
  )
);

create policy "receipt_items_delete_own_receipt"
on public.receipt_items
for delete
to authenticated
using (
  exists (
    select 1
    from public.receipts r
    where r.id = receipt_items.receipt_id
      and r.owner_user_id = auth.uid()
  )
);

create policy "expense_splits_select_accessible"
on public.expense_splits
for select
to authenticated
using (public.can_access_split(id));

create policy "expense_splits_delete_manageable"
on public.expense_splits
for delete
to authenticated
using (public.can_manage_split(id));

create policy "expense_split_shares_select_accessible"
on public.expense_split_shares
for select
to authenticated
using (public.can_access_split(split_id));

create policy "expense_split_shares_delete_manageable"
on public.expense_split_shares
for delete
to authenticated
using (public.can_manage_split(split_id));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.stores to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.receipts to authenticated;
grant select, insert, update, delete on public.receipt_items to authenticated;
grant select, insert, update, delete on public.expense_splits to authenticated;
grant select, insert, update, delete on public.expense_split_shares to authenticated;

revoke execute on function public.create_even_expense_split(
  uuid,
  uuid,
  uuid[]
) from public;
revoke execute on function public.create_custom_expense_split(
  uuid,
  uuid,
  numeric,
  jsonb
) from public;
revoke execute on function public.mark_split_share_settled(uuid) from public;

grant execute on function public.create_even_expense_split(
  uuid,
  uuid,
  uuid[]
) to authenticated;
grant execute on function public.create_custom_expense_split(
  uuid,
  uuid,
  numeric,
  jsonb
) to authenticated;
grant execute on function public.mark_split_share_settled(uuid)
to authenticated;
grant execute on function public.get_latest_product_price(
  uuid,
  uuid,
  public.spendly_unit
) to authenticated;
grant execute on function public.compare_product_between_stores(
  uuid,
  uuid,
  uuid,
  public.spendly_unit
) to authenticated;
grant execute on function public.get_product_price_history(
  uuid,
  public.spendly_unit
) to authenticated;
grant execute on function public.get_current_balances() to authenticated;

comment on table public.profiles is
  'Spendly app profile linked one-to-one with auth.users.';
comment on table public.stores is
  'Stores entered by each user for receipt tracking.';
comment on table public.products is
  'Normalized user-owned products used for fair comparison and history.';
comment on table public.receipts is
  'Receipt header. R2 images are referenced by object key/URL only.';
comment on column public.receipts.image_object_key is
  'Cloudflare R2 object key. No binary image data is stored in Postgres.';
comment on table public.receipt_items is
  'Receipt line items with normalized quantity and unit price.';
comment on column public.receipt_items.image_object_key is
  'Optional Cloudflare R2 object key for this line item. No binary image data is stored in Postgres.';
comment on table public.expense_splits is
  'Receipt-level or item-level split paid by payer_user_id.';
comment on table public.expense_split_shares is
  'Only non-payer debts. The payer never gets a share row.';
comment on function public.get_current_balances() is
  'Returns netted unsettled balances per user pair for the current user.';

commit;
