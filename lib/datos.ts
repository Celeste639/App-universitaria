import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseCorrelativas, parseMaterias } from "@/lib/plan";
import type { Correlativa, EstadoMateria, Materia, PerfilEstudiante } from "@/lib/types";

export type PlanGuardado = {
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
        .select("materias, correlativas")
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

  const plan = planRow
    ? {
        materias: parseMaterias(planRow.materias),
        correlativas: parseCorrelativas(planRow.correlativas),
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
