-- Corré este script en el SQL Editor de Supabase si el proyecto ya tenía el esquema viejo.
-- Es seguro repetirlo.

alter type public.estado_materia add value if not exists 'libre';
alter type public.estado_materia add value if not exists 'recursando';

alter table public.avance_carrera
  add column if not exists nota numeric,
  add column if not exists fecha date,
  add column if not exists comentario text,
  add column if not exists actualizado_en timestamptz not null default now();

alter table public.perfil_estudiante
  add column if not exists preferencias jsonb not null default '{}'::jsonb;

alter table public.sesiones_estudio
  add column if not exists formato text,
  add column if not exists nivel_detalle text,
  add column if not exists metodo_timer text,
  add column if not exists minutos_foco integer,
  add column if not exists minutos_descanso integer;
