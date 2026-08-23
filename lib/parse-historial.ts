import Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient, MODELO_CLAUDE } from "@/lib/anthropic";
import { bloquesDeArchivo, esArchivoLlm, type ArchivoLlm } from "@/lib/archivos-llm";
import { resolverMateriaId } from "@/lib/correlativas";
import { MAX_BYTES_ARCHIVO, MAX_BYTES_TOTAL } from "@/lib/documentos";
import { esEstadoMateria, parseFecha, parseNota } from "@/lib/estados";
import type { AvanceMateria, Materia } from "@/lib/types";

const HERRAMIENTA_HISTORIAL = {
  name: "extraer_historial_academico",
  description:
    "Estados, notas y fechas de materias leídos de un historial académico oficial.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      legible: { type: "boolean" },
      motivo_error: { type: ["string", "null"] },
      filas: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            nombre: { type: "string" },
            codigo: { type: ["string", "null"] },
            estado: {
              type: "string",
              enum: ["pendiente", "cursando", "aprobada", "libre", "recursando"],
            },
            nota: { type: ["number", "null"] },
            fecha: {
              type: ["string", "null"],
              description: "YYYY-MM-DD si se puede inferir",
            },
            comentario: { type: ["string", "null"] },
          },
          required: ["nombre", "codigo", "estado", "nota", "fecha", "comentario"],
        },
      },
    },
    required: ["legible", "motivo_error", "filas"],
  },
} satisfies Anthropic.Tool;

export async function extraerHistorialConClaude(input: {
  archivos: ArchivoLlm[];
  materias: Materia[];
}): Promise<{ ok: true; data: AvanceMateria[] } | { ok: false; error: string }> {
  if (input.archivos.length === 0) {
    return { ok: false, error: "Subí el PDF o una foto de tu historial académico." };
  }
  const total = input.archivos.reduce((suma, file) => suma + file.size, 0);
  if (input.archivos.some((file) => file.size > MAX_BYTES_ARCHIVO) || total > MAX_BYTES_TOTAL) {
    return { ok: false, error: "El archivo es demasiado pesado. Subí una versión más liviana." };
  }
  if (input.archivos.some((file) => !esArchivoLlm(file))) {
    return { ok: false, error: "Usá PDF, JPG, PNG, WEBP o TXT." };
  }

  try {
    const contenido: Anthropic.ContentBlockParam[] = input.archivos.flatMap((file) =>
      bloquesDeArchivo({
        ...file,
        etiqueta: `Historial académico "${file.name}".`,
      }),
    );
    contenido.push({
      type: "text",
      text: `Materias del plan del estudiante (usá estos nombres/códigos para matchear):\n${JSON.stringify(
        input.materias.map((materia) => ({
          id: materia.id,
          nombre: materia.nombre,
          codigo: materia.codigo ?? null,
        })),
      )}

Estados válidos: pendiente, cursando, aprobada, libre, recursando.
Si dice promocionada, aprobada o regularizada con final, usá aprobada.
Si dice recursa o desaprobada y la está rindiendo de nuevo, recursando.
Si figura como libre, libre.`,
    });

    const anthropic = createAnthropicClient();
    const respuesta = await anthropic.messages.create({
      model: MODELO_CLAUDE,
      max_tokens: 6000,
      tools: [HERRAMIENTA_HISTORIAL],
      tool_choice: { type: "tool", name: "extraer_historial_academico" },
      messages: [{ role: "user", content: contenido }],
    });

    const herramienta = respuesta.content.find((bloque) => bloque.type === "tool_use");
    if (!herramienta || herramienta.type !== "tool_use") {
      return { ok: false, error: "No pude leer el historial. Probá un PDF más nítido." };
    }

    const raw = herramienta.input as {
      legible?: unknown;
      motivo_error?: unknown;
      filas?: unknown;
    };
    if (raw.legible === false) {
      return {
        ok: false,
        error:
          typeof raw.motivo_error === "string" && raw.motivo_error.trim()
            ? raw.motivo_error
            : "No pude leer el historial. Probá otra foto o un PDF más claro.",
      };
    }
    if (!Array.isArray(raw.filas)) {
      return { ok: false, error: "El historial no trajo materias reconocibles." };
    }

    const porId = new Map<string, AvanceMateria>();
    for (const item of raw.filas) {
      if (!item || typeof item !== "object") continue;
      const fila = item as Record<string, unknown>;
      const referencia =
        (typeof fila.codigo === "string" && fila.codigo.trim()) ||
        (typeof fila.nombre === "string" ? fila.nombre : "");
      const materiaId = resolverMateriaId(referencia, input.materias);
      if (!materiaId) continue;
      const estado = typeof fila.estado === "string" && esEstadoMateria(fila.estado)
        ? fila.estado
        : "pendiente";
      porId.set(materiaId, {
        materia_id: materiaId,
        estado,
        nota: parseNota(fila.nota),
        fecha: parseFecha(fila.fecha),
        comentario: typeof fila.comentario === "string" ? fila.comentario : null,
      });
    }

    return { ok: true, data: Array.from(porId.values()) };
  } catch (error) {
    const texto = error instanceof Error ? error.message : "";
    if (texto.toLowerCase().includes("api key") || texto.includes("ANTHROPIC")) {
      return { ok: false, error: "No pude leer el historial ahora. Avisá a quien administra la app." };
    }
    return { ok: false, error: "No pude leer el historial ahora. Probá de nuevo." };
  }
}
