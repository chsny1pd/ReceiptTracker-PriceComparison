-- Apply RBAC to an existing Spendly Supabase project.
-- Run once in the Supabase SQL editor after pulling RBAC changes.

begin;

do $$
begin
  create type public.spendly_user_role as enum ('user', 'staff', 'admin');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles
  add column if not exists role public.spendly_user_role not null default 'user';

-- Promote your GitHub account before locking role changes.
-- update public.profiles set role = 'admin' where github_username = 'YOUR_GITHUB_USERNAME';

create or replace function public.current_user_role()
returns public.spendly_user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select p.role
      from public.profiles p
      where p.id = auth.uid()
    ),
    'user'::public.spendly_user_role
  );
$$;

create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_user_role() in ('staff'::public.spendly_user_role, 'admin'::public.spendly_user_role);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_user_role() = 'admin'::public.spendly_user_role;
$$;

create or replace function public.protect_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'only admins can change user roles'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_role_change on public.profiles;
create trigger profiles_protect_role_change
before update on public.profiles
for each row execute function public.protect_profile_role_change();

create or replace function public.admin_set_user_role(
  p_user_id uuid,
  p_role public.spendly_user_role
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if not public.is_admin() then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  if p_user_id = auth.uid() and p_role <> 'admin'::public.spendly_user_role then
    raise exception 'admins cannot demote themselves' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
  ) then
    raise exception 'user not found' using errcode = 'P0002';
  end if;

  update public.profiles
  set role = p_role
  where id = p_user_id;
end;
$$;

drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "stores_select_staff_admin" on public.stores;
create policy "stores_select_staff_admin"
on public.stores
for select
to authenticated
using (public.is_staff_or_admin());

drop policy if exists "products_select_staff_admin" on public.products;
create policy "products_select_staff_admin"
on public.products
for select
to authenticated
using (public.is_staff_or_admin());

drop policy if exists "receipts_select_staff_admin" on public.receipts;
create policy "receipts_select_staff_admin"
on public.receipts
for select
to authenticated
using (public.is_staff_or_admin());

drop policy if exists "receipt_items_select_staff_admin" on public.receipt_items;
create policy "receipt_items_select_staff_admin"
on public.receipt_items
for select
to authenticated
using (public.is_staff_or_admin());

grant execute on function public.admin_set_user_role(uuid, public.spendly_user_role)
  to authenticated;

commit;
