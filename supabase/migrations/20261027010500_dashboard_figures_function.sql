-- Numbers of the dashboard aggregated in the database (issue #51, UC09, RN021).
-- Rules: docs/agendamento/calculos.md (section 5), docs/agendamento/dados.md.


-- Read only. Gives, as a jsonb, the appointments scheduled in [p_from, p_to) by status
-- (statusCounts) and the revenue and the number of the paid ones, the completed and the
-- rescheduled with completed_at in [p_from, p_to), by the day of completion in the time
-- zone p_time_zone (revenueByDay). The database aggregates because a read of the API stops
-- at 1000 rows, and a period of 12 months can have more appointments than that. Only the
-- statuses and the days that exist come; the service fills in the others.
create function public.dashboard_figures(
  p_from timestamptz,
  p_to timestamptz,
  p_time_zone text
)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'statusCounts', coalesce((
      select jsonb_agg(
        jsonb_build_object('status', s.status, 'count', s.total) order by s.status
      )
      from (
        select a.status, count(*) as total
        from public.appointments a
        where a.scheduled_at >= p_from and a.scheduled_at < p_to
        group by a.status
      ) s
    ), '[]'::jsonb),
    'revenueByDay', coalesce((
      select jsonb_agg(
        jsonb_build_object('date', r.day, 'revenue', r.revenue, 'paidCount', r.paid)
        order by r.day
      )
      from (
        select
          (a.completed_at at time zone p_time_zone)::date as day,
          sum(a.total) as revenue,
          count(*) as paid
        from public.appointments a
        where a.status in ('completed', 'rescheduled')
          and a.completed_at >= p_from and a.completed_at < p_to
        group by 1
      ) r
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.dashboard_figures(timestamptz, timestamptz, text)
  from public, anon, authenticated;
grant execute on function public.dashboard_figures(timestamptz, timestamptz, text)
  to service_role;
