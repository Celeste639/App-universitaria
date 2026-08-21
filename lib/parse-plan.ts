import Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient, MODELO_CLAUDE } from "@/lib/anthropic";
import type { Correlativa, Materia, PlanEstudioParseado } from "@/lib/types";

const MAX_BYTES = 10 * 1024 * 1024;

const HERRAMIENTA_PLAN = {
  name: "extraer_plan_estudio",
  description:
    "Devuelve las materias y correlativas extraídas de un plan de estudios universitario.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      legible: {
        type: "boolean",
        description: "false si el archivo no se puede leer o no es un plan de estudios",
      },
      motivo_error: {
        type: ["string", "null"],
        description: "Explicación breve si legible es false",
      },
      materias: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            id: {
              type: "string",
              description: "Identificador estable: código de materia o slug corto",
            },
            nombre: { type: "string" },
            codigo: { type: ["string", "null"] },
            anio: { type: ["integer", "null"] },
            cuatrimestre: { type: ["integer", "null"] },
            carga_horaria: { type: ["integer", "null"] },
          },
          required: ["id", "nombre", "codigo", "anio", "cuatrimestre", "carga_horaria"],
        },
      },
      correlativas: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            materia_id: { type: "string" },
            requiere: {
              type: "array",
              items: { type: "string" },
              description: "IDs de materias que hay que aprobar antes",
            },
          },
          required: ["materia_id", "requiere"],
        },
      },
    },
    required: ["legible", "motivo_error", "materias", "correlativas"],
  },
} satisfies Anthropic.Tool;

type ImagenSoportada = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

type ArchivoPlan = {
  name: string;
  type: string;
  size: number;
  bytes: Buffer;
};

function tipoImagen(file: Pick<ArchivoPlan, "name" | "type">): ImagenSoportada | null {
  if (
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/gif" ||
    file.type === "image/webp"
  ) {
    return file.type;
  }
  const nombre = file.name.toLowerCase();
  if (nombre.endsWith(".jpg") || nombre.endsWith(".jpeg")) return "image/jpeg";
  if (nombre.endsWith(".png")) return "image/png";
  if (nombre.endsWith(".gif")) return "image/gif";
  if (nombre.endsWith(".webp")) return "image/webp";
  return null;
}

function esPdf(file: Pick<ArchivoPlan, "name" | "type">): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function bloqueDeArchivo(
  file: Pick<ArchivoPlan, "name" | "type">,
  base64: string,
): Anthropic.ContentBlockParam {
  if (esPdf(file)) {
    return {
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: base64,
      },
    };
  }

  const mediaType = tipoImagen(file);
  if (!mediaType) {
    throw new Error("FORMATO_INVALIDO");
  }

  return {
    type: "image",
    source: {
      type: "base64",
      media_type: mediaType,
      data: base64,
    },
  };
}

function limpiarTexto(valor: unknown): string | undefined {
  if (typeof valor !== "string") return undefined;
  const recortado = valor.trim();
  return recortado.length > 0 ? recortado : undefined;
}

function limpiarEntero(valor: unknown): number | undefined {
  return typeof valor === "number" && Number.isFinite(valor) ? valor : undefined;
}

function normalizarPlan(input: unknown): PlanEstudioParseado | { error: string } {
  if (!input || typeof input !== "object") {
    return { error: "Claude no devolvió un plan estructurado." };
  }

  const data = input as Record<string, unknown>;
  if (data.legible === false) {
    return {
      error:
        limpiarTexto(data.motivo_error) ??
        "No pude leer el plan de estudios. Probá un PDF o imagen más nítida.",
    };
  }

  if (!Array.isArray(data.materias) || data.materias.length === 0) {
    return {
      error:
        "No encontré materias en el archivo. Fijate que se vean los nombres y las correlativas.",
    };
  }

  const materias: Materia[] = data.materias.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const fila = item as Record<string, unknown>;
    const id = limpiarTexto(fila.id);
    const nombre = limpiarTexto(fila.nombre);
    if (!id || !nombre) return [];
    return [
      {
        id,
        nombre,
        codigo: limpiarTexto(fila.codigo),
        anio: limpiarEntero(fila.anio),
        cuatrimestre: limpiarEntero(fila.cuatrimestre),
        carga_horaria: limpiarEntero(fila.carga_horaria),
      },
    ];
  });

  if (materias.length === 0) {
    return { error: "El plan no trajo materias válidas. Probá con otro archivo." };
  }

  const ids = new Set(materias.map((materia) => materia.id));
  const correlativas: Correlativa[] = Array.isArray(data.correlativas)
    ? data.correlativas.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const fila = item as Record<string, unknown>;
        const materiaId = limpiarTexto(fila.materia_id);
        if (!materiaId || !ids.has(materiaId) || !Array.isArray(fila.requiere)) {
          return [];
        }
        return [
          {
            materia_id: materiaId,
            requiere: fila.requiere.filter(
              (id): id is string => typeof id === "string" && ids.has(id),
            ),
          },
        ];
      })
    : [];

  return { materias, correlativas };
}

export async function extraerPlanConClaude(
  file: ArchivoPlan,
): Promise<{ ok: true; data: PlanEstudioParseado } | { ok: false; error: string }> {
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "El archivo pesa más de 10 MB. Subí una versión más liviana." };
  }

  if (!esPdf(file) && !tipoImagen(file)) {
    return {
      ok: false,
      error: "Subí un PDF o una imagen JPG, PNG o WEBP. HEIC no está soportado todavía.",
    };
  }

  const base64 = file.bytes.toString("base64");

  try {
    const anthropic = createAnthropicClient();
    const respuesta = await anthropic.messages.create({
      model: MODELO_CLAUDE,
      max_tokens: 8000,
      tools: [HERRAMIENTA_PLAN],
      tool_choice: { type: "tool", name: "extraer_plan_estudio" },
      messages: [
        {
          role: "user",
          content: [
            bloqueDeArchivo(file, base64),
            {
              type: "text",
              text: `Extraé el plan de estudios universitario de este archivo.
Devolvé todas las materias visibles y las correlativas (qué materias hay que aprobar antes).
Usá IDs estables: el código oficial si existe, si no un slug corto en mayúsculas.
Si el archivo está borroso, cortado o no es un plan de estudios, marcá legible=false.`,
            },
          ],
        },
      ],
    });

    const herramienta = respuesta.content.find((bloque) => bloque.type === "tool_use");
    if (!herramienta || herramienta.type !== "tool_use") {
      return {
        ok: false,
        error: "No pude interpretar el plan. Probá un PDF más nítido o una foto con mejor luz.",
      };
    }

    const normalizado = normalizarPlan(herramienta.input);
    if ("error" in normalizado) {
      return { ok: false, error: normalizado.error };
    }

    return { ok: true, data: normalizado };
  } catch (error) {
    const texto = error instanceof Error ? error.message : "";
    if (texto === "FORMATO_INVALIDO") {
      return {
        ok: false,
        error: "Subí un PDF o una imagen JPG, PNG o WEBP.",
      };
    }
    if (texto.toLowerCase().includes("api key") || texto.includes("ANTHROPIC")) {
      return { ok: false, error: "Falta configurar ANTHROPIC_API_KEY en .env.local." };
    }
    return {
      ok: false,
      error:
        "Claude no pudo leer el archivo ahora. Probá de nuevo o subí el plan como PDF.",
    };
  }
}
