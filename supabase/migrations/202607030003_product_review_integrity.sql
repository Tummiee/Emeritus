alter table public.product_reviews
  add column if not exists verified_purchase boolean not null default false;

-- Retain the newest submission if historical duplicate reviews exist.
delete from public.product_reviews older
using public.product_reviews newer
where older.product_id = newer.product_id
  and older.user_id = newer.user_id
  and older.user_id is not null
  and (
    older.created_at < newer.created_at
    or (older.created_at = newer.created_at and older.id < newer.id)
  );

create unique index if not exists product_reviews_one_per_customer
  on public.product_reviews(product_id, user_id)
  where user_id is not null;

create policy "customers read own reviews"
  on public.product_reviews
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
