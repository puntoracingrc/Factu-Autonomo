begin;

alter table public.expense_inbox_items
  add column if not exists source_email_id text,
  add column if not exists source_attachment_id text;

alter table public.expense_inbox_items
  drop constraint if exists expense_inbox_items_source_ids_check;

alter table public.expense_inbox_items
  add constraint expense_inbox_items_source_ids_check
  check (
    (source_email_id is null and source_attachment_id is null)
    or (
      source_email_id is not null
      and source_attachment_id is not null
      and char_length(source_email_id) between 1 and 200
      and char_length(source_attachment_id) between 1 and 200
    )
  );

comment on column public.expense_inbox_items.source_email_id is
  'Identificador opaco de Resend para recuperar el adjunto en un reintento.';
comment on column public.expense_inbox_items.source_attachment_id is
  'Identificador opaco del adjunto de Resend; nunca se expone al cliente.';

commit;
