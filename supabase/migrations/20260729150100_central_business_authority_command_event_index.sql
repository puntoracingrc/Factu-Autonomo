create index if not exists central_business_commands_result_event_idx
  on public.central_business_commands (result_event_id)
  where result_event_id is not null;
