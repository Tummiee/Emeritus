create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  promotion_type text not null default 'flash_sale'
    check (promotion_type in ('flash_sale', 'featured_offer', 'seasonal')),
  eyebrow text not null default '',
  headline text not null,
  description text not null default '',
  image_url text,
  image_alt text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  coupon_id uuid references public.coupons(id) on delete set null,
  active boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.promotion_products (
  promotion_id uuid not null references public.promotions(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  sale_price numeric(12,2) check (sale_price is null or sale_price >= 0),
  display_order integer not null default 0,
  primary key (promotion_id, product_id)
);

alter table public.promotions enable row level security;
alter table public.promotion_products enable row level security;

create policy "public reads active promotions"
  on public.promotions for select
  using (active);
create policy "public reads active promotion products"
  on public.promotion_products for select
  using (
    exists (
      select 1 from public.promotions
      where promotions.id = promotion_products.promotion_id
        and promotions.active
    )
  );
create policy "admins manage promotions"
  on public.promotions for all
  using (public.is_admin()) with check (public.is_admin());
create policy "admins manage promotion products"
  on public.promotion_products for all
  using (public.is_admin()) with check (public.is_admin());

grant select on public.promotions, public.promotion_products to anon, authenticated;
grant insert, update, delete on public.promotions, public.promotion_products to authenticated;

create trigger promotions_updated_at
  before update on public.promotions
  for each row execute function public.set_updated_at();

create index promotions_active_window_idx
  on public.promotions(active, starts_at, ends_at, display_order);
create index promotion_products_product_idx
  on public.promotion_products(product_id);
