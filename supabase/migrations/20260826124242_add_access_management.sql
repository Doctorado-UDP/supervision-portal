create table public.access_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null,
  intended_role text not null check (intended_role = any (array['student'::text, 'staff'::text])),
  status text not null default 'pending' check (status = any (array['pending'::text, 'sent'::text, 'failed'::text, 'accepted'::text, 'cancelled'::text])),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  sent_at timestamptz,
  accepted_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index access_invitations_active_email_idx
  on public.access_invitations (lower(email))
  where status in ('pending', 'sent', 'failed');

create index access_invitations_status_created_idx
  on public.access_invitations (status, created_at desc);

alter table public.access_invitations enable row level security;

revoke all on table public.access_invitations from anon;
grant select, insert, update, delete on table public.access_invitations to authenticated;

create policy "Global supervisor can view access invitations"
  on public.access_invitations
  for select
  to authenticated
  using (private.is_global_supervisor());

create policy "Global supervisor can create access invitations"
  on public.access_invitations
  for insert
  to authenticated
  with check (
    private.is_global_supervisor()
    and created_by = auth.uid()
  );

create policy "Global supervisor can update access invitations"
  on public.access_invitations
  for update
  to authenticated
  using (private.is_global_supervisor())
  with check (private.is_global_supervisor());

create policy "Global supervisor can delete access invitations"
  on public.access_invitations
  for delete
  to authenticated
  using (private.is_global_supervisor());

create or replace function public.update_own_profile_name(p_full_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleaned_name text := btrim(coalesce(p_full_name, ''));
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if char_length(cleaned_name) < 2 then
    raise exception 'full name is too short';
  end if;

  update public.profiles
  set full_name = cleaned_name,
      updated_at = now()
  where id = auth.uid();

  if not found then
    raise exception 'profile not found';
  end if;
end;
$$;

revoke all on function public.update_own_profile_name(text) from public;
grant execute on function public.update_own_profile_name(text) to authenticated;

create or replace function public.accept_own_access_invitation()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  update public.access_invitations
  set auth_user_id = coalesce(auth_user_id, auth.uid()),
      status = 'accepted',
      accepted_at = coalesce(accepted_at, now()),
      last_error = null,
      updated_at = now()
  where status in ('pending', 'sent', 'failed')
    and (
      auth_user_id = auth.uid()
      or (auth_user_id is null and lower(email) = caller_email)
    );
end;
$$;

revoke all on function public.accept_own_access_invitation() from public;
grant execute on function public.accept_own_access_invitation() to authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  invited_role text;
  profile_role text := 'student';
begin
  select ai.intended_role
  into invited_role
  from public.access_invitations ai
  where lower(ai.email) = lower(new.email)
    and ai.status in ('pending', 'sent', 'failed')
  order by ai.created_at desc
  limit 1;

  if invited_role = 'staff' then
    profile_role := 'admin';
  end if;

  insert into public.profiles (
    id,
    full_name,
    email,
    role
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1),
      'User'
    ),
    new.email,
    profile_role
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
