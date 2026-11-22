-- The cost of the supplies of a service and its copy in the appointment, with the name of the
-- category (issue #1, RN037, RN042). Rules: docs/catalogo/dados.md, docs/agendamento/dados.md.


-- RN042: optional, from 0 to 99,999.99, in the form of the price: a fixed cost with a fixed price
-- and one cost by size with prices by size. Internal data of the company (RS021).
alter table public.services
  add column fixed_cost numeric(10, 2),
  add constraint ck_services_fixed_cost check (fixed_cost is null or fixed_cost between 0 and 99999.99),
  add constraint ck_services_fixed_cost_mode check (fixed_cost is null or pricing_mode is distinct from 'by_size');

alter table public.service_prices
  add column cost numeric(10, 2),
  add constraint ck_service_prices_cost check (cost is null or cost between 0 and 99999.99);

-- RN037: the copies of the moment of the registration or of the last edition. Empty in the
-- appointments from before the copy and, for the category, in the services with none.
alter table public.appointment_services
  add column cost numeric(10, 2),
  add column category_name text,
  add constraint ck_appointment_services_cost check (cost is null or cost >= 0);


-- save_service with the costs. The version without them stays until the code that calls it is no
-- longer published; a later migration removes it (workflows/procedimentos/migration.md).
create function public.save_service(
  p_id uuid,
  p_type public.service_type,
  p_category_id uuid,
  p_name text,
  p_description text,
  p_avg_duration_minutes integer,
  p_pricing_mode public.pricing_mode,
  p_fixed_price numeric,
  p_fixed_cost numeric,
  p_is_active boolean,
  p_prices jsonb,
  p_costs jsonb,
  p_linked_ids uuid[],
  p_updated_at timestamptz
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_type public.service_type;
begin
  if p_id is null then
    insert into public.services (
      type, category_id, name, description, avg_duration_minutes, pricing_mode, fixed_price,
      fixed_cost, is_active
    )
      values (
        p_type, p_category_id, p_name, p_description, p_avg_duration_minutes, p_pricing_mode,
        p_fixed_price, case when p_pricing_mode = 'by_size' then null else p_fixed_cost end, p_is_active
      )
      returning id, type into v_id, v_type;
  else
    update public.services
      set category_id = p_category_id, name = p_name, description = p_description,
        avg_duration_minutes = p_avg_duration_minutes, pricing_mode = p_pricing_mode,
        fixed_price = p_fixed_price,
        fixed_cost = case when p_pricing_mode = 'by_size' then null else p_fixed_cost end,
        is_active = p_is_active
      where id = p_id and updated_at = p_updated_at and deleted_at is null
      returning id, type into v_id, v_type;
    if v_id is null then
      return null;
    end if;
    delete from public.service_prices where service_id = v_id;
    if v_type = 'main' then
      delete from public.service_additionals where main_service_id = v_id;
    elsif v_type = 'additional' then
      delete from public.service_additionals where additional_service_id = v_id;
    end if;
  end if;

  if p_pricing_mode = 'by_size' then
    insert into public.service_prices (service_id, size, price, cost)
      select v_id, size, (p_prices ->> size::text)::numeric, (p_costs ->> size::text)::numeric
      from unnest(enum_range(null::public.vehicle_size)) as size;
  end if;

  if v_type = 'main' then
    insert into public.service_additionals (main_service_id, additional_service_id)
      select v_id, linked_id from unnest(p_linked_ids) as linked_id
      on conflict do nothing;
  elsif v_type = 'additional' then
    insert into public.service_additionals (main_service_id, additional_service_id)
      select linked_id, v_id from unnest(p_linked_ids) as linked_id
      on conflict do nothing;
  end if;

  return v_id;
end;
$$;

revoke all on function public.save_service(
  uuid, public.service_type, uuid, text, text, integer, public.pricing_mode, numeric, numeric,
  boolean, jsonb, jsonb, uuid[], timestamptz
) from public, anon, authenticated;

grant execute on function public.save_service(
  uuid, public.service_type, uuid, text, text, integer, public.pricing_mode, numeric, numeric,
  boolean, jsonb, jsonb, uuid[], timestamptz
) to service_role;


-- create_appointment and update_appointment, with the same arguments, copy the cost of the size
-- and the name of the category; reschedule_appointment calls create_appointment.
create or replace function public.create_appointment(
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
    appointment_id, service_id, service_name, service_type, price, duration_minutes, cost,
    category_name
  )
    select v_id, s.id, s.name, s.type, item.price, item.duration_minutes,
      case when s.pricing_mode = 'by_size' then sp.cost else s.fixed_cost end, c.name
    from jsonb_to_recordset(p_items)
      as item(service_id uuid, price numeric, duration_minutes integer)
      join public.services as s on s.id = item.service_id
      join public.appointments as a on a.id = v_id
      left join public.service_prices as sp on sp.service_id = s.id and sp.size = a.vehicle_size
      left join public.categories as c on c.id = s.category_id;
  get diagnostics v_inserted = row_count;
  if v_inserted <> jsonb_array_length(p_items) then
    raise exception 'A service of the appointment does not exist.'
      using errcode = 'foreign_key_violation';
  end if;

  return v_id;
end;
$$;

create or replace function public.update_appointment(
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
      appointment_id, service_id, service_name, service_type, price, duration_minutes, cost,
      category_name
    )
      select p_id, s.id, s.name, s.type, item.price, item.duration_minutes,
        case when s.pricing_mode = 'by_size' then sp.cost else s.fixed_cost end, c.name
      from jsonb_to_recordset(p_items)
        as item(service_id uuid, price numeric, duration_minutes integer)
        join public.services as s on s.id = item.service_id
        join public.appointments as a on a.id = p_id
        left join public.service_prices as sp on sp.service_id = s.id and sp.size = a.vehicle_size
        left join public.categories as c on c.id = s.category_id;
    get diagnostics v_inserted = row_count;
    if v_inserted <> jsonb_array_length(p_items) then
      raise exception 'A service of the appointment does not exist.'
        using errcode = 'foreign_key_violation';
    end if;
  end if;

  return p_id;
end;
$$;
