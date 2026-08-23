-- Un solo Run cubre:
--   • cambio de estado en el dashboard (avance_carrera.actualizado_en, nota, fecha, comentario, Libre/Recursando)
--   • "Generar resumen" (sesiones_estudio.formato, nivel_detalle, metodo_timer, minutos)
--   • preferencias de formato/timer (perfil_estudiante.preferencias)
-- Pegala en el SQL Editor de Supabase (Dashboard → SQL → New query) y dale Run.
-- Es seguro repetirla: no borra filas. CREATE IF NOT EXISTS + ADD COLUMN IF NOT EXISTS.

create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_materia') then
    create type public.estado_materia as enum (
      'pendiente',
      'cursando',
      'aprobada',
      'libre',
      'recursando'
    );
  end if;
end
$$;

alter type public.estado_materia add value if not exists 'libre';
alter type public.estado_materia add value if not exists 'recursando';

create table if not exists public.avance_carrera (
  user_id uuid not null references auth.users (id) on delete cascade,
  materia_id text not null,
  estado public.estado_materia not null default 'pendiente',
  nota numeric,
  fecha date,
  comentario text,
  actualizado_en timestamptz not null default now(),
  primary key (user_id, materia_id)
);

create table if not exists public.sesiones_estudio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  materia_id text not null,
  contenido_original text,
  resumen_ia text,
  formato text,
  nivel_detalle text,
  metodo_timer text,
  minutos_foco integer,
  minutos_descanso integer,
  creado_en timestamptz not null default now()
);

alter table public.avance_carrera
  add column if not exists nota numeric,
  add column if not exists fecha date,
  add column if not exists comentario text,
  add column if not exists actualizado_en timestamptz not null default now();

alter table public.sesiones_estudio
  add column if not exists formato text,
  add column if not exists nivel_detalle text,
  add column if not exists metodo_timer text,
  add column if not exists minutos_foco integer,
  add column if not exists minutos_descanso integer;

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'perfil_estudiante'
  ) then
    alter table public.perfil_estudiante
      add column if not exists preferencias jsonb not null default '{}'::jsonb;
  end if;
end
$$;

alter table public.avance_carrera enable row level security;
alter table public.sesiones_estudio enable row level security;

drop policy if exists "avance_carrera_select_own" on public.avance_carrera;
create policy "avance_carrera_select_own"
  on public.avance_carrera for select
  using (auth.uid() = user_id);

drop policy if exists "avance_carrera_insert_own" on public.avance_carrera;
create policy "avance_carrera_insert_own"
  on public.avance_carrera for insert
  with check (auth.uid() = user_id);

drop policy if exists "avance_carrera_update_own" on public.avance_carrera;
create policy "avance_carrera_update_own"
  on public.avance_carrera for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "sesiones_estudio_select_own" on public.sesiones_estudio;
create policy "sesiones_estudio_select_own"
  on public.sesiones_estudio for select
  using (auth.uid() = user_id);

drop policy if exists "sesiones_estudio_insert_own" on public.sesiones_estudio;
create policy "sesiones_estudio_insert_own"
  on public.sesiones_estudio for insert
  with check (auth.uid() = user_id);

drop policy if exists "sesiones_estudio_update_own" on public.sesiones_estudio;
create policy "sesiones_estudio_update_own"
  on public.sesiones_estudio for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';
