create index if not exists app_company_access_audit_source_company_idx
  on public.app_company_access_audit (source_company_id);
