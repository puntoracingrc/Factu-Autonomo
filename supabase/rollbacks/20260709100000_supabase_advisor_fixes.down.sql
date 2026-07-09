drop index if exists public.admin_user_restore_events_restored_by_idx;
drop index if exists public.admin_user_restore_events_safety_restore_point_idx;
drop index if exists public.admin_user_restore_events_restore_point_idx;
drop index if exists public.admin_user_restore_points_created_by_idx;

-- Keep the admin health RPC closed to browser roles even during rollback.
revoke all on function public.admin_health_snapshot() from public;
revoke all on function public.admin_health_snapshot() from anon;
revoke all on function public.admin_health_snapshot() from authenticated;
grant execute on function public.admin_health_snapshot() to service_role;
