create table public.tax_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rate numeric(5,2) not null check (rate >= 0 and rate <= 100),
  country_code text not null check (char_length(country_code) = 2),
  applies_to text not null,
  active boolean not null default true,
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tax_rules_country_name_key unique (country_code, name)
);

alter table public.tax_rules enable row level security;

create policy "public reads active tax rules"
on public.tax_rules for select
using (active);

create policy "admins manage tax rules"
on public.tax_rules for all
using (public.is_admin())
with check (public.is_admin());

grant select on public.tax_rules to anon, authenticated;
grant insert, update, delete on public.tax_rules to authenticated;

create trigger tax_rules_updated_at
before update on public.tax_rules
for each row execute function public.set_updated_at();

insert into public.tax_rules (name, rate, country_code, applies_to, active)
values ('VAT', 7.5, 'NG', 'Gadgets and electronics products', true)
on conflict (country_code, name) do update set
  rate = excluded.rate,
  applies_to = excluded.applies_to,
  active = excluded.active;

notify pgrst, 'reload schema';
