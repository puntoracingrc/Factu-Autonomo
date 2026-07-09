create or replace function public.admin_health_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.now();
  v_current_month text := to_char(v_now, 'YYYY-MM');
begin
  if auth.role() <> 'service_role' then
    raise exception 'admin_health_snapshot can only be executed by service_role';
  end if;

  return jsonb_build_object(
    'generatedAt', v_now,
    'database', jsonb_build_object(
      'bytes', pg_catalog.pg_database_size(pg_catalog.current_database()),
      'limitBytes', 8589934592
    ),
    'users', (
      select jsonb_build_object(
        'total', count(*)::integer,
        'active7d', (count(*) filter (
          where u.last_sign_in_at >= v_now - interval '7 days'
        ))::integer,
        'active30d', (count(*) filter (
          where u.last_sign_in_at >= v_now - interval '30 days'
        ))::integer,
        'new7d', (count(*) filter (
          where u.created_at >= v_now - interval '7 days'
        ))::integer
      )
      from auth.users u
    ),
    'sync', (
      select jsonb_build_object(
        'rows', count(*)::integer,
        'deletedRows', (count(*) filter (where se.deleted))::integer,
        'cloudUsers', count(distinct se.user_id)::integer,
        'updated24h', (count(*) filter (
          where se.updated_at >= v_now - interval '24 hours'
        ))::integer,
        'updated7d', (count(*) filter (
          where se.updated_at >= v_now - interval '7 days'
        ))::integer,
        'activeUsers24h', (count(distinct se.user_id) filter (
          where se.updated_at >= v_now - interval '24 hours'
        ))::integer,
        'activeUsers7d', (count(distinct se.user_id) filter (
          where se.updated_at >= v_now - interval '7 days'
        ))::integer,
        'latestSyncAt', max(se.updated_at)
      )
      from public.sync_entities se
    ),
    'usage', (
      select jsonb_build_object(
        'monthKey', v_current_month,
        'documentsCreated', coalesce(sum(uu.documents_created), 0)::integer,
        'expenseScans', coalesce(sum(uu.expense_scans_created), 0)::integer,
        'customerAiAutofills', coalesce(sum(uu.customer_ai_autofills_created), 0)::integer
      )
      from public.user_usage uu
      where uu.month_key = v_current_month
    ),
    'errors', (
      select jsonb_build_object(
        'last24h', (count(*) filter (
          where e.created_at >= v_now - interval '24 hours'
            and e.resolved_at is null
        ))::integer,
        'last7d', (count(*) filter (
          where e.created_at >= v_now - interval '7 days'
            and e.resolved_at is null
        ))::integer,
        'latestAt', max(e.created_at) filter (where e.resolved_at is null)
      )
      from public.app_error_events e
    ),
    'entityTypes', coalesce((
      select jsonb_agg(to_jsonb(t))
      from (
        select
          se.entity_type as "type",
          count(*)::integer as "rows",
          (count(*) filter (where se.deleted))::integer as "deletedRows"
        from public.sync_entities se
        group by se.entity_type
        order by count(*) desc, se.entity_type
        limit 12
      ) t
    ), '[]'::jsonb),
    'topUsers', coalesce((
      select jsonb_agg(to_jsonb(t))
      from (
        select
          se.user_id::text as "userId",
          coalesce(u.email, 'Sin email') as "email",
          count(*)::integer as "rowCount",
          (count(*) filter (where se.deleted))::integer as "deletedRows",
          max(se.updated_at) as "latestSyncAt",
          (count(*) filter (
            where se.entity_type in ('documents', 'document', 'invoice', 'invoices', 'quote', 'quotes', 'receipt', 'receipts')
          ))::integer as "documentRows",
          (count(*) filter (
            where se.entity_type in ('customers', 'customer', 'clients', 'client')
          ))::integer as "customerRows",
          (count(*) filter (
            where se.entity_type in ('expenses', 'expense', 'fixedExpenses', 'fixed_expenses')
          ))::integer as "expenseRows",
          (count(*) filter (
            where se.entity_type in ('products', 'product')
          ))::integer as "productRows"
        from public.sync_entities se
        left join auth.users u on u.id = se.user_id
        group by se.user_id, u.email
        order by count(*) desc, max(se.updated_at) desc nulls last
        limit 8
      ) t
    ), '[]'::jsonb),
    'hourly', coalesce((
      with hours as (
        select generate_series(
          date_trunc('hour', v_now) - interval '23 hours',
          date_trunc('hour', v_now),
          interval '1 hour'
        ) as hour_start
      ),
      sync_counts as (
        select date_trunc('hour', se.updated_at) as hour_start, count(*)::integer as updates
        from public.sync_entities se
        where se.updated_at >= date_trunc('hour', v_now) - interval '23 hours'
        group by 1
      ),
      error_counts as (
        select date_trunc('hour', e.created_at) as hour_start, count(*)::integer as errors
        from public.app_error_events e
        where e.created_at >= date_trunc('hour', v_now) - interval '23 hours'
          and e.resolved_at is null
        group by 1
      )
      select jsonb_agg(
        jsonb_build_object(
          'hour', h.hour_start,
          'syncUpdates', coalesce(sc.updates, 0),
          'errors', coalesce(ec.errors, 0)
        )
        order by h.hour_start
      )
      from hours h
      left join sync_counts sc using (hour_start)
      left join error_counts ec using (hour_start)
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_health_snapshot() from anon, authenticated;
grant execute on function public.admin_health_snapshot() to service_role;
