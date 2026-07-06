-- Never return a completed Paystack authorization URL for a new checkout.
-- Pending attempts remain reusable so retries cannot create duplicate orders.

create or replace function public.create_checkout_payment_v2(
  p_items jsonb,
  p_shipping_address jsonb,
  p_idempotency_key uuid,
  p_reference text,
  p_coupon_code text default null
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing public.payment_attempts;
  created_order public.orders;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(auth.uid()::text || p_idempotency_key::text, 0)
  );

  select *
  into existing
  from public.payment_attempts
  where user_id = auth.uid()
    and idempotency_key = p_idempotency_key;

  if existing.id is not null then
    if existing.status <> 'pending'::public.payment_status then
      raise exception 'checkout session is no longer reusable';
    end if;

    return jsonb_build_object(
      'orderId', existing.order_id,
      'reference', existing.reference,
      'amount', existing.amount,
      'currency', existing.currency,
      'authorizationUrl', existing.authorization_url,
      'accessCode', existing.access_code,
      'existing', true
    );
  end if;

  created_order := public.create_checkout_order(
    p_items,
    p_shipping_address,
    p_coupon_code
  );

  insert into public.payment_attempts(
    order_id,
    user_id,
    reference,
    amount,
    currency,
    idempotency_key
  ) values (
    created_order.id,
    auth.uid(),
    p_reference,
    created_order.total,
    created_order.currency,
    p_idempotency_key
  );

  return jsonb_build_object(
    'orderId', created_order.id,
    'orderNumber', created_order.order_number,
    'reference', p_reference,
    'amount', created_order.total,
    'currency', created_order.currency,
    'existing', false
  );
end;
$$;

revoke all on function public.create_checkout_payment_v2(
  jsonb,
  jsonb,
  uuid,
  text,
  text
) from public, anon;

grant execute on function public.create_checkout_payment_v2(
  jsonb,
  jsonb,
  uuid,
  text,
  text
) to authenticated;

notify pgrst, 'reload schema';
