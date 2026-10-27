-- Appointment, the copy of the data and its services saved in one transaction (issue #49, RNF010).
-- Rules: docs/agendamento/dados.md (appointments, appointment_services), RN003, RN037.


-- Creates an appointment with the status scheduled and returns its id. The caller works out the
-- prices, the percent, the totals, the duration and the end (docs/agendamento/calculos.md) and
-- sends them; p_items is an array of objects with service_id, price and duration_minutes, one per
-- service. The copies of RN037 are made here, from the rows the transaction sees: the full name
-- of the client, the data of the vehicle and the name and type of each service. p_staff_id is the
-- staff member who registered it (null when the client did).
--
-- Returns null, and writes nothing, when the client does not exist or was deleted, or the vehicle
-- is not linked to the client's account (RN003, RN030). The checks of the database decide whether
-- the values are right (ck_appointments_*, ck_appointment_services_* and the foreign keys), so any
-- failure undoes the whole save.
create function public.create_appointment(
  p_client_id uuid,
  p_vehicle_id uuid,
  p_staff_id uuid,
  p_scheduled_at timestamptz,
  p_payment_method public.payment_method,
  p_fee_percent numeric,
  p_subtotal numeric,
  p_total numeric,
  p_estimated_duration_minutes integer,
  p_estimated_end_at timestamptz,
  p_items jsonb
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_client_name text;
  v_inserted integer;
begin
  select first_name || ' ' || last_name into v_client_name
    from public.clients
    where id = p_client_id and deleted_at is null;
  if v_client_name is null then
    return null;
  end if;

  insert into public.appointments (
    client_id, vehicle_id, created_by_staff_id, scheduled_at, payment_method, subtotal,
    fee_percent, total, estimated_duration_minutes, estimated_end_at, client_name, vehicle_plate,
    vehicle_type, vehicle_size, vehicle_brand, vehicle_model, vehicle_color, vehicle_year
  )
    select p_client_id, v.id, p_staff_id, p_scheduled_at, p_payment_method, p_subtotal,
      p_fee_percent, p_total, p_estimated_duration_minutes, p_estimated_end_at, v_client_name,
      v.plate, v.type, v.size, v.brand, v.model, v.color, v.year
    from public.client_vehicles as link
      join public.vehicles as v on v.id = link.vehicle_id
    where link.client_id = p_client_id and link.vehicle_id = p_vehicle_id
    returning id into v_id;
  if v_id is null then
    return null;
  end if;

  insert into public.appointment_services (
    appointment_id, service_id, service_name, service_type, price, duration_minutes
  )
    select v_id, s.id, s.name, s.type, item.price, item.duration_minutes
    from jsonb_to_recordset(p_items)
      as item(service_id uuid, price numeric, duration_minutes integer)
      join public.services as s on s.id = item.service_id;
  get diagnostics v_inserted = row_count;
  if v_inserted <> jsonb_array_length(p_items) then
    raise exception 'A service of the appointment does not exist.'
      using errcode = 'foreign_key_violation';
  end if;

  return v_id;
end;
$$;


-- Only the backend calls it, with the service key (decision 0042).

revoke all on function public.create_appointment(
  uuid, uuid, uuid, timestamptz, public.payment_method, numeric, numeric, numeric, integer,
  timestamptz, jsonb
) from public, anon, authenticated;

grant execute on function public.create_appointment(
  uuid, uuid, uuid, timestamptz, public.payment_method, numeric, numeric, numeric, integer,
  timestamptz, jsonb
) to service_role;
