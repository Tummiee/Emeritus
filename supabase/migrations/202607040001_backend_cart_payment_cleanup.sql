-- Persist authenticated carts in Supabase and clear them after payment settles.
-- The storefront must read and write this table for backend clearing to be
-- reflected in the browser.

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 99),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists cart_items_user_id_idx
  on public.cart_items(user_id);

alter table public.cart_items enable row level security;

do $$ begin
  create policy "customers read own cart" on public.cart_items
    for select using ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "customers add to own cart" on public.cart_items
    for insert with check ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "customers update own cart" on public.cart_items
    for update
    using ((select auth.uid()) = user_id)
    with check ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "customers remove from own cart" on public.cart_items
    for delete using ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;

grant select, insert, update, delete on public.cart_items to authenticated;

do $$ begin
  create trigger cart_items_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

create or replace function public.clear_cart_after_successful_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'successful'::public.payment_status
    and old.status is distinct from new.status
  then
    delete from public.cart_items
    where user_id = new.user_id;
  end if;

  return new;
end;
$$;

revoke all on function public.clear_cart_after_successful_payment()
  from public, anon, authenticated;

drop trigger if exists clear_cart_after_successful_payment
  on public.payment_attempts;

create trigger clear_cart_after_successful_payment
after update of status on public.payment_attempts
for each row
execute function public.clear_cart_after_successful_payment();

notify pgrst, 'reload schema';
