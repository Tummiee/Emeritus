alter type public.repair_status add value if not exists 'approved';
alter type public.repair_status add value if not exists 'rejected';
alter type public.repair_status add value if not exists 'rescheduled';
