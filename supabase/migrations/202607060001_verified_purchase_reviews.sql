create or replace function public.has_delivered_product(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders order_record
    join public.order_items order_item
      on order_item.order_id = order_record.id
    where order_record.user_id = auth.uid()
      and order_record.status = 'delivered'
      and order_item.product_id = p_product_id::text
  );
$$;

revoke all on function public.has_delivered_product(uuid) from public, anon;
grant execute on function public.has_delivered_product(uuid) to authenticated;

drop policy if exists "customers submit reviews" on public.product_reviews;
create policy "verified customers submit reviews"
  on public.product_reviews
  for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'pending'
    and verified_purchase
    and public.has_delivered_product(product_id)
  );

notify pgrst, 'reload schema';
