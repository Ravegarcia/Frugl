begin;

create table public.app_auth_sessions (
  session_id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  idle_expires_at timestamptz not null default now() + interval '30 minutes',
  hard_expires_at timestamptz not null default now() + interval '24 hours',
  revoked_at timestamptz,
  constraint app_auth_sessions_idle_before_hard
    check (idle_expires_at <= hard_expires_at)
);

create index app_auth_sessions_user_active_idx
  on public.app_auth_sessions (user_id)
  where revoked_at is null;

alter table public.app_auth_sessions enable row level security;
revoke all on public.app_auth_sessions from public, anon, authenticated;
grant all on public.app_auth_sessions to service_role;

create or replace function public.require_active_profile_for_app_session()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  profile_status text;
begin
  select p.status
  into profile_status
  from public.profiles p
  where p.id = new.user_id
  for update;

  if profile_status is distinct from 'active' then
    raise exception 'An active account is required to create a session.';
  end if;

  return new;
end;
$$;

create trigger app_auth_sessions_require_active_profile
before insert on public.app_auth_sessions
for each row
execute function public.require_active_profile_for_app_session();

create or replace function public.is_app_auth_session_active(
  p_session_id uuid,
  p_user_id uuid
) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.app_auth_sessions s
    where s.session_id = p_session_id
      and s.user_id = p_user_id
      and s.revoked_at is null
      and s.idle_expires_at > now()
      and s.hard_expires_at > now()
  );
$$;

revoke all on function public.is_app_auth_session_active(uuid, uuid) from public, anon, authenticated;
grant execute on function public.is_app_auth_session_active(uuid, uuid) to service_role;

create or replace function public.touch_app_auth_session(
  p_session_id uuid,
  p_user_id uuid
) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.app_auth_sessions
  set idle_expires_at = least(now() + interval '30 minutes', hard_expires_at)
  where session_id = p_session_id
    and user_id = p_user_id
    and revoked_at is null
    and idle_expires_at > now()
    and hard_expires_at > now();

  return found;
end;
$$;

revoke all on function public.touch_app_auth_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.touch_app_auth_session(uuid, uuid) to service_role;

create or replace function public.is_active_user() returns boolean
language sql stable security definer set search_path = public, auth as $$
  select coalesce(
    (select p.status = 'active' from public.profiles p where p.id = auth.uid()),
    false
  ) and public.is_app_auth_session_active(
    nullif(auth.jwt()->>'session_id', '')::uuid,
    auth.uid()
  );
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('moderator', 'admin')
        and p.status = 'active'
    );
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_active_user()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.status = 'active'
    );
$$;

revoke all on function public.is_active_user() from public, anon;
grant execute on function public.is_active_user() to authenticated;
revoke all on function public.is_staff() from public, anon;
grant execute on function public.is_staff() to authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.revoke_app_sessions_on_profile_security_change()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'suspended' or new.role is distinct from old.role then
    update public.app_auth_sessions
    set revoked_at = coalesce(revoked_at, now())
    where user_id = new.id
      and revoked_at is null;
  end if;

  return new;
end;
$$;

create trigger profiles_revoke_app_sessions
after update of status, role on public.profiles
for each row
when (
  new.status is distinct from old.status
  or new.role is distinct from old.role
)
execute function public.revoke_app_sessions_on_profile_security_change();

commit;
