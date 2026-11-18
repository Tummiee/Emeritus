create table if not exists public.customer_profile_changes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  changed_by uuid references auth.users(id) on delete set null,
  previous_values jsonb not null,
  new_values jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists customer_profile_changes_customer_created_idx
  on public.customer_profile_changes(customer_id, created_at desc);

alter table public.customer_profile_changes enable row level security;

drop policy if exists "admins read customer profile changes"
  on public.customer_profile_changes;
create policy "admins read customer profile changes"
  on public.customer_profile_changes for select to authenticated
  using (public.is_admin());

grant select on public.customer_profile_changes to authenticated;

create or replace function public.admin_update_customer_profile(
  p_customer_id uuid,
  p_first_name text,
  p_last_name text,
  p_phone text
) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_profile public.profiles;
  next_first_name text := trim(p_first_name);
  next_last_name text := trim(p_last_name);
  next_phone text := nullif(trim(p_phone), '');
begin
  if not public.is_admin() then
    raise exception 'administrator access required';
  end if;

  if length(next_first_name) > 60
    or length(next_last_name) > 60
    or length(coalesce(next_phone, '')) > 30
  then
    raise exception 'invalid customer profile values';
  end if;

  select * into previous_profile
  from public.profiles
  where id = p_customer_id and role = 'customer'
  for update;

  if not found then
    raise exception 'customer profile not found';
  end if;

  update public.profiles
  set first_name = next_first_name,
      last_name = next_last_name,
      phone = next_phone
  where id = p_customer_id;

  if previous_profile.first_name is distinct from next_first_name
    or previous_profile.last_name is distinct from next_last_name
    or previous_profile.phone is distinct from next_phone
  then
    insert into public.customer_profile_changes (
      customer_id, changed_by, previous_values, new_values
    ) values (
      p_customer_id,
      auth.uid(),
      jsonb_build_object(
        'first_name', previous_profile.first_name,
        'last_name', previous_profile.last_name,
        'phone', previous_profile.phone
      ),
      jsonb_build_object(
        'first_name', next_first_name,
        'last_name', next_last_name,
        'phone', next_phone
      )
    );
  end if;
end;
$$;

revoke all on function public.admin_update_customer_profile(uuid, text, text, text)
  from public, anon;
grant execute on function public.admin_update_customer_profile(uuid, text, text, text)
  to authenticated;
