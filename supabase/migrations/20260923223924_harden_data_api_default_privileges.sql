begin;

-- Opt into Supabase's safer Data API defaults before the 2026-10-30 platform change.
-- New public-schema objects must receive explicit grants in the migration that creates them.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables
  from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions
  from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke usage, select on sequences
  from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions
  from public;

-- These SECURITY DEFINER RPCs are authenticated application operations.
-- Their internal authorization checks remain in place; anonymous execution is unnecessary.
revoke execute
  on function public.admin_configure_supervision_case(
    uuid,
    text,
    uuid[],
    uuid[],
    text,
    date,
    date,
    text
  )
  from anon;

revoke execute
  on function public.get_case_people(uuid)
  from anon;

commit;
