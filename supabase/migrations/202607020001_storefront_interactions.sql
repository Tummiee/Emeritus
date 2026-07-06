create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.newsletter_subscribers enable row level security;
alter table public.contact_messages enable row level security;

create policy "admins manage newsletter subscribers" on public.newsletter_subscribers
for all using (public.is_admin()) with check (public.is_admin());

create policy "admins manage contact messages" on public.contact_messages
for all using (public.is_admin()) with check (public.is_admin());

grant select, update, delete on public.newsletter_subscribers, public.contact_messages to authenticated;

create trigger newsletter_subscribers_updated_at before update on public.newsletter_subscribers
for each row execute function public.set_updated_at();

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
  product public.products;
  coupon public.coupons;
  available integer;
  subtotal_value numeric(12,2) := 0;
  shipping_value numeric(12,2) := 0;
  discount_value numeric(12,2) := 0;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'cart is empty'; end if;

  for item in select * from jsonb_array_elements(p_items)
  loop
    select p, i.quantity - i.reserved into product, available
    from public.products p join public.inventory i on i.product_id = p.id
    where p.id = (item->>'productId')::uuid and p.active for update of i;
    if product.id is null then raise exception 'product not found'; end if;
    if (item->>'quantity')::integer < 1 or available < (item->>'quantity')::integer then
      raise exception 'insufficient stock for %', product.name;
    end if;
    subtotal_value := subtotal_value + product.price * (item->>'quantity')::integer;
  end loop;

  if nullif(trim(p_coupon_code), '') is not null then
    select * into coupon from public.coupons
    where code = upper(trim(p_coupon_code))
      and active
      and (starts_at is null or starts_at <= now())
      and (expires_at is null or expires_at >= now())
      and (usage_limit is null or used_count < usage_limit);

    if coupon.id is null then raise exception 'coupon is unavailable'; end if;
    if subtotal_value < coupon.minimum_amount then raise exception 'coupon minimum amount not met'; end if;

    discount_value := case
      when coupon.discount_type = 'percentage' then subtotal_value * coupon.discount_value / 100
      else coupon.discount_value
    end;
    discount_value := least(subtotal_value, discount_value);
  end if;

  insert into public.orders(user_id, subtotal, shipping, discount, total, currency, shipping_address)
  values (auth.uid(), subtotal_value, shipping_value, discount_value, subtotal_value + shipping_value - discount_value, 'NGN', p_shipping_address)
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

grant execute on function public.create_checkout_order(jsonb, jsonb, text) to authenticated;
