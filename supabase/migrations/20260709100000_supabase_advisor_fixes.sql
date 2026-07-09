-- Fix low-risk Supabase Advisor findings without opening user data access.

revoke all on function public.admin_health_snapshot() from public;
revoke all on function public.admin_health_snapshot() from anon;
revoke all on function public.admin_health_snapshot() from authenticated;
grant execute on function public.admin_health_snapshot() to service_role;

create index if not exists admin_user_restore_points_created_by_idx
  on public.admin_user_restore_points (created_by);

create index if not exists admin_user_restore_events_restore_point_idx
  on public.admin_user_restore_events (restore_point_id);

create index if not exists admin_user_restore_events_safety_restore_point_idx
  on public.admin_user_restore_events (safety_restore_point_id);

create index if not exists admin_user_restore_events_restored_by_idx
  on public.admin_user_restore_events (restored_by);
