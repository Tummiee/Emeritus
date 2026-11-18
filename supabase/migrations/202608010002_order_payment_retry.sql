-- Create a fresh payment attempt for an existing pending order without
-- rebuilding the order or reserving its inventory a second time.

create or replace function public.create_order_payment_retry(
  p_order_id uuid,
  p_reference text,
  p_idempotency_key uuid
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  retry_order public.orders;
  existing public.payment_attempts;
  selected_provider text := 'paystack';
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;

  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text || p_order_id::text, 0));

  select * into retry_order
  from public.orders
  where id = p_order_id and user_id = auth.uid()
  for update;

  if retry_order.id is null then raise exception 'order not found'; end if;
  if retry_order.status <> 'pending'::public.order_status then
    raise exception 'only pending orders can retry payment';
  end if;

  select * into existing
  from public.payment_attempts
  where order_id = retry_order.id and user_id = auth.uid()
  order by created_at desc
  limit 1
  for update;

  if existing.status = 'successful'::public.payment_status then
    raise exception 'this order has already been paid';
  end if;

  -- Concurrent requests and incomplete initializations reuse the same attempt.
  if existing.status = 'pending'::public.payment_status then
    return jsonb_build_object(
      'orderId', retry_order.id,
      'orderNumber', retry_order.order_number,
      'reference', existing.reference,
      'amount', existing.amount,
      'currency', existing.currency,
      'authorizationUrl', existing.authorization_url,
      'accessCode', existing.access_code,
      'checkoutUrl', existing.checkout_url,
      'transactionReference', existing.provider_transaction_reference,
      'provider', existing.provider,
      'existing', true
    );
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
    retry_order.id, auth.uid(), selected_provider, p_reference,
    retry_order.total, retry_order.currency, p_idempotency_key,
    now() + interval '40 minutes'
  ) returning * into existing;

  update public.orders
  set payment_reference = existing.reference
  where id = retry_order.id;

  return jsonb_build_object(
    'orderId', retry_order.id,
    'orderNumber', retry_order.order_number,
    'reference', existing.reference,
    'amount', existing.amount,
    'currency', existing.currency,
    'provider', existing.provider,
    'existing', false
  );
end;
$$;

revoke all on function public.create_order_payment_retry(uuid, text, uuid) from public, anon;
grant execute on function public.create_order_payment_retry(uuid, text, uuid) to authenticated;

notify pgrst, 'reload schema';
