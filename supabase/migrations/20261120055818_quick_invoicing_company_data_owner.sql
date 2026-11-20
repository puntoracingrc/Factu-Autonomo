begin;
set local lock_timeout = '5s';

-- The actor is an Auth user. The owner of the stored document is the company
-- workspace, which may have no corresponding Auth user.
alter table public.app_companies
  add constraint app_companies_id_data_owner_key unique (id, data_owner_id);

alter table public.quick_document_operations
  drop constraint quick_document_operations_company_id_fkey,
  drop constraint quick_document_operations_user_id_fkey,
  add constraint quick_document_operations_company_data_owner_fkey
    foreign key (company_id, user_id)
    references public.app_companies (id, data_owner_id) on delete cascade,
  add constraint quick_document_operations_operation_data_owner_key
    unique (operation_id, user_id);

alter table public.quick_customer_jobs
  drop constraint quick_customer_jobs_operation_id_fkey,
  drop constraint quick_customer_jobs_user_id_fkey,
  add constraint quick_customer_jobs_operation_data_owner_fkey
    foreign key (operation_id, user_id)
    references public.quick_document_operations (operation_id, user_id) on delete cascade;

commit;
