-- Ejecuta esto en el SQL Editor de tu proyecto Supabase (gratis en supabase.com)

-- Copia completa antigua (compatibilidad / migración)
create table if not exists public.user_backups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Sincronización incremental: solo cambios por entidad
create table if not exists public.sync_entities (
  user_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  payload jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, entity_type, entity_id)
);

create index if not exists sync_entities_user_updated_idx
  on public.sync_entities (user_id, updated_at);

alter table public.user_backups enable row level security;
alter table public.sync_entities enable row level security;

drop policy if exists "Leer copia propia" on public.user_backups;
create policy "Leer copia propia"
  on public.user_backups for select
  using (auth.uid() = user_id);

drop policy if exists "Crear copia propia" on public.user_backups;
create policy "Crear copia propia"
  on public.user_backups for insert
  with check (auth.uid() = user_id);

drop policy if exists "Actualizar copia propia" on public.user_backups;
create policy "Actualizar copia propia"
  on public.user_backups for update
  using (auth.uid() = user_id);

drop policy if exists "Leer entidades propias" on public.sync_entities;
create policy "Leer entidades propias"
  on public.sync_entities for select
  using (auth.uid() = user_id);

drop policy if exists "Crear entidades propias" on public.sync_entities;
create policy "Crear entidades propias"
  on public.sync_entities for insert
  with check (auth.uid() = user_id);

drop policy if exists "Actualizar entidades propias" on public.sync_entities;
create policy "Actualizar entidades propias"
  on public.sync_entities for update
  using (auth.uid() = user_id);
