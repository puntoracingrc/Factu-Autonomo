-- EXPENSE_ORIGINAL_FILES_PRIVATE_V1
-- Opt-in originals for manual expenses; automatic preservation for cloud inboxes.
-- No binary content is added to business entities, browser snapshots or outboxes.
begin;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('factu-expense-originals','factu-expense-originals',false,4194304,array[
  'application/pdf','image/png','image/jpeg','image/webp','image/gif',
  'application/msword','application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]) on conflict (id) do nothing;
do $$ begin
  if not exists (select 1 from storage.buckets
    where id = 'factu-expense-originals' and not public
      and file_size_limit = 4194304) then
    raise exception 'EXPENSE_ORIGINAL_BUCKET_CONFIGURATION_MISMATCH';
  end if;
end $$;

-- Defense in depth: even a broad permissive policy for another bucket must
-- never expose these objects to browser/anonymous Storage API requests.
create policy expense_original_objects_server_only_v1 on storage.objects
  as restrictive for all to anon, authenticated
  using (bucket_id <> 'factu-expense-originals')
  with check (bucket_id <> 'factu-expense-originals');

create table public.expense_original_files (
  user_id uuid not null,
  binding_kind text not null check (binding_kind in ('expense','inbox')),
  binding_id text not null check (length(binding_id) between 1 and 200),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  mime_type text not null check (mime_type in (
    'application/pdf','image/png','image/jpeg','image/webp','image/gif',
    'application/msword','application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')),
  file_name text not null check (length(file_name) between 1 and 180),
  byte_size integer not null check (byte_size between 1 and 4194304),
  created_at timestamptz not null default statement_timestamp(),
  primary key (user_id,binding_kind,binding_id),
  check (binding_kind <> 'inbox' or binding_id = sha256)
);
alter table public.expense_original_files enable row level security;
alter table public.expense_original_files force row level security;
revoke all on table public.expense_original_files from public, anon, authenticated, service_role;
grant select, insert on table public.expense_original_files to service_role;

create function public.broadcast_expense_original_wakeup_v1()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform realtime.send(jsonb_build_object('kind','expense_originals'),
    'workspace_auxiliary_changed','central-business:' || new.user_id::text,true);
  return null;
end $$;
revoke all on function public.broadcast_expense_original_wakeup_v1() from public, anon, authenticated;
create trigger expense_original_files_wakeup_v1 after insert on public.expense_original_files
  for each row execute function public.broadcast_expense_original_wakeup_v1();

comment on table public.expense_original_files is
  'Private immutable original links by company data owner; bytes live in a server-only Storage bucket. Expense deletion never deletes an original.';
commit;
