-- Vehicle and its link to a client's account saved in one transaction (issue #45, RNF010).
-- Rules: docs/clientes/dados.md (vehicles, client_vehicles), RN002 and RN036.


-- Links the vehicle of p_plate to the client's account and returns the vehicle id. When the plate
-- is not registered yet, the vehicle is created first with the other parameters; when it is, they
-- are ignored and the existing vehicle is linked as it is (RN036). Returns null, and writes
-- nothing, when the vehicle is already linked to the account. A plate registered by another
-- request meanwhile is the vehicle that gets linked. The size is derived from the type by the
-- database (RN002). The checks of the database decide whether the plate, the year, the data and
-- the client are right (ck_vehicles_plate, ck_vehicles_year, not null and
-- fk_client_vehicles_client_id), so any failure undoes the whole save.
create function public.link_vehicle(
  p_client_id uuid,
  p_plate text,
  p_type public.vehicle_type,
  p_brand text,
  p_model text,
  p_color text,
  p_year smallint
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_linked_id uuid;
begin
  select id into v_id from public.vehicles where plate = p_plate;

  if v_id is null then
    insert into public.vehicles (type, plate, brand, model, color, year)
      values (p_type, p_plate, p_brand, p_model, p_color, p_year)
      on conflict (plate) do nothing
      returning id into v_id;
    if v_id is null then
      select id into v_id from public.vehicles where plate = p_plate;
    end if;
  end if;

  insert into public.client_vehicles (client_id, vehicle_id)
    values (p_client_id, v_id)
    on conflict do nothing
    returning vehicle_id into v_linked_id;
  if v_linked_id is null then
    return null;
  end if;

  return v_id;
end;
$$;


-- Only the backend calls it, with the service key (decision 0042).

revoke all on function public.link_vehicle(
  uuid, text, public.vehicle_type, text, text, text, smallint
) from public, anon, authenticated;

grant execute on function public.link_vehicle(
  uuid, text, public.vehicle_type, text, text, text, smallint
) to service_role;
