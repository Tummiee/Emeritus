create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  image_url text,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brands (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text not null default '',
  logo_url text,
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sku text not null unique,
  description text not null default '',
  image_url text,
  category_id uuid references public.categories(id) on delete set null,
  brand_id uuid references public.brands(id) on delete set null,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  cost_price numeric(12,2) check (cost_price is null or cost_price >= 0),
  featured boolean not null default false,
  active boolean not null default true,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory (
  product_id uuid primary key references public.products(id) on delete cascade,
  quantity integer not null default 0 check (quantity >= 0),
  reserved integer not null default 0 check (reserved >= 0 and reserved <= quantity),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  updated_at timestamptz not null default now()
);

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  path text not null unique,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  alt_text text not null default '',
  uploaded_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text not null default '',
  image_url text not null,
  image_alt text not null,
  cta_label text not null default '',
  cta_href text not null default '',
  active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.homepage_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text not null unique,
  title text not null,
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  active boolean not null default true,
  display_order integer not null default 0,
  updated_at timestamptz not null default now()
);

create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null default '',
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12,2) not null check (discount_value > 0),
  minimum_amount numeric(12,2) not null default 0,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  used_count integer not null default 0,
  starts_at timestamptz,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  title text not null default '',
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  admin_response text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_settings (
  key text primary key,
  value jsonb not null,
  label text not null,
  group_name text not null default 'general',
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);

create table public.generated_reports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  report_type text not null check (report_type in ('sales', 'orders', 'customers', 'inventory', 'repairs')),
  period_start date not null,
  period_end date not null,
  data jsonb not null,
  generated_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

insert into public.store_settings(key, value, label, group_name) values
('store_name', '"Emeritus Global Gadgets"', 'Store name', 'general'),
('support_email', '"Emeritusglobalresources@gmail.com"', 'Support email', 'contact'),
('support_phone', '"09048026350"', 'Support phone', 'contact'),
('currency', '"NGN"', 'Currency', 'commerce'),
('low_stock_default', '5', 'Default low-stock threshold', 'inventory')
on conflict (key) do nothing;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('admin-media', 'admin-media', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy "public reads media" on storage.objects for select using (bucket_id = 'admin-media');
create policy "admins upload media" on storage.objects for insert to authenticated with check (bucket_id = 'admin-media' and public.is_admin());
create policy "admins update media" on storage.objects for update to authenticated using (bucket_id = 'admin-media' and public.is_admin());
create policy "admins delete media" on storage.objects for delete to authenticated using (bucket_id = 'admin-media' and public.is_admin());

do $$
declare table_name text;
begin
  foreach table_name in array array['categories','brands','products','inventory','media_assets','hero_slides','homepage_sections','coupons','product_reviews','store_settings','generated_reports']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy "admins manage %1$s" on public.%1$I for all using (public.is_admin()) with check (public.is_admin())', table_name);
  end loop;
end $$;

create policy "public reads active categories" on public.categories for select using (active);
create policy "public reads active brands" on public.brands for select using (active);
create policy "public reads active products" on public.products for select using (active);
create policy "public reads inventory" on public.inventory for select using (true);
create policy "public reads active hero slides" on public.hero_slides for select using (active);
create policy "public reads active homepage sections" on public.homepage_sections for select using (active);
create policy "public reads approved reviews" on public.product_reviews for select using (status = 'approved');

grant select on public.categories, public.brands, public.products, public.inventory, public.hero_slides, public.homepage_sections, public.product_reviews to anon, authenticated;
grant select, insert, update, delete on public.categories, public.brands, public.products, public.inventory, public.media_assets, public.hero_slides, public.homepage_sections, public.coupons, public.product_reviews, public.store_settings, public.generated_reports to authenticated;

create policy "admins update customer profiles" on public.profiles for update using (public.is_admin()) with check (public.is_admin());
create policy "admins manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage order items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());
grant insert, update, delete on public.orders, public.order_items to authenticated;

create trigger categories_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger brands_updated_at before update on public.brands for each row execute function public.set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger inventory_updated_at before update on public.inventory for each row execute function public.set_updated_at();
create trigger hero_slides_updated_at before update on public.hero_slides for each row execute function public.set_updated_at();
create trigger homepage_sections_updated_at before update on public.homepage_sections for each row execute function public.set_updated_at();
create trigger coupons_updated_at before update on public.coupons for each row execute function public.set_updated_at();
create trigger product_reviews_updated_at before update on public.product_reviews for each row execute function public.set_updated_at();

create or replace function public.create_product_inventory() returns trigger language plpgsql security definer set search_path = '' as $$
begin insert into public.inventory(product_id) values (new.id) on conflict do nothing; return new; end;
$$;
create trigger product_inventory_created after insert on public.products for each row execute function public.create_product_inventory();
