begin;

-- Close the direct-insert trust boundary before installing the new workflows.
drop policy if exists "customers create own pending payments" on public.payment_attempts;
revoke insert, update, delete on public.payment_attempts from authenticated, anon;
revoke insert, update, delete on public.orders, public.order_items from authenticated, anon;
-- Legacy RPCs vary between installations. Revoke every existing overload;
-- missing names require no action and must not prevent the upgrade.
do $$ declare routine regprocedure; begin
  for routine in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('create_checkout_order','create_checkout_payment','create_checkout_payment_v2')
  loop execute format('revoke all on function %s from public,anon,authenticated',routine); end loop;
end $$;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check check (role in ('customer','admin','super_admin'));
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'));
$$;

create table public.product_costs (
  product_id uuid primary key references public.products(id) on delete cascade,
  cost_price numeric(12,2) check (cost_price >= 0)
);
insert into public.product_costs select id,cost_price from public.products;
alter table public.product_costs enable row level security;
create policy "admins manage costs" on public.product_costs for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select,insert,update,delete on public.product_costs to authenticated;
alter table public.products drop column cost_price;

create table public.payment_reconciliation (
  reference text primary key, order_id uuid references public.orders(id), reason text not null,
  details jsonb not null default '{}', created_at timestamptz not null default now(), resolved_at timestamptz
);
alter table public.payment_reconciliation enable row level security;
create policy "admins read reconciliation" on public.payment_reconciliation for select to authenticated using(public.is_admin());
grant select on public.payment_reconciliation to authenticated;
-- Preserve historical inconsistencies for review rather than rewriting financial history.
insert into public.payment_reconciliation(reference,order_id,reason,details)
select a.reference,a.order_id,'historical_identity_mismatch',jsonb_build_object('amount',a.amount,'orderTotal',o.total,'userId',a.user_id)
from public.payment_attempts a join public.orders o on o.id=a.order_id
where a.user_id<>o.user_id or a.currency<>o.currency or a.amount<>o.total;

alter table public.orders add column tax_name text, add column tax_rate numeric(5,2),
  add column tax_amount numeric(12,2) not null default 0, add column taxable_amount numeric(12,2) not null default 0,
  add column quote_id text, add column request_fingerprint text, add column reservation_released boolean not null default false,
  add column refund_reference text;
alter table public.order_items add column regular_price numeric(12,2), add column promotion_id uuid;
alter table public.payment_attempts add column initialization_claimed_at timestamptz;
alter table public.payment_attempts add column next_reconcile_at timestamptz not null default now();
create index payment_attempts_expiry_pending on public.payment_attempts(expires_at) where status='pending';

create table public.coupon_reservations (
  order_id uuid primary key references public.orders(id), coupon_id uuid not null references public.coupons(id),
  status text not null default 'reserved' check(status in ('reserved','consumed','released'))
);
alter table public.coupon_reservations enable row level security;
create policy "admins read coupon reservations" on public.coupon_reservations for select to authenticated using(public.is_admin());
grant select on public.coupon_reservations to authenticated;

-- Preserve the oldest currently effective rule when historical duplicates exist.
with ranked as (select id,row_number() over(partition by country_code order by created_at,id) n from public.tax_rules where active)
update public.tax_rules set active=false where id in (select id from ranked where n>1);
create unique index tax_one_active_country on public.tax_rules(country_code) where active;

create or replace function public.effective_product_price(p_id uuid) returns jsonb
language sql stable security definer set search_path='' as $$
  select jsonb_build_object('price',coalesce(s.sale_price,p.price),'regularPrice',p.price,'promotionId',s.promotion_id)
  from public.products p left join lateral (
    select pp.sale_price,pp.promotion_id from public.promotion_products pp join public.promotions pr on pr.id=pp.promotion_id
    where pp.product_id=p.id and pr.active and (pr.starts_at is null or pr.starts_at<=now())
      and (pr.ends_at is null or pr.ends_at>now()) and pp.sale_price>=0 and pp.sale_price<p.price
    order by pp.sale_price,pp.promotion_id limit 1
  ) s on true where p.id=p_id and p.active;
$$;
revoke all on function public.effective_product_price(uuid) from public;

create or replace function public.checkout_quote(p_items jsonb,p_coupon_code text default null,p_state text default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  item jsonb; product public.products; pricing jsonb; lines jsonb:='[]';
  subtotal numeric(12,2):=0; discount numeric(12,2):=0; shipping numeric(12,2):=0; tax numeric(12,2):=0;
  rule public.tax_rules; coupon public.coupons; normalized_code text:=nullif(upper(trim(p_coupon_code)),''); units integer;
begin
  if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 100 then raise exception 'invalid cart'; end if;
  if (select count(*)<>count(distinct value->>'productId') from jsonb_array_elements(p_items)) then raise exception 'duplicate products'; end if;
  for item in select value from jsonb_array_elements(p_items) order by value->>'productId' loop
    if not coalesce((item->>'quantity') ~ '^[0-9]+$',false) then raise exception 'invalid quantity'; end if;
    units:=(item->>'quantity')::integer;
    if units not between 1 and 99 then raise exception 'invalid quantity'; end if;
    select * into product from public.products where id=(item->>'productId')::uuid and active;
    if product.id is null then raise exception 'product unavailable'; end if;
    pricing:=public.effective_product_price(product.id);
    subtotal:=subtotal+(pricing->>'price')::numeric*units;
    lines:=lines||jsonb_build_array(jsonb_build_object('productId',product.id,'name',product.name,'quantity',units,
      'unitPrice',(pricing->>'price')::numeric,'regularPrice',product.price,'promotionId',pricing->>'promotionId'));
  end loop;
  if normalized_code is not null then
    select * into coupon from public.coupons where normalized_code=upper(public.coupons.code) and active
      and (starts_at is null or starts_at<=now()) and (expires_at is null or expires_at>now()) order by created_at,id limit 1;
    if coupon.id is null then raise exception 'coupon unavailable'; end if;
    if subtotal<coupon.minimum_amount then raise exception 'coupon minimum amount not met'; end if;
    if coupon.usage_limit is not null and coupon.used_count+(select count(*) from public.coupon_reservations where coupon_id=coupon.id and status='reserved')>=coupon.usage_limit then raise exception 'coupon unavailable'; end if;
    discount:=least(subtotal,round(case when coupon.discount_type='percentage' then subtotal*least(coupon.discount_value,100)/100 else coupon.discount_value end,2));
  end if;
  select * into rule from public.tax_rules where country_code='NG' and active;
  tax:=round((subtotal-discount)*coalesce(rule.rate,0)/100,2);
  if p_state is not null then shipping:=(public.calculate_shipping(p_state,subtotal-discount)->>'fee')::numeric; end if;
  return jsonb_build_object('lines',lines,'subtotal',subtotal,'discount',discount,'shipping',case when p_state is null then null else shipping end,
    'tax',case when rule.id is null then null else jsonb_build_object('name',rule.name,'rate',rule.rate,'amount',tax,'taxableAmount',subtotal-discount) end,
    'total',subtotal-discount+shipping+tax,'couponCode',normalized_code,'quoteId',md5(lines::text||discount::text||shipping::text||tax::text));
end;
$$;
revoke all on function public.checkout_quote(jsonb,text,text) from public;
grant execute on function public.checkout_quote(jsonb,text,text) to anon,authenticated;

create or replace function public.create_checkout_order(p_items jsonb,p_shipping_address jsonb,p_coupon_code text default null)
returns public.orders language plpgsql security definer set search_path='' as $$
declare result public.orders; quote jsonb; line jsonb; available integer; coupon public.coupons; normalized_coupon text:=nullif(upper(trim(p_coupon_code)),'');
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if lower(trim(coalesce(p_shipping_address->>'country',''))) not in ('nigeria','ng') then raise exception 'Nigeria delivery only'; end if;
  -- Lock stock in product order, then coupon; settlement uses the same ordering.
  perform 1 from public.inventory where product_id in(select (value->>'productId')::uuid from jsonb_array_elements(p_items)) order by product_id for update;
  if normalized_coupon is not null then select * into coupon from public.coupons where upper(public.coupons.code)=normalized_coupon order by created_at,id limit 1 for update; end if;
  quote:=public.checkout_quote(p_items,p_coupon_code,p_shipping_address->>'state');
  for line in select value from jsonb_array_elements(quote->'lines') loop
    select quantity-reserved into available from public.inventory where product_id=(line->>'productId')::uuid;
    if available is null or available<(line->>'quantity')::integer then raise exception 'insufficient stock for %',line->>'name'; end if;
  end loop;
  insert into public.orders(user_id,subtotal,discount,shipping,total,currency,shipping_address,coupon_code,tax_name,tax_rate,tax_amount,taxable_amount,quote_id)
  values(auth.uid(),(quote->>'subtotal')::numeric,(quote->>'discount')::numeric,(quote->>'shipping')::numeric,(quote->>'total')::numeric,'NGN',
    p_shipping_address||public.calculate_shipping(p_shipping_address->>'state',(quote->>'subtotal')::numeric-(quote->>'discount')::numeric),normalized_coupon,
    quote->'tax'->>'name',(quote->'tax'->>'rate')::numeric,coalesce((quote->'tax'->>'amount')::numeric,0),(quote->>'subtotal')::numeric-(quote->>'discount')::numeric,quote->>'quoteId')
  returning * into result;
  for line in select value from jsonb_array_elements(quote->'lines') loop
    insert into public.order_items(order_id,product_id,name,quantity,unit_price,regular_price,promotion_id)
    values(result.id,line->>'productId',line->>'name',(line->>'quantity')::integer,(line->>'unitPrice')::numeric,(line->>'regularPrice')::numeric,(line->>'promotionId')::uuid);
    update public.inventory set reserved=reserved+(line->>'quantity')::integer where product_id=(line->>'productId')::uuid;
  end loop;
  if coupon.id is not null then insert into public.coupon_reservations(order_id,coupon_id) values(result.id,coupon.id); end if;
  return result;
end;
$$;
-- A newly created routine otherwise receives PUBLIC execute by default.
revoke all on function public.create_checkout_order(jsonb,jsonb,text) from public,anon,authenticated;

-- Paid email work is durable and independent for each recipient.
create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),order_id uuid not null references public.orders(id),
  recipient text not null check(recipient in ('customer','admin')), attempts integer not null default 0,
  available_at timestamptz not null default now(), claimed_until timestamptz, delivered_at timestamptz,last_error text,
  unique(order_id,recipient)
);
alter table public.email_outbox enable row level security;
create policy "admins read email jobs" on public.email_outbox for select to authenticated using(public.is_admin());
grant select on public.email_outbox to authenticated;
create index email_outbox_due on public.email_outbox(available_at) where delivered_at is null;

drop trigger if exists clear_cart_after_successful_payment on public.payment_attempts;
-- Settlement is a single order transaction. The order lock precedes attempt locks.
create or replace function public.settle_payment_v2(p_reference text,p_success boolean,p_provider_response jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.payment_attempts; o public.orders; line public.order_items; remaining integer;
begin
  select * into a from public.payment_attempts where reference=p_reference;
  if a.id is null then raise exception 'payment not found'; end if;
  select * into o from public.orders where id=a.order_id for update;
  select * into a from public.payment_attempts where reference=p_reference for update;
  if a.user_id<>o.user_id or a.amount<>o.total or a.currency<>o.currency then
    insert into public.payment_reconciliation(reference,order_id,reason,details) values(a.reference,o.id,'identity_mismatch',coalesce(p_provider_response,'{}'))
    on conflict(reference) do update set details=excluded.details;
    return jsonb_build_object('outcome','needs_reconciliation','orderId',o.id);
  end if;
  if a.status='successful' then
    if o.status not in ('confirmed','processing','shipped','delivered') or o.reservation_released then
      insert into public.payment_reconciliation(reference,order_id,reason,details) values(a.reference,o.id,'successful_attempt_unconfirmed_order',coalesce(p_provider_response,'{}'))
      on conflict(reference) do update set details=excluded.details;
      return jsonb_build_object('outcome','needs_reconciliation','orderId',o.id);
    end if;
    return jsonb_build_object('outcome','already_settled','orderId',o.id);
  end if;
  if p_success and (o.status<>'pending' or o.reservation_released or a.status='refunded' or exists(select 1 from public.payment_attempts where order_id=o.id and status='successful')) then
    insert into public.payment_reconciliation(reference,order_id,reason,details) values(a.reference,o.id,'late_or_duplicate_payment',coalesce(p_provider_response,'{}'))
    on conflict(reference) do update set details=excluded.details;
    return jsonb_build_object('outcome','needs_reconciliation','orderId',o.id);
  end if;
  -- A failed older attempt cannot cancel a replacement attempt.
  if not p_success and (a.status<>'pending' or exists(select 1 from public.payment_attempts where order_id=o.id and status='pending' and id<>a.id)) then
    update public.payment_attempts set status='failed',provider_response=p_provider_response where id=a.id and status='pending';
    return jsonb_build_object('outcome','released','orderId',o.id);
  end if;
  perform 1 from public.inventory where product_id in(select product_id::uuid from public.order_items where order_id=o.id) order by product_id for update;
  if p_success then
    if exists(select 1 from public.order_items l left join public.inventory i on i.product_id=l.product_id::uuid where l.order_id=o.id and (i.product_id is null or i.quantity<l.quantity or i.reserved<l.quantity)) then
      insert into public.payment_reconciliation(reference,order_id,reason,details) values(a.reference,o.id,'stock_mismatch',coalesce(p_provider_response,'{}')) on conflict(reference) do nothing;
      return jsonb_build_object('outcome','needs_reconciliation','orderId',o.id);
    end if;
    update public.payment_attempts set status='successful',provider_response=p_provider_response,paid_at=coalesce(paid_at,now()) where id=a.id;
    for line in select * from public.order_items where order_id=o.id order by product_id loop
      update public.inventory set reserved=reserved-line.quantity,quantity=quantity-line.quantity where product_id=line.product_id::uuid;
      -- Subtract only what this order bought, preserving additions during hosted checkout.
      select greatest(0,quantity-line.quantity) into remaining from public.cart_items where user_id=o.user_id and product_id=line.product_id::uuid for update;
      if remaining=0 then delete from public.cart_items where user_id=o.user_id and product_id=line.product_id::uuid;
      elsif remaining>0 then update public.cart_items set quantity=remaining where user_id=o.user_id and product_id=line.product_id::uuid; end if;
    end loop;
    update public.orders set status='confirmed',payment_reference=a.reference where id=o.id;
    update public.coupons set used_count=used_count+1 where id in(select coupon_id from public.coupon_reservations where order_id=o.id and status='reserved');
    update public.coupon_reservations set status='consumed' where order_id=o.id and status='reserved';
    insert into public.email_outbox(order_id,recipient) values(o.id,'customer'),(o.id,'admin') on conflict do nothing;
    insert into public.order_tracking_events(order_id,status,location,description) values(o.id,'confirmed','Emeritus Gadget','Payment confirmed');
    insert into public.notifications(user_id,title,message,link) values(o.user_id,'Payment confirmed','Your order '||o.order_number||' is confirmed.','/account/orders');
    return jsonb_build_object('outcome','settled','orderId',o.id);
  end if;
  update public.payment_attempts set status='failed',provider_response=p_provider_response where id=a.id;
  if not o.reservation_released and o.status='pending' then
    for line in select * from public.order_items where order_id=o.id order by product_id loop
      update public.inventory set reserved=greatest(0,reserved-line.quantity) where product_id=line.product_id::uuid;
    end loop;
    update public.orders set status='cancelled',reservation_released=true where id=o.id;
    update public.coupon_reservations set status='released' where order_id=o.id and status='reserved';
    insert into public.order_tracking_events(order_id,status,location,description) values(o.id,'cancelled','Emeritus Gadget','Checkout closed without a confirmed payment');
    insert into public.notifications(user_id,title,message,link) values(o.user_id,'Checkout closed','Your unpaid order '||o.order_number||' was cancelled.','/account/orders');
  end if;
  return jsonb_build_object('outcome','released','orderId',o.id);
end;
$$;
revoke all on function public.settle_payment_v2(text,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.settle_payment_v2(text,boolean,jsonb) to service_role;
create or replace function public.settle_payment(p_reference text,p_success boolean,p_provider_response jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin perform public.settle_payment_v2(p_reference,p_success,p_provider_response); end;
$$;
revoke all on function public.settle_payment(text,boolean,jsonb) from public,anon,authenticated;
grant execute on function public.settle_payment(text,boolean,jsonb) to service_role;
-- Do not cancel a payment solely because the merchant timeout elapsed.
create or replace function public.release_expired_checkout_payments() returns integer language sql security definer set search_path='' as $$ select 0; $$;

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
-- Zero-total orders settle locally and never reach a provider.
alter table public.payment_attempts drop constraint if exists payment_attempts_amount_check;
alter table public.payment_attempts add constraint payment_attempts_amount_check check(amount>=0);
revoke all on function public.create_checkout_payment_v3(jsonb,jsonb,uuid,text,text,text,text) from public,anon;
grant execute on function public.create_checkout_payment_v3(jsonb,jsonb,uuid,text,text,text,text) to authenticated;
-- Legacy v2 overloads were revoked by the catalog lookup at the start.

create or replace function public.claim_payment_initialization(p_reference text) returns boolean
language plpgsql security definer set search_path='' as $$
declare claimed boolean;
begin
  update public.payment_attempts set initialization_claimed_at=now() where reference=p_reference and status='pending'
    and (initialization_claimed_at is null or initialization_claimed_at<now()-interval '2 minutes')
    and authorization_url is null and checkout_url is null returning true into claimed;
  return coalesce(claimed,false);
end;
$$;
revoke all on function public.claim_payment_initialization(text) from public,anon,authenticated;
grant execute on function public.claim_payment_initialization(text) to service_role;

-- New rows must match the order even if a future caller accidentally gains insert access.
create function public.validate_payment_identity() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.orders where id=new.order_id and user_id=new.user_id and total=new.amount and currency=new.currency) then raise exception 'payment identity mismatch'; end if;
  return new;
end;
$$;
create trigger payment_identity_guard before insert or update of order_id,user_id,amount,currency on public.payment_attempts for each row execute function public.validate_payment_identity();

-- Prevent deletion of stock/media dependencies required to settle pending orders.
create function public.protect_pending_product() returns trigger language plpgsql set search_path='' as $$
begin
  if exists(select 1 from public.order_items l join public.orders o on o.id=l.order_id where l.product_id=old.id::text and o.status='pending') then raise exception 'archive this product while payments are pending'; end if;
  return old;
end;
$$;
create trigger protect_pending_product before delete on public.products for each row execute function public.protect_pending_product();

create function public.protect_order_pricing() returns trigger language plpgsql set search_path='' as $$
begin
  if new.total is distinct from old.total or new.subtotal is distinct from old.subtotal or new.discount is distinct from old.discount
    or new.shipping is distinct from old.shipping or new.currency is distinct from old.currency or new.user_id is distinct from old.user_id
    or new.tax_amount is distinct from old.tax_amount then raise exception 'order pricing is immutable'; end if;
  return new;
end;
$$;
create trigger order_pricing_guard before update on public.orders for each row execute function public.protect_order_pricing();

commit;
notify pgrst,'reload schema';
