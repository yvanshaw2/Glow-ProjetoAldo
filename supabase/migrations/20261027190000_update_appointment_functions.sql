-- Edition and rescheduling of an appointment saved in one transaction (issue #50, RNF010).
-- Rules: docs/agendamento/dados.md (appointments, appointment_services), RN020, RN033, RN037 and
-- RNF011.


-- Changes an appointment and returns its id. p_updated_at is the version the caller read: the
-- function returns null, and writes nothing, when the appointment does not exist or was saved
-- after that version, or when the new vehicle is not linked to the client of the appointment
-- (RN003). The caller works out the values (docs/agendamento/calculos.md) and sends them all.
-- The status, completed_at, cancelled_at and the client never change here (RN032).
--
-- When p_vehicle_id is not the vehicle of the appointment, the copy of the vehicle is made again
-- from the vehicle as it is now (RN037). p_items is an array of objects with service_id, price
-- and duration_minutes; when it is not null, it replaces the services of the appointment, with
-- the copy of the name and of the type of each one; null keeps the services and their copies
-- (RN033). The checks of the database decide whether the values are right (ck_appointments_*,
-- ck_appointment_services_* and the foreign keys), so any failure undoes the whole save.
create function public.update_appointment(
  p_id uuid,
  p_updated_at timestamptz,
  p_vehicle_id uuid,
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
  v_client_id uuid;
  v_vehicle_id uuid;
  v_changed integer;
  v_inserted integer;
begin
  select client_id, vehicle_id into v_client_id, v_vehicle_id
    from public.appointments
    where id = p_id and updated_at = p_updated_at
    for update;
  if not found then
    return null;
  end if;

  if p_vehicle_id <> v_vehicle_id then
    update public.appointments as a
      set vehicle_id = v.id, vehicle_plate = v.plate, vehicle_type = v.type,
        vehicle_size = v.size, vehicle_brand = v.brand, vehicle_model = v.model,
        vehicle_color = v.color, vehicle_year = v.year
      from public.client_vehicles as link
        join public.vehicles as v on v.id = link.vehicle_id
      where a.id = p_id and link.client_id = v_client_id and link.vehicle_id = p_vehicle_id
        and v.id = p_vehicle_id;
    get diagnostics v_changed = row_count;
    if v_changed = 0 then
      return null;
    end if;
  end if;

  update public.appointments
    set scheduled_at = p_scheduled_at, payment_method = p_payment_method,
      fee_percent = p_fee_percent, subtotal = p_subtotal, total = p_total,
      estimated_duration_minutes = p_estimated_duration_minutes,
      estimated_end_at = p_estimated_end_at
    where id = p_id;

  if p_items is not null then
    delete from public.appointment_services where appointment_id = p_id;
    insert into public.appointment_services (
      appointment_id, service_id, service_name, service_type, price, duration_minutes
    )
      select p_id, s.id, s.name, s.type, item.price, item.duration_minutes
      from jsonb_to_recordset(p_items)
        as item(service_id uuid, price numeric, duration_minutes integer)
        join public.services as s on s.id = item.service_id;
    get diagnostics v_inserted = row_count;
    if v_inserted <> jsonb_array_length(p_items) then
      raise exception 'A service of the appointment does not exist.'
        using errcode = 'foreign_key_violation';
    end if;
  end if;

  return p_id;
end;
$$;


-- Reschedules a completed appointment: creates the new one, with the status scheduled, as
-- create_appointment does for the client and the vehicle of the original, and changes the
-- original to rescheduled (RN020). Returns the id of the new appointment, or null, and writes
-- nothing, when the original does not exist or is not completed, or when its client was deleted
-- or its vehicle is no longer linked to the client. The uniqueness of rescheduled_from_id stops
-- a second rescheduling of the same original.
create function public.reschedule_appointment(
  p_original_id uuid,
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
  v_client_id uuid;
  v_vehicle_id uuid;
  v_new_id uuid;
begin
  select client_id, vehicle_id into v_client_id, v_vehicle_id
    from public.appointments
    where id = p_original_id and status = 'completed'
    for update;
  if not found then
    return null;
  end if;

  v_new_id := public.create_appointment(
    v_client_id, v_vehicle_id, p_staff_id, p_scheduled_at, p_payment_method, p_fee_percent,
    p_subtotal, p_total, p_estimated_duration_minutes, p_estimated_end_at, p_items
  );
  if v_new_id is null then
    return null;
  end if;

  update public.appointments set rescheduled_from_id = p_original_id where id = v_new_id;
  update public.appointments set status = 'rescheduled' where id = p_original_id;
  return v_new_id;
end;
$$;


-- Only the backend calls them, with the service key (decision 0042).

revoke all on function public.update_appointment(
  uuid, timestamptz, uuid, timestamptz, public.payment_method, numeric, numeric, numeric,
  integer, timestamptz, jsonb
) from public, anon, authenticated;

grant execute on function public.update_appointment(
  uuid, timestamptz, uuid, timestamptz, public.payment_method, numeric, numeric, numeric,
  integer, timestamptz, jsonb
) to service_role;

revoke all on function public.reschedule_appointment(
  uuid, uuid, timestamptz, public.payment_method, numeric, numeric, numeric, integer,
  timestamptz, jsonb
) from public, anon, authenticated;

grant execute on function public.reschedule_appointment(
  uuid, uuid, timestamptz, public.payment_method, numeric, numeric, numeric, integer,
  timestamptz, jsonb
) to service_role;
