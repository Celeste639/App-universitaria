import Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient, MODELO_CLAUDE } from "@/lib/anthropic";
import {
  bloquesDeArchivo,
  esPdf,
  esTextoPlano,
  tipoImagen,
} from "@/lib/archivos-llm";
import {
  alinearCorrelativas,
  normalizarClave,
  podarRequisitosMasivos,
  resolverMateriaId,
} from "@/lib/correlativas";
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
                "IDs que esta materia ABRE después, SOLO si el documento lo lista explícitamente. Lista corta. Si ya llenaste requiere, o si no está escrito, dejá []. NUNCA pongas el resto de la carrera.",
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

export type ArchivoPlan = {
  name: string;
  type: string;
  size: number;
  bytes: Buffer;
  tipo?: TipoDocumentoPlan;
  relativePath?: string;
};

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

  const materiasUnicas = deduplicarMaterias(materias);

  const correlativasCrudas: Correlativa[] = [];
  const maxHabilita = Math.max(8, Math.floor(materiasUnicas.length * 0.3));

  if (Array.isArray(data.correlativas)) {
    for (const item of data.correlativas) {
      if (!item || typeof item !== "object") continue;
      const fila = item as Record<string, unknown>;
      const materiaId = limpiarTexto(fila.materia_id);
      if (!materiaId) continue;

      const requiere = Array.isArray(fila.requiere)
        ? fila.requiere.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        : [];
      const habilita = Array.isArray(fila.habilita)
        ? fila.habilita.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
        : [];

      if (requiere.length > 0) {
        correlativasCrudas.push({ materia_id: materiaId, requiere });
      }
      // Una lista enorme en habilita suele ser "el resto de la carrera", no correlativas reales.
      if (habilita.length > 0 && habilita.length <= maxHabilita) {
        for (const destino of habilita) {
          correlativasCrudas.push({
            materia_id: destino,
            requiere: [materiaId],
          });
        }
      }
    }
  }

  const correlativas = podarRequisitosMasivos(
    alinearCorrelativas(materiasUnicas, correlativasCrudas),
    materiasUnicas.length,
  );

  if (Array.isArray(data.cronograma)) {
    for (const item of data.cronograma) {
      if (!item || typeof item !== "object") continue;
      const fila = item as Record<string, unknown>;
      const materiaId = limpiarTexto(fila.materia_id);
      if (!materiaId) continue;
      const resuelto = resolverMateriaId(materiaId, materiasUnicas);
      const materia = resuelto
        ? materiasUnicas.find((item) => item.id === resuelto)
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

  return { materias: materiasUnicas, correlativas };
}

function deduplicarMaterias(materias: Materia[]): Materia[] {
  const vistas = new Set<string>();
  const unicas: Materia[] = [];

  for (const materia of materias) {
    const porNombre = `n:${normalizarClave(materia.nombre)}`;
    const porCodigo = materia.codigo
      ? `c:${normalizarClave(materia.codigo)}`
      : null;
    if (vistas.has(porNombre)) continue;
    if (porCodigo && vistas.has(porCodigo)) continue;
    vistas.add(porNombre);
    if (porCodigo) vistas.add(porCodigo);
    unicas.push(materia);
  }

  return unicas;
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
      bloquesDeArchivo({
        ...file,
        etiqueta: `Archivo "${file.relativePath ?? file.name}" (tipo: ${file.tipo ?? "plan"}).`,
      }),
    );
    contenido.push({
      type: "text",
      text: `Extraé el plan de estudios universitario combinando TODOS los archivos.
Tipos posibles: plan (materias), correlativas (requisitos), cronograma (qué se dicta cada semana/día).
El plan de estudios es suficiente para avanzar: si no hay correlativas, devolvé correlativas=[] (requiere y habilita vacíos).
Si no hay cronograma, devolvé cronograma=[] y no inventes horarios.

IDs: usá el código oficial (ej. MAT101, 1023) como id en TODAS las listas, el mismo string. Si no hay código, usá un slug del NOMBRE COMPLETO (no una palabra suelta).
Prohibido usar como id tokens genéricos: "Informática", "Taller", "Análisis", "I", "II", "General".

CORRELATIVAS — leé la tabla tal cual, no inventes cadenas:
- En planes argentinos, "para cursar" / "para rendir" / "correlativas" de UNA FILA son REQUISITOS de esa materia (van en requiere). No son materias que la fila habilita.
- requiere = materias que hay que tener (regular o aprobada) ANTES de cursar materia_id.
  Ejemplo: "Análisis II tiene correlativa Análisis I" → { materia_id: "AN2", requiere: ["AN1"], habilita: [] }
- habilita = materias que ESTA materia abre DESPUÉS, SOLO si el documento lo dice con esas palabras. Lista corta. Si no está escrito, habilita=[].
  Ejemplo: "Álgebra I habilita Álgebra II" → { materia_id: "AL1", requiere: [], habilita: ["AL2"] }
- Si una materia de 1.º año no tiene correlativas en la tabla: requiere=[] y habilita=[]. NO asumas que habilita el resto de la carrera.
- NUNCA copies en habilita "todas las materias posteriores" ni más de un puñado explícito.
- No pongas lo mismo en requiere y habilita. Preferí requiere.
- Usá código oficial, el número de materia de la tabla, o el nombre COMPLETO. No uses una palabra suelta ("Informática") si el nombre es más largo.
- Si las correlativas son números de fila (4, 6, 10), mapéalos a la materia con ese N.º. No inventes aristas extra.
- El ranking calcula la cadena transitiva solo. No rellenes habilita para "adelantar" ese cálculo.

Unificá materias repetidas. Completá correlativas y días/horarios cuando esos documentos existan.
Marcá legible=false solo si no se puede leer el plan principal.`,
    });

    const anthropic = createAnthropicClient();
    const respuesta = await anthropic.messages.create({
      model: MODELO_CLAUDE,
      max_tokens: 16000,
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
