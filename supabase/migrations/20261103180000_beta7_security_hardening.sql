-- v0.1.0-beta.7 security hardening (3 Nov 2026).
--
-- Apply after the beta.7 app is deployed: the bucket now accepts only PDF and
-- Word MIME types, which the beta.7 upload form always sends.

begin;

-- ============================================================
-- 1. Students update only case-level milestones
-- ============================================================
-- USING now also requires student_id is null, so a group member cannot take
-- over a groupmate's personal milestone by setting student_id to null.
-- WITH CHECK is unchanged, so legitimate edits behave as before.

drop policy if exists "Students can update case milestones"
on public.milestones;

create policy "Students can update case milestones"
on public.milestones
for update
to authenticated
using (
  case_id is not null
  and private.is_case_member(case_id)
  and student_id is null
)
with check (
  case_id is not null
  and private.is_case_member(case_id)
  and student_id is null
);

-- ============================================================
-- 2. No default EXECUTE for PUBLIC on new functions
-- ============================================================
-- PostgreSQL grants EXECUTE to PUBLIC globally, and a per-schema default
-- (as in 20260923223924) cannot remove a global one. This global default
-- covers functions postgres creates in any schema, private.* included:
-- every new function must grant EXECUTE explicitly in its migration.

alter default privileges for role postgres
  revoke execute on functions
  from public;

-- ============================================================
-- 3. Orphan-file deletion checks submissions without RLS
-- ============================================================
-- The previous subquery ran under the caller's RLS, so a row the caller can
-- no longer see (for example after leaving a case) looked absent and its
-- file could be deleted.

create or replace function private.submission_file_exists(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.submissions s
    where s.file_path = p_name
  );
$$;

revoke execute on function private.submission_file_exists(text)
  from public, anon;

grant execute on function private.submission_file_exists(text)
  to authenticated;

drop policy if exists "Uploaders can delete orphan submission files"
on storage.objects;

create policy "Uploaders can delete orphan submission files"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'submissions'
  and owner_id = (auth.uid())::text
  and not private.submission_file_exists(name)
);

-- ============================================================
-- 4. Table privileges for API roles
-- ============================================================
-- The portal never reads tables as anon. TRUNCATE, TRIGGER, REFERENCES and
-- MAINTAIN are not governed by RLS and are not needed by authenticated.

revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;

revoke truncate, trigger, references, maintain
  on all tables in schema public
  from authenticated;

alter default privileges for role postgres in schema public
  revoke all on tables
  from anon;

alter default privileges for role postgres in schema public
  revoke truncate, trigger, references, maintain on tables
  from authenticated;

-- ============================================================
-- 5. Storage policies, as they exist in production
-- ============================================================
-- These policies were created in the dashboard and were not in version
-- control. They are recorded here unchanged (read from pg_policies on
-- 3 Nov 2026), so a fresh project reproduces production. There is
-- deliberately no UPDATE policy: stored files cannot be overwritten.

drop policy if exists "Case users read case submission files"
on storage.objects;

create policy "Case users read case submission files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'submissions'
  and private.can_access_case_storage_path(name)
);

drop policy if exists "Users can read permitted submission files"
on storage.objects;

create policy "Users can read permitted submission files"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'submissions'
  and (
    (select private.is_admin())
    or (storage.foldername(name))[1] = ((select private.current_student_id()))::text
  )
);

drop policy if exists "Assigned staff can upload case submission files"
on storage.objects;

create policy "Assigned staff can upload case submission files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'submissions'
  and lower(storage.extension(name)) = any (array['pdf', 'doc', 'docx'])
  and exists (
    select 1
    from public.case_staff cs
    join public.profiles p on p.id = cs.staff_id
    where (cs.case_id)::text = split_part(objects.name, '/', 1)
      and cs.staff_id = auth.uid()
      and p.role = 'admin'
  )
);

drop policy if exists "Case users upload case submission files"
on storage.objects;

create policy "Case users upload case submission files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'submissions'
  and lower(storage.extension(name)) = any (array['pdf', 'doc', 'docx'])
  and (
    private.is_admin()
    or exists (
      select 1
      from public.case_members cm
      join public.students s on s.id = cm.student_id
      where (cm.case_id)::text = split_part(objects.name, '/', 1)
        and s.user_id = auth.uid()
    )
  )
);

drop policy if exists "Users can upload permitted submission files"
on storage.objects;

create policy "Users can upload permitted submission files"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'submissions'
  and lower(storage.extension(name)) = any (array['pdf', 'doc', 'docx'])
  and (
    (select private.is_admin())
    or (storage.foldername(name))[1] = ((select private.current_student_id()))::text
  )
);

-- "Global supervisor can delete submission files" is unchanged from
-- 20260825090109_restrict_submission_deletion.sql.

-- ============================================================
-- 6. Submissions bucket
-- ============================================================
-- Private, 25 MiB, and only the PDF and Word types the upload form sends.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'submissions',
  'submissions',
  false,
  26214400,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

commit;
