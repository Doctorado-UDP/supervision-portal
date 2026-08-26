create or replace function private.mark_access_invitation_accepted_on_signin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.last_sign_in_at is not null
     and old.last_sign_in_at is distinct from new.last_sign_in_at then
    update public.access_invitations
    set auth_user_id = coalesce(auth_user_id, new.id),
        status = 'accepted',
        accepted_at = coalesce(accepted_at, new.last_sign_in_at, now()),
        last_error = null,
        updated_at = now()
    where status in ('pending', 'sent', 'failed')
      and (
        auth_user_id = new.id
        or (auth_user_id is null and lower(email) = lower(new.email))
      );
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_signin_accept_access_invitation on auth.users;

create trigger on_auth_user_signin_accept_access_invitation
after update of last_sign_in_at on auth.users
for each row
execute function private.mark_access_invitation_accepted_on_signin();

update public.access_invitations ai
set status = 'accepted',
    accepted_at = coalesce(ai.accepted_at, u.last_sign_in_at, now()),
    last_error = null,
    updated_at = now()
from auth.users u
where ai.status in ('pending', 'sent', 'failed')
  and ai.auth_user_id = u.id
  and u.last_sign_in_at is not null;
