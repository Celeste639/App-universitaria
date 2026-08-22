import Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient, MODELO_CLAUDE } from "@/lib/anthropic";
import { alinearCorrelativas, resolverMateriaId } from "@/lib/correlativas";
import { MAX_BYTES_ARCHIVO, MAX_BYTES_TOTAL } from "@/lib/documentos";
import type { Correlativa, Materia, PlanEstudioParseado, TipoDocumentoPlan } from "@/lib/types";

const HERRAMIENTA_PLAN = {
  name: "extraer_plan_estudio",
  description:
    "Devuelve las materias, correlativas y cronograma extraídos de uno o más documentos universitarios.",
  input_schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      legible: {
        type: "boolean",
        description:
          "false solo si NO se puede leer el plan de estudios. Si faltan correlativas o cronograma pero el plan se entiende, legible=true.",
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
            dia_semana: { type: ["string", "null"] },
            horario: { type: ["string", "null"] },
            comision: { type: ["string", "null"] },
          },
          required: [
            "id",
            "nombre",
            "codigo",
            "anio",
            "cuatrimestre",
            "carga_horaria",
            "dia_semana",
            "horario",
            "comision",
          ],
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
              description:
                "IDs de materias que hay que APROBAR ANTES de cursar materia_id. Mismos IDs que en materias.",
            },
            habilita: {
              type: "array",
              items: { type: "string" },
              description:
                "IDs que esta materia ABRE después. Usalo solo si el documento dice 'habilita/abre/correlativa de'. Si ya llenaste requiere, dejá [].",
            },
          },
          required: ["materia_id", "requiere", "habilita"],
        },
      },
      cronograma: {
        type: "array",
        description:
          "Horarios de dictado si hay cronograma. Vacío si no hay ese archivo o no se ve.",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            materia_id: { type: "string" },
            dia_semana: { type: ["string", "null"] },
            hora_inicio: { type: ["string", "null"] },
            hora_fin: { type: ["string", "null"] },
            comision: { type: ["string", "null"] },
          },
          required: ["materia_id", "dia_semana", "hora_inicio", "hora_fin", "comision"],
        },
      },
    },
    required: ["legible", "motivo_error", "materias", "correlativas", "cronograma"],
  },
} satisfies Anthropic.Tool;

type ImagenSoportada = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export type ArchivoPlan = {
  name: string;
  type: string;
  size: number;
  bytes: Buffer;
  tipo?: TipoDocumentoPlan;
  relativePath?: string;
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

function esTextoPlano(file: Pick<ArchivoPlan, "name" | "type">): boolean {
  return (
    file.type === "text/plain" ||
    file.type === "text/csv" ||
    /\.(txt|csv)$/i.test(file.name)
  );
}

function bloquesDeArchivo(file: ArchivoPlan): Anthropic.ContentBlockParam[] {
  const etiqueta = `Archivo "${file.relativePath ?? file.name}" (tipo: ${file.tipo ?? "plan"}).`;

  if (esTextoPlano(file)) {
    return [
      {
        type: "text",
        text: `${etiqueta}\n${file.bytes.toString("utf8").slice(0, 20000)}`,
      },
    ];
  }

  if (esPdf(file)) {
    return [
      {
        type: "text",
        text: etiqueta,
      },
      {
        type: "document",
        source: {
          type: "base64",
          media_type: "application/pdf",
          data: file.bytes.toString("base64"),
        },
      },
    ];
  }

  const mediaType = tipoImagen(file);
  if (!mediaType) {
    throw new Error("FORMATO_INVALIDO");
  }

  return [
    {
      type: "text",
      text: etiqueta,
    },
    {
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType,
        data: file.bytes.toString("base64"),
      },
    },
  ];
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
        dia_semana: limpiarTexto(fila.dia_semana),
        horario: limpiarTexto(fila.horario),
        comision: limpiarTexto(fila.comision),
      },
    ];
  });

  if (materias.length === 0) {
    return { error: "El plan no trajo materias válidas. Probá con otro archivo." };
  }

  const correlativasCrudas: Correlativa[] = [];

  if (Array.isArray(data.correlativas)) {
    for (const item of data.correlativas) {
      if (!item || typeof item !== "object") continue;
      const fila = item as Record<string, unknown>;
      const materiaId = limpiarTexto(fila.materia_id);
      if (!materiaId) continue;

      const requiere = Array.isArray(fila.requiere)
        ? fila.requiere.filter((id): id is string => typeof id === "string")
        : [];
      const habilita = Array.isArray(fila.habilita)
        ? fila.habilita.filter((id): id is string => typeof id === "string")
        : [];

      if (requiere.length > 0) {
        correlativasCrudas.push({ materia_id: materiaId, requiere });
      }
      for (const destino of habilita) {
        correlativasCrudas.push({
          materia_id: destino,
          requiere: [materiaId],
        });
      }
    }
  }

  const correlativas = alinearCorrelativas(materias, correlativasCrudas);

  if (Array.isArray(data.cronograma)) {
    for (const item of data.cronograma) {
      if (!item || typeof item !== "object") continue;
      const fila = item as Record<string, unknown>;
      const materiaId = limpiarTexto(fila.materia_id);
      if (!materiaId) continue;
      const resuelto = resolverMateriaId(materiaId, materias);
      const materia = resuelto
        ? materias.find((item) => item.id === resuelto)
        : undefined;
      if (!materia) continue;
      materia.dia_semana = limpiarTexto(fila.dia_semana) ?? materia.dia_semana;
      const inicio = limpiarTexto(fila.hora_inicio);
      const fin = limpiarTexto(fila.hora_fin);
      if (inicio && fin) materia.horario = `${inicio}-${fin}`;
      else if (inicio) materia.horario = inicio;
      materia.comision = limpiarTexto(fila.comision) ?? materia.comision;
    }
  }

  return { materias, correlativas };
}

export async function extraerPlanConClaude(
  files: ArchivoPlan[],
): Promise<{ ok: true; data: PlanEstudioParseado } | { ok: false; error: string }> {
  if (files.length === 0) {
    return { ok: false, error: "Subí al menos el plan de estudios (PDF o imagen)." };
  }

  const total = files.reduce((suma, file) => suma + file.size, 0);
  if (files.some((file) => file.size > MAX_BYTES_ARCHIVO)) {
    return { ok: false, error: "Algún archivo pesa más de 32 MB. Subí una versión más liviana." };
  }
  if (total > MAX_BYTES_TOTAL) {
    return {
      ok: false,
      error: "El conjunto de archivos pesa demasiado. Subí menos archivos o versiones más livianas.",
    };
  }

  const invalidos = files.filter(
    (file) => !esPdf(file) && !tipoImagen(file) && !esTextoPlano(file),
  );
  if (invalidos.length > 0) {
    return {
      ok: false,
      error: "Usá PDF, JPG, PNG, WEBP o TXT. HEIC no está soportado todavía.",
    };
  }

  try {
    const contenido: Anthropic.ContentBlockParam[] = files.flatMap((file) =>
      bloquesDeArchivo(file),
    );
    contenido.push({
      type: "text",
      text: `Extraé el plan de estudios universitario combinando TODOS los archivos.
Tipos posibles: plan (materias), correlativas (requisitos), cronograma (qué se dicta cada semana/día).
El plan de estudios es suficiente para avanzar: si no hay correlativas, devolvé correlativas=[] (requiere y habilita vacíos).
Si no hay cronograma, devolvé cronograma=[] y no inventes horarios.

IDs: usá el código oficial (ej. MAT101) como id en TODAS las listas, el mismo string.

CORRELATIVAS — no inviertas el sentido:
- requiere = materias que hay que APROBAR ANTES de cursar materia_id.
  Ejemplo: "Análisis II tiene correlativa Análisis I" → { materia_id: "AN2", requiere: ["AN1"], habilita: [] }
- habilita = materias que ESTA materia abre DESPUÉS.
  Ejemplo: "Álgebra I habilita Álgebra II" → { materia_id: "AL1", requiere: [], habilita: ["AL2"] }
- No pongas lo mismo en requiere y habilita.
- El ranking de la app cuenta cuántas materias FUTURAS dependen de cada una: si invertís requiere/habilita, el análisis queda mal.

Unificá materias repetidas. Completá correlativas y días/horarios cuando esos documentos existan.
Marcá legible=false solo si no se puede leer el plan principal.`,
    });

    const anthropic = createAnthropicClient();
    const respuesta = await anthropic.messages.create({
      model: MODELO_CLAUDE,
      max_tokens: 8000,
      tools: [HERRAMIENTA_PLAN],
      tool_choice: { type: "tool", name: "extraer_plan_estudio" },
      messages: [{ role: "user", content: contenido }],
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
        error: "Subí un PDF, una imagen JPG/PNG/WEBP o un TXT.",
      };
    }
    if (texto.toLowerCase().includes("api key") || texto.includes("ANTHROPIC")) {
      return { ok: false, error: "Falta configurar ANTHROPIC_API_KEY en .env.local." };
    }
    return {
      ok: false,
      error:
        "Claude no pudo leer los archivos ahora. Probá de nuevo o subí el plan como PDF.",
    };
  }
}
