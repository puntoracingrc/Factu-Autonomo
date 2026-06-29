alter table public.verifactu_chain_state
  add column if not exists last_numserie text,
  add column if not exists last_fecha_expedicion text;
