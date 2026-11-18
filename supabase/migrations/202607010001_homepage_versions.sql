create type public.homepage_version_status as enum ('DRAFT', 'PUBLISHED', 'ARCHIVED');

create table public.homepage_versions (
  id uuid primary key default gen_random_uuid(),
  version integer generated always as identity,
  status public.homepage_version_status not null default 'DRAFT',
  content jsonb not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  published_by uuid references auth.users(id),
  published_at timestamptz,
  constraint homepage_content_is_object check (jsonb_typeof(content) = 'object'),
  constraint homepage_publication_is_complete check (
    (status = 'PUBLISHED' and published_by is not null and published_at is not null)
    or status <> 'PUBLISHED'
  )
);

create unique index homepage_single_published_version
  on public.homepage_versions (status)
  where status = 'PUBLISHED';

create index homepage_versions_recent
  on public.homepage_versions (created_at desc);

alter table public.homepage_versions enable row level security;

create policy "published homepage is publicly readable"
  on public.homepage_versions
  for select
  using (status = 'PUBLISHED');

comment on table public.homepage_versions is
  'Versioned homepage aggregate. Content includes every section, image reference, product selection, navigation item, and footer setting.';
