begin;
-- Historical rows predating paid_at use their recorded settlement/update time.
update public.payment_attempts set paid_at=updated_at where status='successful' and paid_at is null;
grant execute on function public.effective_product_price(uuid) to anon,authenticated;
create index reviews_approved_product on public.product_reviews(product_id) where status='approved';
create view public.storefront_catalog with(security_invoker=true) as
select p.id,p.slug,p.name,p.description,p.image_url,(pricing.value->>'price')::numeric as price,
  case when (pricing.value->>'price')::numeric<p.price then p.price else p.compare_at_price end as compare_at_price,
  p.featured,p.created_at,p.updated_at,p.seo_title,p.seo_description,p.category_id,p.brand_id,
  c.slug category_slug,b.slug brand_slug,
  jsonb_build_object('id',c.id,'slug',c.slug,'name',c.name) categories,
  jsonb_build_object('name',b.name) brands,
  jsonb_build_object('quantity',i.quantity,'reserved',i.reserved) inventory,
  coalesce(r.rating,0) rating,coalesce(r.review_count,0) review_count,
  pricing.value->>'promotionId' promotion_id,
  i.quantity-i.reserved as available
from public.products p
left join public.categories c on c.id=p.category_id and c.active
left join public.brands b on b.id=p.brand_id and b.active
left join public.inventory i on i.product_id=p.id
left join lateral (select avg(rating) rating,count(*) review_count from public.product_reviews where product_id=p.id and status='approved') r on true
cross join lateral (select public.effective_product_price(p.id) value) pricing
where p.active;
grant select on public.storefront_catalog to anon,authenticated;

create function public.catalog_facets() returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('maxPrice',coalesce((select max(price) from public.storefront_catalog),0),
    'brands',coalesce((select jsonb_agg(jsonb_build_object('name',name,'slug',slug) order by name) from public.brands where active),'[]'),
    'categories',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'slug',c.slug,'image_url',c.image_url,'count',(select count(*) from public.products p where p.category_id=c.id and p.active)) order by c.display_order,c.id) from public.categories c where c.active),'[]'));
$$;
revoke all on function public.catalog_facets() from public;
grant execute on function public.catalog_facets() to anon,authenticated;

create function public.admin_financial_summary(p_from timestamptz default '-infinity',p_to timestamptz default 'infinity') returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  return jsonb_build_object(
    'collected',(select coalesce(sum(amount),0) from public.payment_attempts where status='successful' and paid_at>=p_from and paid_at<p_to),
    'discounts',(select coalesce(sum(o.discount),0) from public.orders o where exists(select 1 from public.payment_attempts a where a.order_id=o.id and a.status='successful' and a.paid_at>=p_from and a.paid_at<p_to)),
    'shipping',(select coalesce(sum(o.shipping),0) from public.orders o where exists(select 1 from public.payment_attempts a where a.order_id=o.id and a.status='successful' and a.paid_at>=p_from and a.paid_at<p_to)),
    'orders',(select count(*) from public.orders where created_at>=p_from and created_at<p_to),
    'lowStock',(select count(*) from public.inventory where quantity-reserved<=low_stock_threshold),
    'daily',coalesce((select jsonb_agg(day) from(select (paid_at at time zone 'Africa/Lagos')::date date,sum(amount) amount from public.payment_attempts where status='successful' and paid_at>=p_from and paid_at<p_to group by 1 order by 1) day),'[]')
  );
end;
$$;
revoke all on function public.admin_financial_summary(timestamptz,timestamptz) from public,anon;
grant execute on function public.admin_financial_summary(timestamptz,timestamptz) to authenticated;

create function public.admin_customer_page(p_page integer default 1)
returns table(id uuid,first_name text,last_name text,phone text,orders bigint,spent numeric)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  return query select p.id,p.first_name,p.last_name,p.phone,
    (select count(*) from public.orders o where o.user_id=p.id),
    (select coalesce(sum(a.amount),0) from public.payment_attempts a where a.user_id=p.id and a.status='successful')
  from public.profiles p where p.role='customer' order by p.created_at desc,p.id limit 25 offset (greatest(1,least(p_page,100000))-1)*25;
end;
$$;
revoke all on function public.admin_customer_page(integer) from public,anon;
grant execute on function public.admin_customer_page(integer) to authenticated;

create view public.storefront_reviews with(security_barrier=true) as
select r.id,r.product_id,r.rating,r.title,r.body,r.created_at,r.verified_purchase,
  coalesce(nullif(trim(p.first_name||' '||left(p.last_name,1)),''),'Customer') as author
from public.product_reviews r left join public.profiles p on p.id=r.user_id where r.status='approved';
grant select on public.storefront_reviews to anon,authenticated;

create function public.protect_referenced_media() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if exists(select 1 from public.products where image_url like '%/'||old.path)
    or exists(select 1 from public.categories where image_url like '%/'||old.path)
    or exists(select 1 from public.brands where logo_url like '%/'||old.path)
    or exists(select 1 from public.hero_slides where image_url like '%/'||old.path)
    or exists(select 1 from public.promotions where image_url like '%/'||old.path)
    or exists(select 1 from public.homepage_sections where content::text like '%'||old.path||'%') then raise exception 'media is still referenced'; end if;
  return old;
end;
$$;
create trigger protect_referenced_media before delete on public.media_assets for each row execute function public.protect_referenced_media();
create function public.resolve_payment_review(p_reference text,p_note text) returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  if length(trim(p_note)) not between 20 and 1000 then raise exception 'resolution evidence required'; end if;
  update public.payment_reconciliation set resolved_at=now(),details=details||jsonb_build_object('resolution',trim(p_note),'reviewedBy',auth.uid()) where reference=p_reference and resolved_at is null;
end;
$$;
revoke all on function public.resolve_payment_review(text,text) from public,anon;
grant execute on function public.resolve_payment_review(text,text) to authenticated;
-- Bulk removal archives products in the application; disable the legacy destructive RPC.
do $$ declare routine regprocedure; begin
  for routine in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='admin_delete_all_products' and p.prokind='f'
  loop execute format('revoke all on function %s from public,anon,authenticated',routine); end loop;
end $$;
commit;
notify pgrst,'reload schema';
