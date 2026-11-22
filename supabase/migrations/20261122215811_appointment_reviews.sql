-- The review of the appointment by the client (issue #1, RN043, UC28) and the ratings in the
-- detailed analysis (RN040, item 16). Rules: docs/agendamento/dados.md and calculos.md (section 7).


-- One rating per appointment, from 1 to 5, never changed. Who rates and until when is checked by
-- the server (src/server/rules/appointment-review.ts); only the service role reaches the table.
create table public.appointment_reviews (
  appointment_id uuid primary key,
  rating smallint not null,
  created_at timestamptz not null default now(),
  constraint fk_appointment_reviews_appointment_id foreign key (appointment_id)
    references public.appointments (id) on delete restrict,
  constraint ck_appointment_reviews_rating check (rating between 1 and 5)
);

-- RLS on with no policies (decision 0005) and no privileges for the public roles (decision 0042).
alter table public.appointment_reviews enable row level security;
revoke all on public.appointment_reviews from anon, authenticated;


-- The function of the migration 20261122211142, with the ratings (reviews) of the paid
-- appointments of the period, by the date of completion: how many of each rating there is.
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
