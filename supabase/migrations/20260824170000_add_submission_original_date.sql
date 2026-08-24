alter table public.submissions
  add column original_date date;

update public.submissions
set original_date = (submitted_at at time zone 'America/Santiago')::date
where original_date is null;

alter table public.submissions
  alter column original_date set default current_date,
  alter column original_date set not null;

create index if not exists submissions_case_original_date_idx
  on public.submissions (case_id, original_date desc, submitted_at desc);

create policy "Global supervisor can update submissions"
  on public.submissions
  for update
  to authenticated
  using (private.is_global_supervisor())
  with check (private.is_global_supervisor());
