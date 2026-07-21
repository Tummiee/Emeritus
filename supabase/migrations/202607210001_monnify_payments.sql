-- Add Monnify without destroying historical Paystack payment records.

alter table public.payment_attempts
  drop constraint if exists payment_attempts_provider_check;

alter table public.payment_attempts
  alter column provider set default 'monnify',
  add column if not exists provider_transaction_reference text,
  add column if not exists checkout_url text,
  add column if not exists payment_method text,
  add column if not exists paid_at timestamptz;

alter table public.payment_attempts
  add constraint payment_attempts_provider_check
  check (provider in ('paystack', 'monnify'));

create unique index if not exists payment_attempts_provider_transaction_reference
  on public.payment_attempts(provider, provider_transaction_reference)
  where provider_transaction_reference is not null;

alter table public.payment_webhook_events
  add column if not exists provider text not null default 'monnify';

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
    if existing.status <> 'pending'::public.payment_status then
      raise exception 'checkout session is no longer reusable';
    end if;
    return jsonb_build_object(
      'orderId', existing.order_id, 'reference', existing.reference,
      'amount', existing.amount, 'currency', existing.currency,
      'checkoutUrl', existing.checkout_url,
      'transactionReference', existing.provider_transaction_reference,
      'provider', existing.provider, 'existing', true
    );
  end if;

  created_order := public.create_checkout_order(p_items, p_shipping_address, p_coupon_code);
  insert into public.payment_attempts(
    order_id, user_id, provider, reference, amount, currency, idempotency_key,
    expires_at
  ) values (
    created_order.id, auth.uid(), 'monnify', p_reference, created_order.total,
    created_order.currency, p_idempotency_key, now() + interval '40 minutes'
  );

  return jsonb_build_object(
    'orderId', created_order.id, 'orderNumber', created_order.order_number,
    'reference', p_reference, 'amount', created_order.total,
    'currency', created_order.currency, 'provider', 'monnify', 'existing', false
  );
end;
$$;

revoke all on function public.create_checkout_payment_v2(jsonb, jsonb, uuid, text, text) from public, anon;
grant execute on function public.create_checkout_payment_v2(jsonb, jsonb, uuid, text, text) to authenticated;

notify pgrst, 'reload schema';
