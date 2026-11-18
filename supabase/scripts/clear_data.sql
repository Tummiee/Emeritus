-- MANUAL MAINTENANCE ONLY. Never include in application migrations.
begin;

-- Stop if no administrator account exists.
do $$
begin
  if not exists (
    select 1
    from public.profiles
    where role in ('admin', 'super_admin')
  ) then
    raise exception 'Reset stopped: no administrator account found.';
  end if;
end;
$$;

-- Clear activity, products, and stock.
-- No CASCADE: unexpected dependencies will block the reset.
truncate table
  public.order_items,
  public.order_tracking_events,
  public.payment_attempts,
  public.payment_webhook_events,
  public.orders,
  public.cart_items,
  public.wishlist_items,
  public.addresses,
  public.repair_requests,
  public.notifications,
  public.product_reviews,
  public.contact_messages,
  public.newsletter_subscribers,
  public.generated_reports,
  public.customer_profile_changes,
  public.promotion_products,
  public.inventory,
  public.products
restart identity restrict;

-- Keep coupon configuration but reset usage.
update public.coupons
set used_count = 0;

-- Delete customer logins.
-- Their profiles are removed through the existing foreign key.
-- Admin and super-admin accounts remain.
delete from auth.users u
using public.profiles p
where p.id = u.id
  and p.role = 'customer';

commit;

-- Show remaining administrator accounts.
select u.id, u.email, p.role
from auth.users u
join public.profiles p on p.id = u.id
where p.role in ('admin');
