"use server";

import { createAnthropicClient, MODELO_CLAUDE } from "@/lib/anthropic";
import type { RankingMateria, ResultadoAccion } from "@/lib/types";

export async function explicarRanking(
  ranking: RankingMateria[],
): Promise<ResultadoAccion<RankingMateria[]>> {
  const recorte = ranking.slice(0, 8);

  try {
    const anthropic = createAnthropicClient();
    const respuesta = await anthropic.messages.create({
      model: MODELO_CLAUDE,
      max_tokens: 2000,
      tools: [
        {
          name: "explicar_ranking",
          description: "Explica en español por qué conviene priorizar cada materia.",
          input_schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              items: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    materia_id: { type: "string" },
                    explicacion: { type: "string" },
                  },
                  required: ["materia_id", "explicacion"],
                },
              },
            },
            required: ["items"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "explicar_ranking" },
      messages: [
        {
          role: "user",
          content: `Explicá este ranking de materias universitarias en español rioplatense, tono claro y breve (1 o 2 oraciones).
Usá el patrón "priorizá X porque desbloquea Y y Z" cuando haya correlativas.

${JSON.stringify(
  recorte.map((item) => ({
    id: item.materia.id,
    nombre: item.materia.nombre,
    puntaje: item.puntaje,
    desbloqueaDirectas: item.desbloqueaDirectas,
    desbloqueaIndirectas: item.desbloqueaIndirectas,
  })),
)}`,
        },
      ],
    });

    const herramienta = respuesta.content.find((bloque) => bloque.type === "tool_use");
    if (!herramienta || herramienta.type !== "tool_use") {
      return { ok: true, data: ranking };
    }

    const input = herramienta.input as { items?: { materia_id: string; explicacion: string }[] };
    const porId = new Map(
      (input.items ?? []).map((item) => [item.materia_id, item.explicacion]),
    );

    return {
      ok: true,
      data: ranking.map((item) => ({
        ...item,
        explicacion: porId.get(item.materia.id) ?? item.explicacion,
      })),
    };
  } catch {
    return { ok: true, data: ranking };
  }
}
