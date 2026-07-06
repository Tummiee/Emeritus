create table if not exists public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  base_fee numeric(12,2) not null check (base_fee >= 0),
  free_shipping_threshold numeric(12,2)
    check (free_shipping_threshold is null or free_shipping_threshold >= 0),
  estimated_days_min integer not null check (estimated_days_min > 0),
  estimated_days_max integer not null check (estimated_days_max >= estimated_days_min),
  is_fallback boolean not null default false,
  active boolean not null default true,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shipping_zone_states (
  zone_id uuid not null references public.shipping_zones(id) on delete cascade,
  state_name text primary key,
  created_at timestamptz not null default now()
);

create unique index if not exists shipping_zones_one_fallback
  on public.shipping_zones(is_fallback)
  where is_fallback;

create index if not exists shipping_zones_active_idx
  on public.shipping_zones(active, is_fallback);
create index if not exists shipping_zone_states_zone_idx
  on public.shipping_zone_states(zone_id);

alter table public.shipping_zones enable row level security;
alter table public.shipping_zone_states enable row level security;

create policy "public reads active shipping zones"
  on public.shipping_zones for select
  using (active);
create policy "public reads active shipping zone states"
  on public.shipping_zone_states for select
  using (
    exists (
      select 1 from public.shipping_zones
      where shipping_zones.id = shipping_zone_states.zone_id
        and shipping_zones.active
    )
  );
create policy "admins manage shipping zones"
  on public.shipping_zones for all
  using (public.is_admin()) with check (public.is_admin());
create policy "admins manage shipping zone states"
  on public.shipping_zone_states for all
  using (public.is_admin()) with check (public.is_admin());

grant select on public.shipping_zones, public.shipping_zone_states
  to anon, authenticated;
grant insert, update, delete on public.shipping_zones, public.shipping_zone_states
  to authenticated;

create trigger shipping_zones_updated_at
  before update on public.shipping_zones
  for each row execute function public.set_updated_at();

create or replace function public.save_shipping_zone(
  p_id uuid,
  p_name text,
  p_base_fee numeric,
  p_free_shipping_threshold numeric,
  p_estimated_days_min integer,
  p_estimated_days_max integer,
  p_is_fallback boolean,
  p_active boolean,
  p_states text[]
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_zone_id uuid;
  normalized_name text := trim(p_name);
begin
  if not public.is_admin() then
    raise exception 'administrator access required';
  end if;
  if normalized_name = '' or char_length(normalized_name) > 80 then
    raise exception 'invalid zone name';
  end if;
  if p_base_fee < 0
    or (p_free_shipping_threshold is not null and p_free_shipping_threshold < 0)
    or p_estimated_days_min < 1
    or p_estimated_days_max < p_estimated_days_min
  then
    raise exception 'invalid shipping values';
  end if;
  if not p_is_fallback and coalesce(cardinality(p_states), 0) = 0 then
    raise exception 'select at least one state';
  end if;

  if p_is_fallback then
    update public.shipping_zones
    set is_fallback = false
    where is_fallback and id is distinct from p_id;
  end if;

  if p_id is null then
    insert into public.shipping_zones (
      name, base_fee, free_shipping_threshold,
      estimated_days_min, estimated_days_max,
      is_fallback, active, updated_by
    ) values (
      normalized_name, p_base_fee, p_free_shipping_threshold,
      p_estimated_days_min, p_estimated_days_max,
      p_is_fallback, p_active, auth.uid()
    )
    returning id into v_zone_id;
  else
    update public.shipping_zones
    set name = normalized_name,
        base_fee = p_base_fee,
        free_shipping_threshold = p_free_shipping_threshold,
        estimated_days_min = p_estimated_days_min,
        estimated_days_max = p_estimated_days_max,
        is_fallback = p_is_fallback,
        active = p_active,
        updated_by = auth.uid()
    where id = p_id
    returning id into v_zone_id;
    if v_zone_id is null then raise exception 'shipping zone not found'; end if;
  end if;

  delete from public.shipping_zone_states where zone_id = v_zone_id;
  if not p_is_fallback then
    insert into public.shipping_zone_states(zone_id, state_name)
    select v_zone_id, state_name
    from unnest(p_states) as selected(state_name);
  end if;

  return v_zone_id;
end;
$$;

revoke all on function public.save_shipping_zone(
  uuid, text, numeric, numeric, integer, integer, boolean, boolean, text[]
) from public, anon;
grant execute on function public.save_shipping_zone(
  uuid, text, numeric, numeric, integer, integer, boolean, boolean, text[]
) to authenticated;

notify pgrst, 'reload schema';
