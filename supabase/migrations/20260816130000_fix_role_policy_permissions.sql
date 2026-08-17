-- RLS policies call has_role(auth.uid(), ...), so the API roles need EXECUTE.
-- Restrict the helper to the current JWT subject before restoring that grant;
-- callers cannot inspect the roles of another user by supplying an arbitrary UUID.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(_user_id = auth.uid(), false)
    and exists (
      select 1
      from public.user_roles
      where user_id = _user_id and role = _role
    )
$$;

revoke all on function public.has_role(uuid, public.app_role) from public;
grant execute on function public.has_role(uuid, public.app_role) to anon, authenticated;
