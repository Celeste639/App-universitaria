import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseCorrelativas, parseMaterias } from "@/lib/plan";
import { alinearCorrelativas } from "@/lib/correlativas";
import type {
  CalendarioGenerado,
  Correlativa,
  EstadoMateria,
  EventoCalendario,
  Materia,
  PerfilEstudiante,
  SesionEstudio,
} from "@/lib/types";
import type { Json } from "@/types/database";
import { startOfWeek } from "date-fns";

export type PlanGuardado = {
  id: string;
  materias: Materia[];
  correlativas: Correlativa[];
};

export async function cargarPlanYAvance(userId: string): Promise<{
  plan: PlanGuardado | null;
  avance: Map<string, EstadoMateria>;
  perfil: PerfilEstudiante | null;
}> {
  const supabase = createSupabaseServerClient();

  const [{ data: planRow }, { data: avanceRows }, { data: perfilRow }] =
    await Promise.all([
      supabase
        .from("planes_estudio")
        .select("id, materias, correlativas")
        .eq("user_id", userId)
        .order("creado_en", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("avance_carrera")
        .select("materia_id, estado")
        .eq("user_id", userId),
      supabase
        .from("perfil_estudiante")
        .select(
          "user_id, horas_trabajo, tipo_trabajo, horario_rotativo, otras_actividades, metodo_estudio",
        )
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  const materias = planRow ? parseMaterias(planRow.materias) : [];
  const plan = planRow
    ? {
        id: planRow.id,
        materias,
        correlativas: alinearCorrelativas(
          materias,
          parseCorrelativas(planRow.correlativas),
        ),
      }
    : null;

  const avance = new Map<string, EstadoMateria>();
  for (const fila of avanceRows ?? []) {
    avance.set(fila.materia_id, fila.estado);
  }

  return {
    plan,
    avance,
    perfil: perfilRow,
  };
}

function esEvento(value: unknown): value is EventoCalendario {
  if (!value || typeof value !== "object") return false;
  const fila = value as Record<string, unknown>;
  return (
    typeof fila.id === "string" &&
    typeof fila.title === "string" &&
    typeof fila.start === "string" &&
    typeof fila.end === "string"
  );
}

function parseCalendarioJson(json: Json): CalendarioGenerado | null {
  if (Array.isArray(json)) {
    const eventos = json.filter(esEvento);
    return eventos.length > 0
      ? { eventos, avisos: [], resumen: "" }
      : null;
  }

  if (!json || typeof json !== "object") return null;
  const fila = json as {
    resumen?: unknown;
    avisos?: unknown;
    items?: unknown;
  };
  const eventos = Array.isArray(fila.items) ? fila.items.filter(esEvento) : [];
  if (eventos.length === 0 && typeof fila.resumen !== "string") return null;

  return {
    resumen: typeof fila.resumen === "string" ? fila.resumen : "",
    avisos: Array.isArray(fila.avisos)
      ? fila.avisos.filter((item): item is string => typeof item === "string")
      : [],
    eventos,
  };
}

export async function cargarCalendarioSemana(
  userId: string,
): Promise<CalendarioGenerado | null> {
  const lunes = startOfWeek(new Date(), { weekStartsOn: 1 });
  lunes.setHours(0, 0, 0, 0);
  const semana = lunes.toISOString().slice(0, 10);
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("calendario")
    .select("eventos")
    .eq("user_id", userId)
    .eq("semana", semana)
    .maybeSingle();

  if (!data) return null;
  return parseCalendarioJson(data.eventos);
}

function semanaActualIso(): string {
  const lunes = startOfWeek(new Date(), { weekStartsOn: 1 });
  lunes.setHours(0, 0, 0, 0);
  return lunes.toISOString().slice(0, 10);
}

export async function invalidarCalendarioSemanaActual(userId: string): Promise<void> {
  const supabase = createSupabaseServerClient();
  await supabase
    .from("calendario")
    .delete()
    .eq("user_id", userId)
    .eq("semana", semanaActualIso());
}

export async function cargarSesionesMateria(
  userId: string,
  materiaId: string,
): Promise<SesionEstudio[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("sesiones_estudio")
    .select("id, materia_id, contenido_original, resumen_ia, creado_en")
    .eq("user_id", userId)
    .eq("materia_id", materiaId)
    .order("creado_en", { ascending: false })
    .limit(20);

  return data ?? [];
}
