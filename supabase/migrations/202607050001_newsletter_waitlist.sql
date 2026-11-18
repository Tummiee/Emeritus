-- Newsletter waitlist metadata and integrity.
-- Signups are written by the server-side API with the service-role client;
-- authenticated admins can manage them through the existing admin policy.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  active boolean not null default true,
  source text not null default 'homepage',
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.newsletter_subscribers
  add column if not exists source text not null default 'homepage',
  add column if not exists subscribed_at timestamptz not null default now(),
  add column if not exists unsubscribed_at timestamptz;

alter table public.newsletter_subscribers enable row level security;

grant select, update, delete
  on public.newsletter_subscribers
  to authenticated;

do $$
begin
  if to_regprocedure('public.is_admin()') is not null
    and not exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'newsletter_subscribers'
        and policyname = 'admins manage newsletter subscribers'
    )
  then
    create policy "admins manage newsletter subscribers"
      on public.newsletter_subscribers
      for all
      to authenticated
      using (public.is_admin())
      with check (public.is_admin());
  end if;
end
$$;

-- Normalize historical entries before enforcing case-insensitive uniqueness.
delete from public.newsletter_subscribers older
using public.newsletter_subscribers newer
where lower(trim(older.email)) = lower(trim(newer.email))
  and (
    older.created_at < newer.created_at
    or (older.created_at = newer.created_at and older.id < newer.id)
  );

update public.newsletter_subscribers
set email = lower(trim(email));

update public.newsletter_subscribers
set unsubscribed_at = coalesce(unsubscribed_at, updated_at)
where not active;

update public.newsletter_subscribers
set unsubscribed_at = null
where active;

create unique index if not exists newsletter_subscribers_email_ci_idx
  on public.newsletter_subscribers (lower(email));

create index if not exists newsletter_subscribers_active_created_idx
  on public.newsletter_subscribers (active, created_at desc);

alter table public.newsletter_subscribers
  drop constraint if exists newsletter_subscribers_email_normalized;

alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_email_normalized
  check (email = lower(trim(email)));

alter table public.newsletter_subscribers
  drop constraint if exists newsletter_subscribers_unsubscribe_state;

alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_unsubscribe_state
  check (
    (active and unsubscribed_at is null)
    or (not active and unsubscribed_at is not null)
  );
