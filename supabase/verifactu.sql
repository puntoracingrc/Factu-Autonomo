-- Registros Veri*Factu (auditoría servidor) — ejecutar en SQL Editor de Supabase

create table if not exists public.verifactu_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  document_id text not null,
  issuer_nif text not null,
  numserie text not null,
  record_type text not null check (record_type in ('alta', 'anulacion')),
  record_hash text not null,
  previous_hash text not null,
  qr_url text not null,
  csv text,
  status text not null,
  xml_payload text not null,
  aeat_response text,
  created_at timestamptz not null default now()
);

create index if not exists verifactu_records_user_created_idx
  on public.verifactu_records (user_id, created_at desc);

create table if not exists public.verifactu_chain_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  issuer_nif text not null,
  last_hash text not null,
  last_numserie text,
  last_fecha_expedicion text,
  record_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, issuer_nif)
);

alter table public.verifactu_records enable row level security;
alter table public.verifactu_chain_state enable row level security;

drop policy if exists "Leer registros Verifactu propios" on public.verifactu_records;
create policy "Leer registros Verifactu propios"
  on public.verifactu_records for select
  using (auth.uid() = user_id);

drop policy if exists "Leer cadena Verifactu propia" on public.verifactu_chain_state;
create policy "Leer cadena Verifactu propia"
  on public.verifactu_chain_state for select
  using (auth.uid() = user_id);
