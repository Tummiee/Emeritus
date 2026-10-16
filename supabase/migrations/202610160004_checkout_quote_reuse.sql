-- Repeated checkout requests must match the quote the customer reviewed.
begin;
create or replace function public.create_checkout_payment_v3(p_items jsonb,p_shipping_address jsonb,p_idempotency_key uuid,p_reference text,p_coupon_code text default null,p_quote_id text default null,p_expected_provider text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.payment_attempts; o public.orders; provider text; fingerprint text;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  fingerprint:=md5((select jsonb_agg(value order by value->>'productId')::text from jsonb_array_elements(p_items))||p_shipping_address::text||coalesce(upper(trim(p_coupon_code)),''));
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_idempotency_key::text,0));
  select * into a from public.payment_attempts where user_id=auth.uid() and idempotency_key=p_idempotency_key;
  if a.id is not null then
    select * into o from public.orders where id=a.order_id;
    if o.request_fingerprint is distinct from fingerprint then raise exception 'checkout inputs changed'; end if;
    if p_quote_id is not null and o.quote_id is distinct from p_quote_id then raise exception 'checkout session is no longer reusable; prices changed'; end if;
    if a.status='successful' then return jsonb_build_object('status','success','orderId',o.id,'reference',a.reference,'amount',a.amount,'currency',a.currency,'provider',a.provider,'existing',true); end if;
    if a.status='failed' and o.status='pending' then
      select * into a from public.payment_attempts where order_id=o.id and status='pending' order by created_at desc limit 1;
    end if;
    if a.id is null or a.status<>'pending' or o.status<>'pending' then raise exception 'checkout session is no longer reusable'; end if;
  else
    if not public.consume_rate_limit('checkout:'||auth.uid()::text,10,60) then raise exception 'too many checkout requests'; end if;
    o:=public.create_checkout_order(p_items,p_shipping_address,p_coupon_code);
    if p_quote_id is not null and o.quote_id is distinct from p_quote_id then raise exception 'prices changed; refresh your quote'; end if;
    update public.orders set request_fingerprint=fingerprint where id=o.id;
    select value #>> '{}' into provider from public.store_settings where key='payment_provider';
    provider:=coalesce(provider,'paystack');
    if p_expected_provider is not null and p_expected_provider<>provider then raise exception 'payment provider changed; review checkout again'; end if;
    if provider not in ('paystack','monnify') then raise exception 'payment provider unavailable'; end if;
    insert into public.payment_attempts(order_id,user_id,provider,reference,amount,currency,idempotency_key,expires_at)
    values(o.id,auth.uid(),provider,p_reference,o.total,o.currency,p_idempotency_key,now()+interval '40 minutes') returning * into a;
    if o.total=0 then perform public.settle_payment_v2(a.reference,true,jsonb_build_object('reason','zero_total_order')); end if;
  end if;
  return jsonb_build_object('orderId',o.id,'orderNumber',o.order_number,'reference',a.reference,'amount',a.amount,'currency',a.currency,
    'provider',a.provider,'authorizationUrl',a.authorization_url,'checkoutUrl',a.checkout_url,'transactionReference',a.provider_transaction_reference,
    'status',case when o.total=0 then 'success' else 'pending' end,'existing',a.idempotency_key=p_idempotency_key and a.reference<>p_reference);
end;
$$;
commit;
notify pgrst,'reload schema';

