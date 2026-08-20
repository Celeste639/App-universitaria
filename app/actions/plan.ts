"use server";

import type { PlanEstudioParseado, ResultadoAccion } from "@/lib/types";

export async function parsearPlanEstudio(
  formData: FormData,
): Promise<ResultadoAccion<PlanEstudioParseado>> {
  void formData;
  return {
    ok: false,
    error:
      "Todavía no está conectado el parser del plan. En el próximo paso lo vinculamos a Claude.",
  };
}

export async function guardarPerfilEstudiante(
  formData: FormData,
): Promise<ResultadoAccion<{ user_id: string }>> {
  void formData;
  return {
    ok: false,
    error: "Todavía no está conectado el guardado de perfil en Supabase.",
  };
}
