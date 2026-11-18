-- Self-contained, non-destructive Paystack checkout update.
-- Existing tables and rows are preserved.

do $$ begin
  create type public.payment_status as enum ('pending', 'successful', 'failed', 'refunded');
exception when duplicate_object then null;
end $$;

alter table public.orders
  add column if not exists coupon_code text,
  add column if not exists tracking_number text,
  add column if not exists estimated_delivery date;

create table if not exists public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  provider text not null default 'paystack' check (provider = 'paystack'),
  reference text not null unique,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'NGN',
  status public.payment_status not null default 'pending',
  provider_response jsonb,
  idempotency_key uuid,
  authorization_url text,
  access_code text,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_attempts
  add column if not exists idempotency_key uuid,
  add column if not exists authorization_url text,
  add column if not exists access_code text,
  add column if not exists expires_at timestamptz not null default (now() + interval '30 minutes');

create unique index if not exists payment_attempts_user_idempotency
  on public.payment_attempts(user_id, idempotency_key)
  where idempotency_key is not null;

create table if not exists public.order_tracking_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  location text not null default '',
  description text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.payment_webhook_events (
  event_hash text primary key,
  event_type text not null,
  reference text,
  payload jsonb not null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payment_attempts enable row level security;
alter table public.order_tracking_events enable row level security;
alter table public.payment_webhook_events enable row level security;

do $$ begin
  create policy "customers read own payments" on public.payment_attempts
    for select using ((select auth.uid()) = user_id);
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "customers create own pending payments" on public.payment_attempts
    for insert with check ((select auth.uid()) = user_id and status = 'pending');
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "admins manage payments" on public.payment_attempts
    for all using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "customers read own tracking" on public.order_tracking_events
    for select using (exists (
      select 1 from public.orders
      where orders.id = order_tracking_events.order_id
        and orders.user_id = (select auth.uid())
    ));
exception when duplicate_object then null;
end $$;
do $$ begin
  create policy "admins manage tracking" on public.order_tracking_events
    for all using (public.is_admin()) with check (public.is_admin());
exception when duplicate_object then null;
end $$;

revoke all on public.payment_webhook_events from public, anon, authenticated;
grant select on public.payment_attempts, public.order_tracking_events to authenticated;
grant insert on public.payment_attempts to authenticated;

do $$ begin
  create trigger payment_attempts_updated_at
  before update on public.payment_attempts
  for each row execute function public.set_updated_at();
exception when duplicate_object then null;
end $$;

create or replace function public.create_checkout_order(
  p_items jsonb,
  p_shipping_address jsonb,
  p_coupon_code text default null
) returns public.orders
language plpgsql security definer set search_path = ''
as $$
declare
  result public.orders;
  item jsonb;
  selected_product_id uuid;
  selected_product_name text;
  selected_product_price numeric(12,2);
  coupon public.coupons;
  available integer;
  subtotal_value numeric(12,2) := 0;
  discount_value numeric(12,2) := 0;
  normalized_coupon text := nullif(upper(trim(p_coupon_code)), '');
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'cart is empty'; end if;

  for item in select * from jsonb_array_elements(p_items) loop
    if not (item ? 'productId') or not (item ? 'quantity') then raise exception 'invalid cart item'; end if;
    selected_product_id := null;
    select p.id, p.name, p.price, i.quantity - i.reserved
    into selected_product_id, selected_product_name, selected_product_price, available
    from public.products p join public.inventory i on i.product_id = p.id
    where p.id = (item->>'productId')::uuid and p.active
    for update of i;
    if selected_product_id is null then raise exception 'product not found'; end if;
    if (item->>'quantity')::integer < 1
      or (item->>'quantity')::integer > 99
      or available < (item->>'quantity')::integer
    then raise exception 'insufficient stock for %', selected_product_name;
    end if;
    subtotal_value := subtotal_value + selected_product_price * (item->>'quantity')::integer;
  end loop;

  if normalized_coupon is not null then
    select * into coupon from public.coupons
    where code = normalized_coupon and active
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at >= now())
      and (usage_limit is null or used_count < usage_limit)
    for update;
    if coupon.id is null then raise exception 'coupon is unavailable'; end if;
    if subtotal_value < coupon.minimum_amount then raise exception 'coupon minimum amount not met'; end if;
    discount_value := case
      when coupon.discount_type = 'percentage' then subtotal_value * least(coupon.discount_value, 100) / 100
      else coupon.discount_value
    end;
    discount_value := least(subtotal_value, discount_value);
  end if;

  insert into public.orders(user_id, subtotal, shipping, discount, total, currency, shipping_address, coupon_code)
  values (auth.uid(), subtotal_value, 0, discount_value, subtotal_value - discount_value, 'NGN', p_shipping_address, normalized_coupon)
  returning * into result;

  for item in select * from jsonb_array_elements(p_items) loop
    select p.id, p.name, p.price
    into selected_product_id, selected_product_name, selected_product_price
    from public.products p where p.id = (item->>'productId')::uuid;
    insert into public.order_items(order_id, product_id, name, quantity, unit_price)
    values (result.id, selected_product_id::text, selected_product_name, (item->>'quantity')::integer, selected_product_price);
    update public.inventory
    set reserved = reserved + (item->>'quantity')::integer
    where product_id = selected_product_id;
  end loop;
  return result;
end;
$$;

grant execute on function public.create_checkout_order(jsonb, jsonb, text) to authenticated;

create or replace function public.create_checkout_payment_v2(
  p_items jsonb,
  p_shipping_address jsonb,
  p_idempotency_key uuid,
  p_reference text,
  p_coupon_code text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  existing public.payment_attempts;
  created_order public.orders;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || p_idempotency_key::text, 0));

  select * into existing from public.payment_attempts
  where user_id = auth.uid() and idempotency_key = p_idempotency_key;
  if existing.id is not null then
    return jsonb_build_object(
      'orderId', existing.order_id, 'reference', existing.reference,
      'amount', existing.amount, 'currency', existing.currency,
      'authorizationUrl', existing.authorization_url,
      'accessCode', existing.access_code, 'existing', true
    );
  end if;

  created_order := public.create_checkout_order(p_items, p_shipping_address, p_coupon_code);
  insert into public.payment_attempts(
    order_id, user_id, reference, amount, currency, idempotency_key
  ) values (
    created_order.id, auth.uid(), p_reference, created_order.total,
    created_order.currency, p_idempotency_key
  );

  return jsonb_build_object(
    'orderId', created_order.id, 'orderNumber', created_order.order_number,
    'reference', p_reference, 'amount', created_order.total,
    'currency', created_order.currency, 'existing', false
  );
end;
$$;

revoke all on function public.create_checkout_payment_v2(jsonb, jsonb, uuid, text, text) from public, anon;
grant execute on function public.create_checkout_payment_v2(jsonb, jsonb, uuid, text, text) to authenticated;

create or replace function public.settle_payment(
  p_reference text,
  p_success boolean,
  p_provider_response jsonb
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  attempt public.payment_attempts;
  paid_order public.orders;
  line public.order_items;
begin
  select * into attempt from public.payment_attempts where reference = p_reference for update;
  if attempt.id is null or attempt.status <> 'pending' then return; end if;
  select * into paid_order from public.orders where id = attempt.order_id for update;
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
  update public.orders
  set status = case when p_success then 'confirmed'::public.order_status else 'cancelled'::public.order_status end
  where id = attempt.order_id;
  if p_success then
    if paid_order.coupon_code is not null then
      update public.coupons set used_count = used_count + 1 where code = paid_order.coupon_code;
    end if;
    insert into public.order_tracking_events(order_id, status, location, description)
    values (attempt.order_id, 'confirmed', 'Emeritus Gadget', 'Payment confirmed and order received');
    insert into public.notifications(user_id, title, message, link)
    values (attempt.user_id, 'Payment confirmed', 'Your order ' || paid_order.order_number || ' has been confirmed.', '/account/orders');
  end if;
end;
$$;

revoke all on function public.settle_payment(text, boolean, jsonb) from public, anon, authenticated;
grant execute on function public.settle_payment(text, boolean, jsonb) to service_role;

create or replace function public.release_expired_checkout_payments()
returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  expired public.payment_attempts;
  released integer := 0;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  for expired in
    select * from public.payment_attempts
    where user_id = auth.uid() and status = 'pending' and expires_at < now()
    for update skip locked
  loop
    perform public.settle_payment(expired.reference, false, jsonb_build_object('reason', 'checkout expired'));
    released := released + 1;
  end loop;
  return released;
end;
$$;

revoke all on function public.release_expired_checkout_payments() from public, anon;
grant execute on function public.release_expired_checkout_payments() to authenticated;

notify pgrst, 'reload schema';
