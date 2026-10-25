-- Service, its prices by size and its links saved in one transaction (issue #44, RNF010).
-- Rules: docs/catalogo/dados.md (services, service_prices, service_additionals), RN006, RN009
-- and RNF011.


-- Creates a service (p_id null) or changes one, replacing its prices by size and its links, and
-- returns its id. For a change, p_updated_at is the version the caller read: the function
-- returns null when the service does not exist, was deleted or was saved after that version,
-- and nothing is written. The type and the image never change here (the type is fixed by
-- trg_services_type_unchanged, and the image is saved by its own route), so p_type counts only
-- for a new service. The service row is always updated, so updated_at (trg_services_updated_at)
-- also changes when only the prices or the links do.
--
-- p_prices is an object with the keys small, medium, large and extra_large, used when
-- p_pricing_mode is by_size; a missing key makes the price null and the insert fails.
-- p_linked_ids are the additional services of a main service, or the main services of an
-- additional one; a complementary service has none. The checks of the database decide whether
-- the four prices and the types of the links are right (trg_services_prices_complete,
-- trg_service_prices_complete and trg_service_additionals_types), at the end of the transaction,
-- so any failure undoes the whole save. A repeated name raises unique_violation on
-- uq_services_name.
create function public.save_service(
  p_id uuid,
  p_type public.service_type,
  p_category_id uuid,
  p_name text,
  p_description text,
  p_avg_duration_minutes integer,
  p_pricing_mode public.pricing_mode,
  p_fixed_price numeric,
  p_is_active boolean,
  p_prices jsonb,
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
      is_active
    )
      values (
        p_type, p_category_id, p_name, p_description, p_avg_duration_minutes, p_pricing_mode,
        p_fixed_price, p_is_active
      )
      returning id, type into v_id, v_type;
  else
    update public.services
      set category_id = p_category_id, name = p_name, description = p_description,
        avg_duration_minutes = p_avg_duration_minutes, pricing_mode = p_pricing_mode,
        fixed_price = p_fixed_price, is_active = p_is_active
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
    insert into public.service_prices (service_id, size, price)
      select v_id, size, (p_prices ->> size::text)::numeric
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


-- Only the backend calls it, with the service key (decision 0042).

revoke all on function public.save_service(
  uuid, public.service_type, uuid, text, text, integer, public.pricing_mode, numeric, boolean,
  jsonb, uuid[], timestamptz
) from public, anon, authenticated;

grant execute on function public.save_service(
  uuid, public.service_type, uuid, text, text, integer, public.pricing_mode, numeric, boolean,
  jsonb, uuid[], timestamptz
) to service_role;
