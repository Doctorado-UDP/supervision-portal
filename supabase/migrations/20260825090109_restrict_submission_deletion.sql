drop policy if exists "Assigned staff can delete own case submissions"
on public.submissions;

drop policy if exists "Users can delete permitted submissions"
on public.submissions;

create policy "Global supervisor can delete submissions"
on public.submissions
for delete
to authenticated
using (private.is_global_supervisor());

drop policy if exists "Case users delete own case submission files"
on storage.objects;

drop policy if exists "Users can delete permitted submission files"
on storage.objects;

create policy "Global supervisor can delete submission files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'submissions'
  and private.is_global_supervisor()
);

create policy "Uploaders can delete orphan submission files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'submissions'
  and owner_id = (auth.uid())::text
  and not exists (
    select 1
    from public.submissions s
    where s.file_path = storage.objects.name
  )
);
