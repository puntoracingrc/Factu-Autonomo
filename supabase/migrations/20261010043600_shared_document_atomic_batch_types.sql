-- Keep the atomic batch admission list aligned with the single-entity authority.
-- All document-specific validation, CAS and all-or-nothing rollback stay in place.
begin;
do $$
declare d text; needle text := '''user_reminder'',';
begin
  d := pg_catalog.pg_get_functiondef('public.mutate_central_business_batch_v1(uuid,text,text,jsonb)'::regprocedure);
  if position(needle in d) = 0 or position('''document_draft''' in d) > 0
    or position('''quote''' in d) > 0 or position('''receipt''' in d) > 0 then
    raise exception 'unexpected central business batch type definition';
  end if;
  d := replace(d, needle, needle || ' ''quote'', ''receipt'', ''document_draft'',');
  execute d;
end $$;
commit;
