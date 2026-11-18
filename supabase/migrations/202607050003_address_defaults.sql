create or replace function public.set_default_address(p_address_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if not exists (
    select 1
    from public.addresses
    where id = p_address_id
      and user_id = auth.uid()
  ) then
    raise exception 'address not found';
  end if;

  update public.addresses
  set is_default = false
  where user_id = auth.uid()
    and is_default;

  update public.addresses
  set is_default = true
  where id = p_address_id
    and user_id = auth.uid();
end;
$$;

revoke all on function public.set_default_address(uuid) from public, anon;
grant execute on function public.set_default_address(uuid) to authenticated;
