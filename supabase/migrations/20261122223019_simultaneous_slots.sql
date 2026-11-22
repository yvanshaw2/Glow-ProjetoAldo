-- The simultaneous slots of the company and the booked minutes of the period, for the occupancy
-- of the schedule in the detailed analysis (issue #1, RF098, RN044; RN040, item 17). Rules:
-- docs/configuracoes/dados.md and docs/agendamento/calculos.md (section 7).


-- RN044: used only to measure the occupancy; it never limits the bookings (RN016, decision 0014).
alter table public.business_settings
  add column simultaneous_slots smallint not null default 1,
  add constraint ck_business_settings_simultaneous_slots check (simultaneous_slots between 1 and 20);


-- UC23: the seven days and the simultaneous slots in one transaction (RNF010). The values come
-- checked by the server (businessHoursSchema). The slots are written only when they change, so
-- the version of the company data (updated_at, RNF011) does not move for nothing.
create function public.save_business_hours(p_days jsonb, p_simultaneous_slots smallint)
returns void
language plpgsql
set search_path = ''
as $$
begin
  insert into public.business_hours (
    weekday, is_open, opens_at, closes_at, break_starts_at, break_ends_at
  )
  select d.weekday, d."isOpen", d."opensAt", d."closesAt", d."breakStartsAt", d."breakEndsAt"
  from jsonb_to_recordset(p_days) as d(
    weekday smallint, "isOpen" boolean, "opensAt" time, "closesAt" time,
    "breakStartsAt" time, "breakEndsAt" time
  )
  on conflict (weekday) do update
  set is_open = excluded.is_open,
    opens_at = excluded.opens_at,
    closes_at = excluded.closes_at,
    break_starts_at = excluded.break_starts_at,
    break_ends_at = excluded.break_ends_at;

  update public.business_settings
  set simultaneous_slots = p_simultaneous_slots
  where id = 1
    and simultaneous_slots is distinct from p_simultaneous_slots;
end;
$$;

revoke all on function public.save_business_hours(jsonb, smallint)
  from public, anon, authenticated;
grant execute on function public.save_business_hours(jsonb, smallint) to service_role;


-- The function of the migration 20261122215811, with the booked minutes (bookedMinutes): the
-- estimated duration of the appointments of the period that are not cancelled. The minutes
-- available come from the business hours, worked out by the server (rules/occupancy.ts).
create or replace function public.dashboard_details(
  p_from timestamptz,
  p_to timestamptz,
  p_open_to timestamptz,
  p_time_zone text
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with
    scheduled as (
      select a.*
      from public.appointments a
      where a.scheduled_at >= p_from and a.scheduled_at < p_to
    ),
    paid as (
      select a.*
      from public.appointments a
      where a.status in ('completed', 'rescheduled')
        and a.completed_at >= p_from and a.completed_at < p_to
    ),
    paid_items as (
      select i.*
      from public.appointment_services i
      join paid p on p.id = i.appointment_id
    ),
    first_appointments as (
      select a.client_id, min(a.scheduled_at) as first_at
      from public.appointments a
      where a.client_id in (select s.client_id from scheduled s)
      group by a.client_id
    ),
    lead_days as (
      select
        greatest(
          (s.scheduled_at at time zone p_time_zone)::date
            - (s.created_at at time zone p_time_zone)::date,
          0
        ) as days
      from scheduled s
    )
  select jsonb_build_object(
    'services', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.name, 'revenue', x.revenue, 'count', x.total))
      from (
        select i.service_name as name, sum(i.price) as revenue, count(*) as total
        from paid_items i
        group by i.service_name
      ) x
    ), '[]'::jsonb),
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.name, 'revenue', x.revenue, 'count', x.total))
      from (
        select coalesce(i.category_name, c.name) as name, sum(i.price) as revenue, count(*) as total
        from paid_items i
        join public.services sv on sv.id = i.service_id
        left join public.categories c on c.id = sv.category_id
        where coalesce(i.category_name, c.name) is not null
        group by coalesce(i.category_name, c.name)
      ) x
    ), '[]'::jsonb),
    'paidCount', (select count(*) from paid),
    'paidWithExtras', (
      select count(*)
      from paid p
      where exists (
        select 1
        from public.appointment_services i
        where i.appointment_id = p.id and i.service_type in ('complementary', 'additional')
      )
    ),
    'vehicleTypes', coalesce((
      select jsonb_agg(jsonb_build_object('type', x.vehicle_type, 'count', x.total))
      from (
        select s.vehicle_type, count(*) as total from scheduled s group by s.vehicle_type
      ) x
    ), '[]'::jsonb),
    'scheduledSizes', coalesce((
      select jsonb_agg(jsonb_build_object('size', x.vehicle_size, 'count', x.total))
      from (
        select s.vehicle_size, count(*) as total from scheduled s group by s.vehicle_size
      ) x
    ), '[]'::jsonb),
    'paidSizes', coalesce((
      select jsonb_agg(
        jsonb_build_object('size', x.vehicle_size, 'paidCount', x.total, 'paidRevenue', x.revenue)
      )
      from (
        select p.vehicle_size, count(*) as total, sum(p.total) as revenue
        from paid p
        group by p.vehicle_size
      ) x
    ), '[]'::jsonb),
    'payments', coalesce((
      select jsonb_agg(
        jsonb_build_object('method', x.payment_method, 'count', x.total, 'revenue', x.revenue)
      )
      from (
        select p.payment_method, count(*) as total, sum(p.total) as revenue
        from paid p
        group by p.payment_method
      ) x
    ), '[]'::jsonb),
    'surcharges', (select coalesce(sum(greatest(p.total - p.subtotal, 0)), 0) from paid p),
    'discounts', (select coalesce(sum(greatest(p.subtotal - p.total, 0)), 0) from paid p),
    'channel', (
      select jsonb_build_object(
        'client', count(*) filter (where s.created_by_staff_id is null),
        'panel', count(*) filter (where s.created_by_staff_id is not null)
      )
      from scheduled s
    ),
    'clients', (
      select jsonb_build_object(
        'total', count(*),
        'new', count(*) filter (where f.first_at >= p_from)
      )
      from first_appointments f
    ),
    'returns', (select count(*) from scheduled s where s.rescheduled_from_id is not null),
    'scheduledByWeekday', coalesce((
      select jsonb_agg(
        jsonb_build_object('weekday', x.weekday, 'count', x.total, 'cancelled', x.cancelled)
      )
      from (
        select
          extract(dow from s.scheduled_at at time zone p_time_zone)::int as weekday,
          count(*) as total,
          count(*) filter (where s.status = 'cancelled') as cancelled
        from scheduled s
        group by 1
      ) x
    ), '[]'::jsonb),
    'revenueByWeekday', coalesce((
      select jsonb_agg(jsonb_build_object('weekday', x.weekday, 'revenue', x.revenue))
      from (
        select
          extract(dow from p.completed_at at time zone p_time_zone)::int as weekday,
          sum(p.total) as revenue
        from paid p
        group by 1
      ) x
    ), '[]'::jsonb),
    'hours', coalesce((
      select jsonb_agg(jsonb_build_object('hour', x.hour, 'count', x.total))
      from (
        select extract(hour from s.scheduled_at at time zone p_time_zone)::int as hour, count(*) as total
        from scheduled s
        group by 1
      ) x
    ), '[]'::jsonb),
    'cancelledServices', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.name, 'count', x.total))
      from (
        select i.service_name as name, count(*) as total
        from public.appointment_services i
        join scheduled s on s.id = i.appointment_id
        where s.status = 'cancelled'
        group by i.service_name
      ) x
    ), '[]'::jsonb),
    'cancellationReasons', coalesce((
      select jsonb_agg(jsonb_build_object('reason', x.reason, 'count', x.total))
      from (
        select s.cancellation_reason as reason, count(*) as total
        from scheduled s
        where s.status = 'cancelled'
        group by s.cancellation_reason
      ) x
    ), '[]'::jsonb),
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object('rating', x.rating, 'count', x.total))
      from (
        select r.rating, count(*) as total
        from paid p
        join public.appointment_reviews r on r.appointment_id = p.id
        group by r.rating
      ) x
    ), '[]'::jsonb),
    'bookedMinutes', (
      select coalesce(sum(s.estimated_duration_minutes), 0)
      from scheduled s
      where s.status <> 'cancelled'
    ),
    'margin', (
      select jsonb_build_object(
        'revenue', coalesce(sum(m.total) filter (where m.has_cost), 0),
        'cost', coalesce(sum(m.cost) filter (where m.has_cost), 0),
        'withCostCount', count(*) filter (where m.has_cost),
        'withoutCostCount', count(*) filter (where not m.has_cost)
      )
      from (
        select p.total, sum(i.cost) as cost, bool_and(i.cost is not null) as has_cost
        from paid p
        join public.appointment_services i on i.appointment_id = p.id
        group by p.id, p.total
      ) m
    ),
    'open', (
      select jsonb_build_object('count', count(*), 'total', coalesce(sum(a.total), 0))
      from public.appointments a
      where a.scheduled_at >= p_from and a.scheduled_at < p_open_to
        and a.status in ('scheduled', 'checked_in', 'in_progress', 'awaiting_payment')
    ),
    'leadTime', (
      select jsonb_build_object(
        'count', count(*),
        'totalDays', coalesce(sum(l.days), 0),
        'sameDay', count(*) filter (where l.days = 0),
        'upToThree', count(*) filter (where l.days between 1 and 3),
        'upToSeven', count(*) filter (where l.days between 4 and 7),
        'overSeven', count(*) filter (where l.days > 7)
      )
      from lead_days l
    )
  );
$$;

revoke execute on function public.dashboard_details(timestamptz, timestamptz, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.dashboard_details(timestamptz, timestamptz, timestamptz, text)
  to service_role;
