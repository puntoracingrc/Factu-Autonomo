alter table public.verifactu_chain_state
  drop column if exists last_fecha_expedicion,
  drop column if exists last_numserie;
