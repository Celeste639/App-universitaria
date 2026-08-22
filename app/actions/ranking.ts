"use server";

import { createAnthropicClient, MODELO_CLAUDE } from "@/lib/anthropic";
import { cargarPerfilEstudiante } from "@/lib/perfil";
import { perfilParaPrompt, SYSTEM_EXPLICAR_RANKING } from "@/lib/prompts";
import { explicarRankingConPerfil } from "@/lib/explicaciones";
import type { RankingMateria, ResultadoAccion } from "@/lib/types";

export async function explicarRanking(
  ranking: RankingMateria[],
): Promise<ResultadoAccion<RankingMateria[]>> {
  const { perfil } = await cargarPerfilEstudiante();
  const recorte = ranking.slice(0, 8);

  try {
    const anthropic = createAnthropicClient();
    const respuesta = await anthropic.messages.create({
      model: MODELO_CLAUDE,
      max_tokens: 2500,
      system: SYSTEM_EXPLICAR_RANKING,
      tools: [
        {
          name: "explicar_ranking",
          description:
            "Explica en segunda persona por qué conviene priorizar cada materia, citando el perfil cuando aplique.",
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
                    alerta_rotativo: {
                      type: "boolean",
                      description:
                        "true si hay conflicto con horario rotativo o conviene constancia laboral",
                    },
                  },
                  required: ["materia_id", "explicacion", "alerta_rotativo"],
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
          content: `${perfilParaPrompt(perfil)}

Ranking académico (no lo reordenes). puntaje = materias futuras que desbloquea, ya calculado:

${JSON.stringify(
  recorte.map((item) => ({
    id: item.materia.id,
    nombre: item.materia.nombre,
    codigo: item.materia.codigo ?? null,
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
      return { ok: true, data: explicarRankingConPerfil(ranking, perfil) };
    }

    const input = herramienta.input as {
      items?: {
        materia_id: string;
        explicacion: string;
        alerta_rotativo?: boolean;
      }[];
    };
    const porId = new Map(
      (input.items ?? []).map((item) => [item.materia_id, item]),
    );

    return {
      ok: true,
      data: ranking.map((item) => {
        const generado = porId.get(item.materia.id);
        if (!generado?.explicacion) {
          return explicarRankingConPerfil([item], perfil)[0];
        }

        const alerta =
          generado.alerta_rotativo &&
          !generado.explicacion.toLowerCase().includes("profesor")
            ? " Revisá disponibilidad con el profesor; puede que necesites presentar constancia laboral."
            : "";

        return {
          ...item,
          explicacion: `${generado.explicacion.trim()}${alerta}`,
        };
      }),
    };
  } catch {
    return { ok: true, data: explicarRankingConPerfil(ranking, perfil) };
  }
}
