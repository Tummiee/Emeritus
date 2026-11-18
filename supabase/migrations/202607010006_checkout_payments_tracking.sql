create type public.payment_status as enum ('pending', 'successful', 'failed', 'refunded');

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  provider text not null default 'paystack' check (provider = 'paystack'),
  reference text not null unique,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'NGN',
  status public.payment_status not null default 'pending',
  provider_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_tracking_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  location text not null default '',
  description text not null default '',
  created_at timestamptz not null default now()
);

alter table public.orders
  add column if not exists tracking_number text,
  add column if not exists estimated_delivery date;

alter table public.payment_attempts enable row level security;
alter table public.order_tracking_events enable row level security;

create policy "customers read own payments" on public.payment_attempts for select
using ((select auth.uid()) = user_id);
create policy "customers create own pending payments" on public.payment_attempts for insert
with check ((select auth.uid()) = user_id and status = 'pending');
create policy "admins manage payments" on public.payment_attempts for all
using (public.is_admin()) with check (public.is_admin());
create policy "customers read own tracking" on public.order_tracking_events for select
using (exists (select 1 from public.orders where orders.id = order_tracking_events.order_id and orders.user_id = (select auth.uid())));
create policy "admins manage tracking" on public.order_tracking_events for all
using (public.is_admin()) with check (public.is_admin());

grant select on public.payment_attempts, public.order_tracking_events to authenticated;
grant insert, update on public.payment_attempts, public.order_tracking_events to authenticated;

create trigger payment_attempts_updated_at before update on public.payment_attempts
for each row execute function public.set_updated_at();

create policy "customers submit reviews" on public.product_reviews for insert
to authenticated with check ((select auth.uid()) = user_id and status = 'pending');

create or replace function public.create_checkout_order(
  p_items jsonb,
  p_shipping_address jsonb
) returns public.orders
language plpgsql security definer set search_path = ''
as $$
declare
  result public.orders;
  item jsonb;
  product public.products;
  available integer;
  subtotal_value numeric(12,2) := 0;
  shipping_value numeric(12,2) := 0;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'cart is empty'; end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    select p, i.quantity - i.reserved into product, available
    from public.products p join public.inventory i on i.product_id = p.id
    where p.id = (item->>'productId')::uuid and p.active for update of i;
    if product.id is null then raise exception 'product not found'; end if;
    if (item->>'quantity')::integer < 1 or available < (item->>'quantity')::integer then raise exception 'insufficient stock for %', product.name; end if;
    subtotal_value := subtotal_value + product.price * (item->>'quantity')::integer;
  end loop;

  insert into public.orders(user_id, subtotal, shipping, discount, total, currency, shipping_address)
  values (auth.uid(), subtotal_value, shipping_value, 0, subtotal_value + shipping_value, 'NGN', p_shipping_address)
  returning * into result;

  for item in select * from jsonb_array_elements(p_items)
  loop
    select * into product from public.products where id = (item->>'productId')::uuid;
    insert into public.order_items(order_id, product_id, name, quantity, unit_price)
    values (result.id, product.id::text, product.name, (item->>'quantity')::integer, product.price);
    update public.inventory set reserved = reserved + (item->>'quantity')::integer where product_id = product.id;
  end loop;
  return result;
end;
$$;
grant execute on function public.create_checkout_order(jsonb, jsonb) to authenticated;

create or replace function public.settle_payment(
  p_reference text,
  p_success boolean,
  p_provider_response jsonb
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  attempt public.payment_attempts;
  line public.order_items;
begin
  select * into attempt from public.payment_attempts where reference = p_reference for update;
  if attempt.id is null or attempt.status <> 'pending' then return; end if;
  update public.payment_attempts
  set status = case when p_success then 'successful'::public.payment_status else 'failed'::public.payment_status end,
      provider_response = p_provider_response
  where id = attempt.id;
  for line in select * from public.order_items where order_id = attempt.order_id loop
    update public.inventory
    set reserved = greatest(0, reserved - line.quantity),
        quantity = case when p_success then quantity - line.quantity else quantity end
    where product_id = line.product_id::uuid;
  end loop;
  update public.orders set status = case when p_success then 'confirmed'::public.order_status else 'cancelled'::public.order_status end
  where id = attempt.order_id;
  if p_success then
    insert into public.order_tracking_events(order_id, status, location, description)
    values (attempt.order_id, 'confirmed', 'Emeritus Gadget', 'Payment confirmed and order received');
  end if;
end;
$$;
revoke all on function public.settle_payment(text, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.settle_payment(text, boolean, jsonb) to service_role;

-- Make newly created RPC functions available to PostgREST immediately.
notify pgrst, 'reload schema';
