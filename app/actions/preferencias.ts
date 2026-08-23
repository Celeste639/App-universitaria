"use server";

import { revalidarRutasApp } from "@/lib/revalidar";
import { cargarPerfilEstudiante } from "@/lib/perfil";
import { minutosSegunMetodo, parsePreferencias, preferenciasComoJson } from "@/lib/preferencias";
import { mensajeErrorSupabase } from "@/lib/errores-supabase";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PreferenciasUsuario, ResultadoAccion } from "@/lib/types";

export async function guardarPreferenciasUsuario(
  parcial: Partial<PreferenciasUsuario>,
): Promise<ResultadoAccion<{ preferencias: PreferenciasUsuario }>> {
  const { userId, perfil } = await cargarPerfilEstudiante();
  if (!userId) {
    return { ok: false, error: "Tenés que iniciar sesión para guardar preferencias." };
  }

  const actual = parsePreferencias(perfil?.preferencias ?? {});
  const metodo = parcial.metodo_timer ?? actual.metodo_timer;
  const minutos = minutosSegunMetodo(
    metodo,
    parcial.minutos_foco ?? actual.minutos_foco,
    parcial.minutos_descanso ?? actual.minutos_descanso,
  );
  const siguiente: PreferenciasUsuario = {
    ...actual,
    ...parcial,
    metodo_timer: metodo,
    minutos_foco: minutos.foco,
    minutos_descanso: minutos.descanso,
    colores_materias: {
      ...actual.colores_materias,
      ...(parcial.colores_materias ?? {}),
    },
  };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("perfil_estudiante").upsert({
    user_id: userId,
    preferencias: preferenciasComoJson(siguiente),
  });

  if (error) {
    return {
      ok: false,
      error: mensajeErrorSupabase(
        error,
        "No pude guardar las preferencias. Probá de nuevo en unos segundos.",
      ),
    };
  }

  revalidarRutasApp();
  return { ok: true, data: { preferencias: siguiente } };
}
