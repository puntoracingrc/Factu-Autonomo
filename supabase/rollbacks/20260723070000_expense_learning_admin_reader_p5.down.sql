begin;

revoke all on function public.read_expense_learning_closed_week_metrics_v1()
  from public, anon, authenticated, service_role;
drop function public.read_expense_learning_closed_week_metrics_v1() restrict;

notify pgrst, 'reload schema';

commit;
