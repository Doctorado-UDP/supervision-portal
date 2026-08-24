alter table public.submissions
  alter column original_date
  set default ((now() at time zone 'America/Santiago')::date);
