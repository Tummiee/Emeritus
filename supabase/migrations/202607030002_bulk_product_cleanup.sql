create or replace function public.admin_delete_all_products()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  deleted_count integer;
begin
  if not public.is_admin() then
    raise exception 'Administrator access required';
  end if;

  delete from public.wishlist_items
  where product_id in (select id::text from public.products);

  delete from public.media_assets
  where path like 'products/%';

  delete from public.products;
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke all on function public.admin_delete_all_products() from public;
grant execute on function public.admin_delete_all_products() to authenticated;
