begin;

do $$
begin
  if pg_catalog.to_regclass(
    'expense_learning_private.learning_consent_decisions'
  ) is null then
    raise exception 'Expense learning consent P2A is not installed'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from expense_learning_private.learning_consent_decisions
  ) then
    raise exception 'Expense learning consent ledger is not empty; rollback is unsafe'
      using errcode = '55000';
  end if;
end;
$$;

drop function public.set_expense_learning_consent_v1(uuid, jsonb);
drop function public.get_expense_learning_consent_v1(uuid);

drop policy expense_learning_consent_owner_insert_v1
  on expense_learning_private.learning_consent_decisions;
drop policy expense_learning_consent_owner_select_v1
  on expense_learning_private.learning_consent_decisions;

drop table expense_learning_private.learning_consent_decisions;

notify pgrst, 'reload schema';

commit;
