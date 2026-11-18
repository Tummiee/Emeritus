begin;

drop function public.admin_update_inventory(uuid,integer,integer);

-- Keep three-argument callers working without changing their reservations.
create function public.admin_update_inventory(
  p_product_id uuid,
  p_quantity integer,
  p_threshold integer,
  p_reserved integer default null
)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not public.is_admin() then raise exception 'admin required'; end if;
  perform 1 from public.inventory where product_id=p_product_id for update;
  update public.inventory
    set quantity=p_quantity,
        reserved=coalesce(p_reserved,reserved),
        low_stock_threshold=p_threshold
    where product_id=p_product_id;
  if not found then raise exception 'inventory not found'; end if;
end;
$$;

revoke all on function public.admin_update_inventory(uuid,integer,integer,integer) from public,anon;
grant execute on function public.admin_update_inventory(uuid,integer,integer,integer) to authenticated;

commit;
notify pgrst,'reload schema';
