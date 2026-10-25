-- Role and its permissions saved in one transaction (issue #39, RNF010).
-- Rules: docs/equipe/dados.md (roles, role_permissions), RN025 and RNF011.


-- Creates a role (p_id null) or changes one, replacing its permissions, and
-- returns its id. For a change, p_updated_at is the version the caller read:
-- the function returns null when the role does not exist or was saved after
-- that version, and nothing is written. The role row is always updated, so
-- updated_at (trg_roles_updated_at) also changes when only the permissions do.
-- A repeated name raises unique_violation on uq_roles_name.
create function public.save_role(
  p_id uuid,
  p_name text,
  p_description text,
  p_is_active boolean,
  p_permission_keys public.permission_key[],
  p_updated_at timestamptz
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
begin
  -- RN025: every role grants at least one permission.
  if coalesce(cardinality(p_permission_keys), 0) = 0 then
    raise exception 'A role must grant at least one permission'
      using errcode = 'check_violation';
  end if;

  if p_id is null then
    insert into public.roles (name, description, is_active)
      values (p_name, p_description, p_is_active)
      returning id into v_id;
  else
    update public.roles
      set name = p_name, description = p_description, is_active = p_is_active
      where id = p_id and updated_at = p_updated_at
      returning id into v_id;
    if v_id is null then
      return null;
    end if;
    delete from public.role_permissions where role_id = v_id;
  end if;

  insert into public.role_permissions (role_id, permission_key)
    select v_id, permission_key from unnest(p_permission_keys) as permission_key
    on conflict do nothing;

  return v_id;
end;
$$;


-- Only the backend calls it, with the service key (decision 0042).

revoke all on function public.save_role(
  uuid, text, text, boolean, public.permission_key[], timestamptz
) from public, anon, authenticated;

grant execute on function public.save_role(
  uuid, text, text, boolean, public.permission_key[], timestamptz
) to service_role;
