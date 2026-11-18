begin;
create table public.request_limits (key text primary key,window_start timestamptz not null,hits integer not null);
alter table public.request_limits enable row level security;
create function public.consume_rate_limit(p_key text,p_limit integer,p_window_seconds integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare total integer;
begin
  insert into public.request_limits(key,window_start,hits) values(p_key,now(),1)
  on conflict(key) do update set hits=case when public.request_limits.window_start<now()-make_interval(secs=>p_window_seconds) then 1 else public.request_limits.hits+1 end,
    window_start=case when public.request_limits.window_start<now()-make_interval(secs=>p_window_seconds) then now() else public.request_limits.window_start end
  returning hits into total;
  return total<=p_limit;
end;
$$;
revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;

create function public.claim_email_jobs() returns setof public.email_outbox language sql security definer set search_path='' as $$
  update public.email_outbox set claimed_until=now()+interval '5 minutes',attempts=attempts+1
  where id in(select id from public.email_outbox where delivered_at is null and available_at<=now() and (claimed_until is null or claimed_until<now()) order by available_at limit 10 for update skip locked)
  returning *;
$$;
revoke all on function public.claim_email_jobs() from public,anon,authenticated;
grant execute on function public.claim_email_jobs() to service_role;

create function public.admin_transition_order(p_id uuid,p_status public.order_status,p_refund_reference text default null)
returns void language plpgsql security definer set search_path='' as $$
declare o public.orders; ref text; line public.order_items;
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  select * into o from public.orders where id=p_id for update;
  if o.id is null then raise exception 'order not found'; end if;
  if o.status=p_status then return; end if;
  if o.status='pending' and p_status='cancelled' then
    if exists(select 1 from public.payment_attempts where order_id=o.id and status='pending') then raise exception 'reconcile the pending provider payment before cancellation'; end if;
    if not o.reservation_released then
      perform 1 from public.inventory where product_id in(select product_id::uuid from public.order_items where order_id=o.id) order by product_id for update;
      for line in select * from public.order_items where order_id=o.id order by product_id loop
        update public.inventory set reserved=greatest(0,reserved-line.quantity) where product_id=line.product_id::uuid;
      end loop;
      update public.orders set reservation_released=true where id=o.id;
      update public.coupon_reservations set status='released' where order_id=o.id and status='reserved';
    end if;
  elsif p_status='refunded' and o.status in ('confirmed','processing','shipped','delivered') then
    if length(trim(coalesce(p_refund_reference,'')))<3 then raise exception 'provider refund evidence required'; end if;
    update public.payment_attempts set status='refunded' where order_id=o.id and status='successful';
  elsif not ((o.status='confirmed' and p_status='processing') or(o.status='processing' and p_status='shipped') or(o.status='shipped' and p_status='delivered')) then
    raise exception 'invalid order transition';
  end if;
  if p_status in ('processing','shipped','delivered') and not exists(select 1 from public.payment_attempts where order_id=o.id and status='successful') then raise exception 'order is not paid'; end if;
  update public.orders set status=p_status,refund_reference=coalesce(nullif(trim(p_refund_reference),''),refund_reference) where id=o.id;
  insert into public.order_tracking_events(order_id,status,location,description) values(o.id,p_status::text,'Emeritus Gadget','Order '||p_status::text);
  insert into public.notifications(user_id,title,message,link) values(o.user_id,'Order updated','Your order '||o.order_number||' is '||p_status::text,'/account/orders');
end;
$$;
revoke all on function public.admin_transition_order(uuid,public.order_status,text) from public,anon;
grant execute on function public.admin_transition_order(uuid,public.order_status,text) to authenticated;

create function public.save_customer_address(p_values jsonb) returns void language plpgsql security definer set search_path='' as $$
declare address_id uuid:=nullif(p_values->>'id','')::uuid; make_default boolean:=coalesce((p_values->>'is_default')::boolean,false);
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('address:'||auth.uid()::text,0));
  if address_id is not null and not exists(select 1 from public.addresses where id=address_id and user_id=auth.uid()) then raise exception 'address not found'; end if;
  if make_default then update public.addresses set is_default=false where user_id=auth.uid() and is_default; end if;
  insert into public.addresses(id,user_id,label,recipient_name,phone,line1,line2,city,state,postal_code,country,is_default)
  values(coalesce(address_id,gen_random_uuid()),auth.uid(),p_values->>'label',p_values->>'recipient_name',p_values->>'phone',p_values->>'line1',p_values->>'line2',p_values->>'city',p_values->>'state',p_values->>'postal_code',p_values->>'country',make_default)
  on conflict(id) do update set label=excluded.label,recipient_name=excluded.recipient_name,phone=excluded.phone,line1=excluded.line1,line2=excluded.line2,
    city=excluded.city,state=excluded.state,postal_code=excluded.postal_code,country=excluded.country,is_default=excluded.is_default;
end;
$$;
revoke all on function public.save_customer_address(jsonb) from public,anon;
grant execute on function public.save_customer_address(jsonb) to authenticated;
create or replace function public.set_default_address(p_address_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  perform pg_advisory_xact_lock(hashtextextended('address:'||auth.uid()::text,0));
  if not exists(select 1 from public.addresses where id=p_address_id and user_id=auth.uid()) then raise exception 'address not found'; end if;
  update public.addresses set is_default=false where user_id=auth.uid() and is_default;
  update public.addresses set is_default=true where id=p_address_id and user_id=auth.uid();
end;
$$;
create policy "customers cleanup repair images" on storage.objects for delete to authenticated
using(bucket_id='repair-images' and (storage.foldername(name))[1]=auth.uid()::text and not exists(select 1 from public.repair_requests where name=any(image_paths)));
drop policy if exists "customers create own repairs" on public.repair_requests;
create policy "customers create own repairs" on public.repair_requests for insert to authenticated
with check(user_id=auth.uid() and status='submitted' and reviewed_by is null and reviewed_at is null and admin_note is null and status_note is null);

create function public.validate_repair_appointment() returns trigger language plpgsql set search_path='' as $$
begin
  if (tg_op='INSERT' or new.booking_date is distinct from old.booking_date or new.booking_time is distinct from old.booking_time)
    and (new.booking_date+new.booking_time) at time zone 'Africa/Lagos' <= now() then raise exception 'appointment must be in the future'; end if;
  return new;
end;
$$;
create trigger repair_future_appointment before insert or update on public.repair_requests for each row execute function public.validate_repair_appointment();

create function public.admin_save_product(p_id uuid,p_values jsonb,p_inventory jsonb default null) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; row public.products;
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  if p_id is null then
    row:=jsonb_populate_record(null::public.products,p_values-'cost_price');
    insert into public.products(name,slug,sku,description,image_url,category_id,brand_id,price,compare_at_price,featured,active,seo_title,seo_description)
    values(row.name,row.slug,row.sku,coalesce(row.description,''),row.image_url,row.category_id,row.brand_id,row.price,row.compare_at_price,coalesce(row.featured,false),coalesce(row.active,true),row.seo_title,row.seo_description) returning id into result;
  else
    select * into row from public.products where id=p_id for update;
    if row.id is null then raise exception 'product not found'; end if;
    row:=jsonb_populate_record(row,p_values-'cost_price');
    update public.products set name=row.name,slug=row.slug,sku=row.sku,description=row.description,image_url=row.image_url,category_id=row.category_id,brand_id=row.brand_id,
      price=row.price,compare_at_price=row.compare_at_price,featured=row.featured,active=row.active,seo_title=row.seo_title,seo_description=row.seo_description where id=p_id returning id into result;
  end if;
  if p_values ? 'cost_price' then insert into public.product_costs values(result,(p_values->>'cost_price')::numeric) on conflict(product_id) do update set cost_price=excluded.cost_price; end if;
  if p_inventory is not null then
    update public.inventory set quantity=(p_inventory->>'quantity')::integer,low_stock_threshold=(p_inventory->>'low_stock_threshold')::integer where product_id=result;
  end if;
  return result;
end;
$$;
revoke all on function public.admin_save_product(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.admin_save_product(uuid,jsonb,jsonb) to authenticated;

create function public.save_promotion(p_id uuid,p_values jsonb,p_relations jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare row public.promotions; result uuid; item jsonb;
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  if p_id is not null then select * into row from public.promotions where id=p_id for update; if row.id is null then raise exception 'promotion not found'; end if; end if;
  row:=jsonb_populate_record(row,p_values);
  if p_id is null then
    insert into public.promotions(name,promotion_type,eyebrow,headline,description,image_url,image_alt,starts_at,ends_at,coupon_id,active,display_order)
    values(row.name,row.promotion_type,row.eyebrow,row.headline,row.description,row.image_url,row.image_alt,row.starts_at,row.ends_at,row.coupon_id,row.active,row.display_order) returning id into result;
  else
    update public.promotions set name=row.name,promotion_type=row.promotion_type,eyebrow=row.eyebrow,headline=row.headline,description=row.description,image_url=row.image_url,image_alt=row.image_alt,
      starts_at=row.starts_at,ends_at=row.ends_at,coupon_id=row.coupon_id,active=row.active,display_order=row.display_order where id=p_id returning id into result;
    delete from public.promotion_products where promotion_id=p_id;
  end if;
  for item in select value from jsonb_array_elements(p_relations) loop
    if not exists(select 1 from public.products where id=(item->>'product_id')::uuid and active and ((item->>'sale_price') is null or (item->>'sale_price')::numeric between 0 and price-0.01)) then raise exception 'invalid offer product or price'; end if;
    insert into public.promotion_products(promotion_id,product_id,sale_price,display_order) values(result,(item->>'product_id')::uuid,(item->>'sale_price')::numeric,(item->>'display_order')::integer);
  end loop;
  return result;
end;
$$;
revoke all on function public.save_promotion(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.save_promotion(uuid,jsonb,jsonb) to authenticated;

create function public.admin_update_inventory(p_product_id uuid,p_quantity integer,p_threshold integer)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  perform 1 from public.inventory where product_id=p_product_id for update;
  update public.inventory set quantity=p_quantity,low_stock_threshold=p_threshold where product_id=p_product_id;
  if not found then raise exception 'inventory not found'; end if;
end;
$$;
revoke all on function public.admin_update_inventory(uuid,integer,integer) from public,anon;
grant execute on function public.admin_update_inventory(uuid,integer,integer) to authenticated;
commit;
notify pgrst,'reload schema';
