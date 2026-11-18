-- MANUAL MAINTENANCE ONLY. Replace the example address before use.
update public.profiles p
set role = 'admin'
from auth.users u
where p.id = u.id
  and u.email = 'admin@example.com'
returning p.id, u.email, p.role;
