-- Replace terminal/stale payment attempts atomically and guard settlement at
-- order level so late provider callbacks cannot decrement inventory twice.

create unique index if not exists payment_attempts_one_success_per_order
  on public.payment_attempts(order_id)
  where status = 'successful'::public.payment_status;

create or replace function public.replace_order_payment_retry(
  p_order_id uuid,
  p_user_id uuid,
  p_previous_reference text,
  p_new_reference text,
  p_idempotency_key uuid,
  p_provider_response jsonb
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  retry_order public.orders;
  latest public.payment_attempts;
  replacement public.payment_attempts;
  selected_provider text := 'paystack';
begin
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text || p_order_id::text, 0));

  select * into retry_order
  from public.orders
  where id = p_order_id and user_id = p_user_id
  for update;

  if retry_order.id is null then raise exception 'order not found'; end if;
  if retry_order.status <> 'pending'::public.order_status then
    raise exception 'only pending orders can retry payment';
  end if;

  select * into latest
  from public.payment_attempts
  where order_id = retry_order.id and user_id = p_user_id
  order by created_at desc
  limit 1
  for update;

  if latest.status = 'successful'::public.payment_status then
    raise exception 'this order has already been paid';
  end if;

  -- Another request already replaced the reference; reuse that replacement.
  if latest.status = 'pending'::public.payment_status
    and latest.reference <> p_previous_reference
  then
    return jsonb_build_object(
      'orderId', retry_order.id,
      'orderNumber', retry_order.order_number,
      'reference', latest.reference,
      'amount', latest.amount,
      'currency', latest.currency,
      'authorizationUrl', latest.authorization_url,
      'accessCode', latest.access_code,
      'checkoutUrl', latest.checkout_url,
      'transactionReference', latest.provider_transaction_reference,
      'provider', latest.provider,
      'existing', true
    );
  end if;

  if latest.reference <> p_previous_reference then
    raise exception 'payment attempt changed while retrying';
  end if;

  if latest.status = 'pending'::public.payment_status then
    update public.payment_attempts
    set status = 'failed'::public.payment_status,
        provider_response = coalesce(p_provider_response, '{}'::jsonb)
    where id = latest.id;
  end if;

  select coalesce(value #>> '{}', 'paystack')
  into selected_provider
  from public.store_settings
  where key = 'payment_provider';

  selected_provider := coalesce(selected_provider, 'paystack');
  if selected_provider not in ('paystack', 'monnify') then
    selected_provider := 'paystack';
  end if;

  insert into public.payment_attempts(
    order_id, user_id, provider, reference, amount, currency,
    idempotency_key, expires_at
  ) values (
    retry_order.id, p_user_id, selected_provider, p_new_reference,
    retry_order.total, retry_order.currency, p_idempotency_key,
    now() + interval '40 minutes'
  ) returning * into replacement;

  update public.orders
  set payment_reference = replacement.reference
  where id = retry_order.id;

  return jsonb_build_object(
    'orderId', retry_order.id,
    'orderNumber', retry_order.order_number,
    'reference', replacement.reference,
    'amount', replacement.amount,
    'currency', replacement.currency,
    'provider', replacement.provider,
    'existing', false
  );
end;
$$;

revoke all on function public.replace_order_payment_retry(uuid, uuid, text, text, uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_order_payment_retry(uuid, uuid, text, text, uuid, jsonb)
  to service_role;

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
  already_paid boolean := false;
begin
  select * into attempt
  from public.payment_attempts
  where reference = p_reference
  for update;

  if attempt.id is null or attempt.status = 'refunded'::public.payment_status then return; end if;

  perform pg_advisory_xact_lock(hashtextextended(attempt.order_id::text, 0));

  select * into paid_order
  from public.orders
  where id = attempt.order_id
  for update;

  select exists(
    select 1 from public.payment_attempts other
    where other.order_id = attempt.order_id
      and other.status = 'successful'::public.payment_status
      and other.id <> attempt.id
  ) into already_paid;

  if p_success then
    if attempt.status = 'successful'::public.payment_status then return; end if;

    -- Record a late/duplicate provider result without settling inventory twice.
    if already_paid or paid_order.status <> 'pending'::public.order_status then
      update public.payment_attempts
      set provider_response = coalesce(p_provider_response, '{}'::jsonb)
        || jsonb_build_object('duplicate_payment_detected', true)
      where id = attempt.id;
      return;
    end if;

    update public.payment_attempts
    set status = 'successful'::public.payment_status,
        provider_response = p_provider_response
    where id = attempt.id;

    for line in select * from public.order_items where order_id = attempt.order_id loop
      update public.inventory
      set reserved = greatest(0, reserved - line.quantity),
          quantity = quantity - line.quantity
      where product_id = line.product_id::uuid;
    end loop;

    update public.orders
    set status = 'confirmed'::public.order_status,
        payment_reference = attempt.reference
    where id = attempt.order_id;

    if paid_order.coupon_code is not null then
      update public.coupons set used_count = used_count + 1
      where code = paid_order.coupon_code;
    end if;

    insert into public.order_tracking_events(order_id, status, location, description)
    values (attempt.order_id, 'confirmed', 'Emeritus Gadget', 'Payment confirmed and order received');

    insert into public.notifications(user_id, title, message, link)
    values (
      attempt.user_id,
      'Payment confirmed',
      'Your order ' || paid_order.order_number || ' has been confirmed.',
      '/account/orders'
    );
    return;
  end if;

  if attempt.status <> 'pending'::public.payment_status then return; end if;

  update public.payment_attempts
  set status = 'failed'::public.payment_status,
      provider_response = p_provider_response
  where id = attempt.id;

  for line in select * from public.order_items where order_id = attempt.order_id loop
    update public.inventory
    set reserved = greatest(0, reserved - line.quantity)
    where product_id = line.product_id::uuid;
  end loop;

  update public.orders
  set status = 'cancelled'::public.order_status
  where id = attempt.order_id;
end;
$$;

revoke all on function public.settle_payment(text, boolean, jsonb)
  from public, anon, authenticated;
grant execute on function public.settle_payment(text, boolean, jsonb)
  to service_role;

notify pgrst, 'reload schema';
