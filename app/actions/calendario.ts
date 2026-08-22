"use server";

import { addDays, formatISO, startOfWeek } from "date-fns";
import { createAnthropicClient, MODELO_CLAUDE } from "@/lib/anthropic";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cargarPerfilEstudiante } from "@/lib/perfil";
import { perfilParaPrompt, SYSTEM_GENERAR_CALENDARIO } from "@/lib/prompts";
import type { Json } from "@/types/database";
import type {
  CalendarioGenerado,
  EventoCalendario,
  RankingMateria,
  ResultadoAccion,
  TipoEventoCalendario,
} from "@/lib/types";

const TIPOS_EVENTO = new Set<TipoEventoCalendario>([
  "estudio",
  "trabajo",
  "actividad",
  "aviso",
]);

function lunesDeEstaSemana(): Date {
  return startOfWeek(new Date(), { weekStartsOn: 1 });
}

function parseEventos(raw: unknown, inicioSemana: Date, finSemana: Date): EventoCalendario[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const fila = item as Record<string, unknown>;
    const start = typeof fila.start === "string" ? new Date(fila.start) : null;
    const end = typeof fila.end === "string" ? new Date(fila.end) : null;
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return [];
    }
    if (start < inicioSemana || end > finSemana || end <= start) {
      return [];
    }

    const tipo = TIPOS_EVENTO.has(fila.tipo as TipoEventoCalendario)
      ? (fila.tipo as TipoEventoCalendario)
      : "estudio";

    return [
      {
        id: typeof fila.id === "string" && fila.id.length > 0 ? fila.id : `evt-${index}`,
        title: typeof fila.title === "string" ? fila.title : "Estudio",
        start: start.toISOString(),
        end: end.toISOString(),
        materia_id: typeof fila.materia_id === "string" ? fila.materia_id : undefined,
        tipo,
        aviso: typeof fila.aviso === "string" ? fila.aviso : undefined,
      },
    ];
  });
}

function uniqueAvisos(items: string[]): string[] {
  return Array.from(
    new Set(items.filter((aviso) => aviso.trim().length > 0)),
  );
}

export async function generarCalendarioSemanal(
  ranking: RankingMateria[],
): Promise<ResultadoAccion<CalendarioGenerado>> {
  const { userId, perfil } = await cargarPerfilEstudiante();
  if (!userId) {
    return { ok: false, error: "Tenés que iniciar sesión para armar el calendario." };
  }

  const inicioSemana = lunesDeEstaSemana();
  inicioSemana.setHours(0, 0, 0, 0);
  const finSemana = addDays(inicioSemana, 7);
  const semana = inicioSemana.toISOString().slice(0, 10);
  const prioridades = ranking.slice(0, 5);

  const fallback: CalendarioGenerado = {
    eventos: [],
    avisos: perfil?.horario_rotativo
      ? [
          "Revisá disponibilidad con el profesor: tu horario de trabajo es rotativo y puede chocar con la comisión.",
          "Puede que necesites presentar constancia laboral.",
        ]
      : [],
    resumen: perfil
      ? `Todavía no pude armar bloques automáticos, pero ya tengo tu perfil: ${perfil.horas_trabajo ?? 0} h de trabajo${perfil.horario_rotativo ? ", horario rotativo" : ""}${perfil.otras_actividades ? ` y ${perfil.otras_actividades}` : ""}.`
      : "Todavía no pude armar el calendario de esta semana.",
  };

  try {
    const anthropic = createAnthropicClient();
    const respuesta = await anthropic.messages.create({
      model: MODELO_CLAUDE,
      max_tokens: 3000,
      system: SYSTEM_GENERAR_CALENDARIO,
      tools: [
        {
          name: "armar_calendario_semanal",
          description:
            "Calendario de una semana y resumen personalizado según el perfil del estudiante.",
          input_schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              resumen: {
                type: "string",
                description:
                  "2 oraciones en segunda persona explicando cómo el perfil influyó en los bloques.",
              },
              conflicto_rotativo: { type: "boolean" },
              pide_constancia_laboral: { type: "boolean" },
              avisos: {
                type: "array",
                items: { type: "string" },
              },
              eventos: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    start: {
                      type: "string",
                      description: "ISO 8601 con fecha y hora",
                    },
                    end: { type: "string" },
                    materia_id: { type: ["string", "null"] },
                    tipo: {
                      type: "string",
                      enum: ["estudio", "trabajo", "actividad", "aviso"],
                    },
                    aviso: { type: ["string", "null"] },
                  },
                  required: [
                    "id",
                    "title",
                    "start",
                    "end",
                    "materia_id",
                    "tipo",
                    "aviso",
                  ],
                },
              },
            },
            required: [
              "resumen",
              "conflicto_rotativo",
              "pide_constancia_laboral",
              "avisos",
              "eventos",
            ],
          },
        },
      ],
      tool_choice: { type: "tool", name: "armar_calendario_semanal" },
      messages: [
        {
          role: "user",
          content: `${perfilParaPrompt(perfil)}

Semana a planificar (lunes a domingo, no salgas de este rango):
- inicio: ${formatISO(inicioSemana)}
- fin (exclusivo): ${formatISO(finSemana)}

Materias priorizadas (ya ordenadas, no reordenar):
${JSON.stringify(
  prioridades.map((item, index) => ({
    orden: index + 1,
    id: item.materia.id,
    nombre: item.materia.nombre,
    puntaje: item.puntaje,
    desbloqueaDirectas: item.desbloqueaDirectas,
    dia_semana: item.materia.dia_semana ?? null,
    horario: item.materia.horario ?? null,
    comision: item.materia.comision ?? null,
  })),
)}`,
        },
      ],
    });

    const herramienta = respuesta.content.find((bloque) => bloque.type === "tool_use");
    if (!herramienta || herramienta.type !== "tool_use") {
      return { ok: true, data: fallback };
    }

    const input = herramienta.input as {
      resumen?: string;
      conflicto_rotativo?: boolean;
      pide_constancia_laboral?: boolean;
      avisos?: unknown;
      eventos?: unknown;
    };

    const avisosModelo = uniqueAvisos([
      ...(Array.isArray(input.avisos)
        ? input.avisos.filter((item): item is string => typeof item === "string")
        : []),
      ...(input.conflicto_rotativo
        ? [
            "Revisá disponibilidad con el profesor: el horario rotativo puede chocar con la cursada.",
          ]
        : []),
      ...(input.pide_constancia_laboral
        ? ["Puede que necesites presentar constancia laboral."]
        : []),
    ]);

    const generado: CalendarioGenerado = {
      resumen:
        typeof input.resumen === "string" && input.resumen.trim().length > 0
          ? input.resumen.trim()
          : fallback.resumen,
      eventos: parseEventos(input.eventos, inicioSemana, finSemana),
      avisos: avisosModelo,
    };

    const supabase = createSupabaseServerClient();
    await supabase.from("calendario").upsert(
      {
        user_id: userId,
        semana,
        eventos: {
          resumen: generado.resumen,
          avisos: generado.avisos,
          items: generado.eventos,
        } as unknown as Json,
      },
      { onConflict: "user_id,semana" },
    );

    return { ok: true, data: generado };
  } catch {
    return { ok: true, data: fallback };
  }
}
