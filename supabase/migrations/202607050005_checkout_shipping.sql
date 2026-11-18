create or replace function public.calculate_shipping(
  p_state text,
  p_merchandise_total numeric
) returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  selected_zone public.shipping_zones;
  shipping_fee numeric(12,2);
  normalized_state text := lower(trim(p_state));
begin
  if normalized_state = '' then raise exception 'delivery state is required'; end if;
  if p_merchandise_total < 0 then raise exception 'invalid merchandise total'; end if;

  select zone.*
  into selected_zone
  from public.shipping_zone_states zone_state
  join public.shipping_zones zone on zone.id = zone_state.zone_id
  where lower(trim(zone_state.state_name)) = normalized_state
    and zone.active
  limit 1;

  if selected_zone.id is null then
    select zone.*
    into selected_zone
    from public.shipping_zones zone
    where zone.is_fallback and zone.active
    limit 1;
  end if;

  if selected_zone.id is null then
    raise exception 'shipping is not configured for this delivery state';
  end if;

  shipping_fee := case
    when selected_zone.free_shipping_threshold is not null
      and p_merchandise_total >= selected_zone.free_shipping_threshold
      then 0
    else selected_zone.base_fee
  end;

  return jsonb_build_object(
    'zoneId', selected_zone.id,
    'zoneName', selected_zone.name,
    'fee', shipping_fee,
    'freeShippingThreshold', selected_zone.free_shipping_threshold,
    'estimatedDaysMin', selected_zone.estimated_days_min,
    'estimatedDaysMax', selected_zone.estimated_days_max
  );
end;
$$;

revoke all on function public.calculate_shipping(text, numeric) from public;
grant execute on function public.calculate_shipping(text, numeric)
  to anon, authenticated;

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
  shipping_value numeric(12,2) := 0;
  shipping_quote jsonb;
  normalized_coupon text := nullif(upper(trim(p_coupon_code)), '');
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'cart is empty'; end if;
  if lower(trim(coalesce(p_shipping_address->>'country', ''))) not in ('nigeria', 'ng') then
    raise exception 'shipping is currently available only within Nigeria';
  end if;

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

  shipping_quote := public.calculate_shipping(
    p_shipping_address->>'state',
    subtotal_value - discount_value
  );
  shipping_value := (shipping_quote->>'fee')::numeric;

  insert into public.orders(user_id, subtotal, shipping, discount, total, currency, shipping_address, coupon_code)
  values (
    auth.uid(),
    subtotal_value,
    shipping_value,
    discount_value,
    subtotal_value + shipping_value - discount_value,
    'NGN',
    p_shipping_address || jsonb_build_object(
      'shippingZoneId', shipping_quote->>'zoneId',
      'shippingZoneName', shipping_quote->>'zoneName',
      'estimatedDaysMin', (shipping_quote->>'estimatedDaysMin')::integer,
      'estimatedDaysMax', (shipping_quote->>'estimatedDaysMax')::integer
    ),
    normalized_coupon
  )
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

grant execute on function public.create_checkout_order(jsonb, jsonb, text)
  to authenticated;

notify pgrst, 'reload schema';
