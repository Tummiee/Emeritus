alter table public.profiles
  add column role text not null default 'customer'
  constraint profiles_role_check check (role in ('customer', 'admin'));

-- The earlier profile policy is row-scoped; column grants prevent customers
-- from promoting themselves by writing the newly added role column.
revoke insert, update on public.profiles from authenticated;
grant insert (id, first_name, last_name, phone, avatar_url) on public.profiles to authenticated;
grant update (first_name, last_name, phone, avatar_url, updated_at) on public.profiles to authenticated;

alter table public.repair_requests
  add column brand text,
  add column booking_date date,
  add column booking_time time,
  add column image_paths text[] not null default '{}',
  add column admin_note text,
  add column status_note text,
  add column reviewed_by uuid references auth.users(id),
  add column reviewed_at timestamptz;

update public.repair_requests
set brand = coalesce(brand, 'Unknown'),
    booking_date = coalesce(booking_date, current_date),
    booking_time = coalesce(booking_time, time '09:00');

alter table public.repair_requests
  add constraint repair_brand_required check (length(brand) between 1 and 80),
  add constraint repair_booking_date_required check (booking_date is not null),
  add constraint repair_booking_time_required check (booking_time is not null),
  add constraint repair_image_limit check (cardinality(image_paths) <= 5);

create table public.repair_device_types (
  id bigint generated always as identity primary key,
  name text not null unique,
  active boolean not null default true,
  display_order integer not null default 0
);

create table public.repair_brands (
  id bigint generated always as identity primary key,
  name text not null unique,
  active boolean not null default true,
  display_order integer not null default 0
);

insert into public.repair_device_types (name, display_order) values
  ('Smartphone', 10), ('Tablet', 20), ('Laptop', 30), ('Desktop', 40),
  ('Smartwatch', 50), ('Game Console', 60), ('Audio Device', 70), ('Other', 100);

insert into public.repair_brands (name, display_order) values
  ('Apple', 10), ('Samsung', 20), ('HP', 30), ('Dell', 40), ('Lenovo', 50),
  ('Tecno', 60), ('Infinix', 70), ('Xiaomi', 80), ('Sony', 90), ('Other', 100);

alter table public.repair_device_types enable row level security;
alter table public.repair_brands enable row level security;
create policy "device types are public" on public.repair_device_types for select using (active);
create policy "repair brands are public" on public.repair_brands for select using (active);
grant select on public.repair_device_types, public.repair_brands to anon, authenticated;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') $$;

create policy "admins read all repairs" on public.repair_requests for select using (public.is_admin());
create policy "admins update all repairs" on public.repair_requests for update using (public.is_admin()) with check (public.is_admin());
create policy "admins create notifications" on public.notifications for insert with check (public.is_admin());
create policy "admins read customer profiles" on public.profiles for select using (public.is_admin());
grant update on public.repair_requests to authenticated;
grant insert on public.notifications to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('repair-images', 'repair-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "customers upload own repair images" on storage.objects for insert to authenticated
with check (bucket_id = 'repair-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "customers read own repair images" on storage.objects for select to authenticated
using (bucket_id = 'repair-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "admins read repair images" on storage.objects for select to authenticated
using (bucket_id = 'repair-images' and public.is_admin());

create or replace function public.manage_repair_booking(
  p_booking_id uuid,
  p_status public.repair_status,
  p_message text,
  p_booking_date date default null,
  p_booking_time time default null
) returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  booking_user uuid;
  booking_reference text;
begin
  if not public.is_admin() then raise exception 'admin access required'; end if;
  if length(trim(coalesce(p_message, ''))) < 3 then raise exception 'customer message required'; end if;
  if p_status = 'rescheduled' and (p_booking_date is null or p_booking_time is null) then
    raise exception 'new appointment required';
  end if;

  update public.repair_requests
  set status = p_status,
      status_note = trim(p_message),
      booking_date = case when p_status = 'rescheduled' then p_booking_date else booking_date end,
      booking_time = case when p_status = 'rescheduled' then p_booking_time else booking_time end,
      reviewed_by = auth.uid(),
      reviewed_at = now()
  where id = p_booking_id
  returning user_id, reference into booking_user, booking_reference;

  if booking_user is null then raise exception 'booking not found'; end if;
  insert into public.notifications(user_id, title, message, link)
  values (
    booking_user,
    'Repair booking ' || replace(p_status::text, '_', ' '),
    trim(p_message),
    '/account/repairs'
  );
end;
$$;
grant execute on function public.manage_repair_booking(uuid, public.repair_status, text, date, time) to authenticated;

create index repair_requests_booking on public.repair_requests(booking_date, booking_time);
create index repair_requests_status on public.repair_requests(status, created_at desc);
