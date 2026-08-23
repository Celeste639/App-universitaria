-- Copiloto de carrera — esquema inicial de Supabase
-- Pegá este script en el SQL Editor del proyecto (Dashboard → SQL → New query).
-- Auth: los usuarios viven en auth.users. No hace falta una tabla public.users.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.planes_estudio (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  materias jsonb not null default '[]'::jsonb,
  correlativas jsonb not null default '[]'::jsonb,
  creado_en timestamptz not null default now()
);

create table if not exists public.perfil_estudiante (
  user_id uuid primary key references auth.users (id) on delete cascade,
  horas_trabajo integer,
  tipo_trabajo text,
  horario_rotativo boolean not null default false,
  otras_actividades text,
  metodo_estudio text,
  materias_por_cuatrimestre integer,
  preferencias jsonb not null default '{}'::jsonb
);

create table if not exists public.calendario (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  semana date not null,
  eventos jsonb not null default '[]'::jsonb,
  unique (user_id, semana)
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

-- Columnas y valores de enum para bases que ya tenían el esquema viejo.
-- CREATE TABLE IF NOT EXISTS no agrega columnas a una tabla existente.
alter table public.perfil_estudiante
  add column if not exists materias_por_cuatrimestre integer;

alter table public.perfil_estudiante
  add column if not exists preferencias jsonb not null default '{}'::jsonb;

alter type public.estado_materia add value if not exists 'libre';
alter type public.estado_materia add value if not exists 'recursando';

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

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------

create index if not exists planes_estudio_user_id_idx
  on public.planes_estudio (user_id, creado_en desc);

create index if not exists calendario_user_semana_idx
  on public.calendario (user_id, semana desc);

create index if not exists sesiones_estudio_user_materia_idx
  on public.sesiones_estudio (user_id, materia_id, creado_en desc);

create index if not exists avance_carrera_user_estado_idx
  on public.avance_carrera (user_id, estado);

-- ---------------------------------------------------------------------------
-- Perfil automático al registrarse
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfil_estudiante (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.planes_estudio enable row level security;
alter table public.perfil_estudiante enable row level security;
alter table public.calendario enable row level security;
alter table public.sesiones_estudio enable row level security;
alter table public.avance_carrera enable row level security;

drop policy if exists "planes_estudio_select_own" on public.planes_estudio;
create policy "planes_estudio_select_own"
  on public.planes_estudio for select
  using (auth.uid() = user_id);

drop policy if exists "planes_estudio_insert_own" on public.planes_estudio;
create policy "planes_estudio_insert_own"
  on public.planes_estudio for insert
  with check (auth.uid() = user_id);

drop policy if exists "planes_estudio_update_own" on public.planes_estudio;
create policy "planes_estudio_update_own"
  on public.planes_estudio for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "planes_estudio_delete_own" on public.planes_estudio;
create policy "planes_estudio_delete_own"
  on public.planes_estudio for delete
  using (auth.uid() = user_id);

drop policy if exists "perfil_estudiante_select_own" on public.perfil_estudiante;
create policy "perfil_estudiante_select_own"
  on public.perfil_estudiante for select
  using (auth.uid() = user_id);

drop policy if exists "perfil_estudiante_insert_own" on public.perfil_estudiante;
create policy "perfil_estudiante_insert_own"
  on public.perfil_estudiante for insert
  with check (auth.uid() = user_id);

drop policy if exists "perfil_estudiante_update_own" on public.perfil_estudiante;
create policy "perfil_estudiante_update_own"
  on public.perfil_estudiante for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "calendario_select_own" on public.calendario;
create policy "calendario_select_own"
  on public.calendario for select
  using (auth.uid() = user_id);

drop policy if exists "calendario_insert_own" on public.calendario;
create policy "calendario_insert_own"
  on public.calendario for insert
  with check (auth.uid() = user_id);

drop policy if exists "calendario_update_own" on public.calendario;
create policy "calendario_update_own"
  on public.calendario for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "calendario_delete_own" on public.calendario;
create policy "calendario_delete_own"
  on public.calendario for delete
  using (auth.uid() = user_id);

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

drop policy if exists "sesiones_estudio_delete_own" on public.sesiones_estudio;
create policy "sesiones_estudio_delete_own"
  on public.sesiones_estudio for delete
  using (auth.uid() = user_id);

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

drop policy if exists "avance_carrera_delete_own" on public.avance_carrera;
create policy "avance_carrera_delete_own"
  on public.avance_carrera for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage (planes de estudio y contenido de clases)
-- Los archivos se guardan en {user_id}/...
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'planes-estudio',
    'planes-estudio',
    false,
    33554432,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'text/plain', 'text/csv']
  ),
  (
    'contenido-clases',
    'contenido-clases',
    false,
    33554432,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'text/plain', 'text/csv']
  )
on conflict (id) do nothing;

update storage.buckets
set
  file_size_limit = 33554432,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'text/plain', 'text/csv']
where id = 'planes-estudio';

update storage.buckets
set
  file_size_limit = 33554432,
  allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'text/plain', 'text/csv']
where id = 'contenido-clases';

drop policy if exists "planes_storage_select_own" on storage.objects;
create policy "planes_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'planes-estudio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "planes_storage_insert_own" on storage.objects;
create policy "planes_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'planes-estudio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "planes_storage_delete_own" on storage.objects;
create policy "planes_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'planes-estudio'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "clases_storage_select_own" on storage.objects;
create policy "clases_storage_select_own"
  on storage.objects for select
  using (
    bucket_id = 'contenido-clases'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "clases_storage_insert_own" on storage.objects;
create policy "clases_storage_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'contenido-clases'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "clases_storage_delete_own" on storage.objects;
create policy "clases_storage_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'contenido-clases'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ---------------------------------------------------------------------------
-- Forma esperada del JSON (referencia para el LLM, no es un constraint)
--
-- materias: [{ "id": "ALG1", "nombre": "Álgebra I", "codigo": "MAT101",
--              "anio": 1, "cuatrimestre": 1, "carga_horaria": 6 }]
--
-- correlativas: [{ "materia_id": "ALG2", "requiere": ["ALG1"] }]
--
-- eventos: [{ "id": "...", "title": "Estudiar Álgebra I",
--             "start": "2026-08-24T18:00:00", "end": "2026-08-24T19:00:00",
--             "materia_id": "ALG1", "tipo": "estudio",
--             "aviso": "consultar disponibilidad con el profesor" }]
-- ---------------------------------------------------------------------------

notify pgrst, 'reload schema';
