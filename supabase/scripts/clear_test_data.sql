-- DESTRUCTIVE: run only against a test/staging Supabase project.
-- Preserves products, categories, brands, inventory, media, promotions,
-- coupons, homepage content, tax rules, shipping zones, and admin accounts.

begin;

truncate table
  public.orders,
  public.cart_items,
  public.wishlist_items,
  public.addresses,
  public.repair_requests,
  public.notifications,
  public.product_reviews,
  public.payment_webhook_events,
  public.contact_messages,
  public.newsletter_subscribers,
  public.generated_reports,
  public.customer_profile_changes
restart identity cascade;

-- Coupon configuration remains, but test redemptions are reset.
update public.coupons set used_count = 0;

-- Remove test customer logins and their profiles; admin accounts are retained.
delete from auth.users auth_user
using public.profiles profile
where auth_user.id = profile.id
  and profile.role = 'customer';

commit;
