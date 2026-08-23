"use server";

import { createAnthropicClient, MODELO_CLAUDE } from "@/lib/anthropic";
import { getAuthUser } from "@/lib/auth";
import { invalidarCalendarioSemanaActual } from "@/lib/datos";
import { mensajeErrorSupabase } from "@/lib/errores-supabase";
import {
  armarResumenEscenario,
  recorteRankingParaPrompt,
  textoComparacionLocal,
  type ParametrosEscenario,
} from "@/lib/escenarios";
import { perfilParaPrompt, SYSTEM_COMPARAR_ESCENARIOS } from "@/lib/prompts";
import { revalidarRutasApp } from "@/lib/revalidar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Correlativa, Materia, PerfilEstudiante, ResultadoAccion } from "@/lib/types";

export async function compararEscenarios(input: {
  materias: Materia[];
  correlativas: Correlativa[];
  idsPendientes: string[];
  perfil: PerfilEstudiante | null;
  actual: ParametrosEscenario;
  simulado: ParametrosEscenario;
}): Promise<ResultadoAccion<{ comparacion: string }>> {
  const actual = armarResumenEscenario(
    input.materias,
    input.correlativas,
    input.idsPendientes,
    input.perfil,
    input.actual,
  );
  const simulado = armarResumenEscenario(
    input.materias,
    input.correlativas,
    input.idsPendientes,
    input.perfil,
    input.simulado,
  );
  const fallback = textoComparacionLocal(actual, simulado);

  try {
    const anthropic = createAnthropicClient();
    const respuesta = await anthropic.messages.create({
      model: MODELO_CLAUDE,
      max_tokens: 700,
      system: SYSTEM_COMPARAR_ESCENARIOS,
      tools: [
        {
          name: "comparar_escenarios",
          description:
            "Comparación breve en segunda persona entre el escenario actual y el simulado.",
          input_schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              comparacion: { type: "string" },
            },
            required: ["comparacion"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "comparar_escenarios" },
      messages: [
        {
          role: "user",
          content: `${perfilParaPrompt(input.perfil)}

Escenario actual:
${JSON.stringify({
  parametros: actual.parametros,
  pendientes: actual.pendientes,
  cuatrimestres_estimados: actual.cuatrimestres,
  ranking: recorteRankingParaPrompt(actual.ranking),
  proximo_cuatrimestre: recorteRankingParaPrompt(actual.proximoCuatrimestre),
})}

Escenario simulado:
${JSON.stringify({
  parametros: simulado.parametros,
  pendientes: simulado.pendientes,
  cuatrimestres_estimados: simulado.cuatrimestres,
  ranking: recorteRankingParaPrompt(simulado.ranking),
  proximo_cuatrimestre: recorteRankingParaPrompt(simulado.proximoCuatrimestre),
})}

El ranking y los cuatrimestres ya están calculados. Explicá la diferencia.`,
        },
      ],
    });

    const herramienta = respuesta.content.find((bloque) => bloque.type === "tool_use");
    if (!herramienta || herramienta.type !== "tool_use") {
      return { ok: true, data: { comparacion: fallback } };
    }
    const payload = herramienta.input as { comparacion?: string };
    const texto = payload.comparacion?.trim();
    return { ok: true, data: { comparacion: texto || fallback } };
  } catch {
    return { ok: true, data: { comparacion: fallback } };
  }
}

export async function aplicarEscenarioPerfil(
  parametros: ParametrosEscenario,
): Promise<ResultadoAccion<{ aplicado: true }>> {
  const user = await getAuthUser();
  if (!user) {
    return { ok: false, error: "Tenés que iniciar sesión para guardar el escenario." };
  }

  const payloadCompleto = {
    horas_trabajo: parametros.horas_trabajo,
    horario_rotativo: parametros.horario_rotativo,
    materias_por_cuatrimestre: parametros.materias_por_cuatrimestre,
  };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("perfil_estudiante").upsert({
    user_id: user.id,
    ...payloadCompleto,
  });

  if (error) {
    const texto = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
    if (texto.includes("materias_por_cuatrimestre")) {
      const { error: errorParcial } = await supabase.from("perfil_estudiante").upsert({
        user_id: user.id,
        horas_trabajo: parametros.horas_trabajo,
        horario_rotativo: parametros.horario_rotativo,
      });
      if (errorParcial) {
        return {
          ok: false,
          error: mensajeErrorSupabase(
            errorParcial,
            "No pude guardar el escenario en tu perfil.",
          ),
        };
      }
    } else {
      return {
        ok: false,
        error: mensajeErrorSupabase(error, "No pude guardar el escenario en tu perfil."),
      };
    }
  }

  await invalidarCalendarioSemanaActual(user.id);
  revalidarRutasApp();
  return { ok: true, data: { aplicado: true } };
}
