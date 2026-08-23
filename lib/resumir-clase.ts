import Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient, MODELO_CLAUDE } from "@/lib/anthropic";
import { bloquesDeArchivo, esArchivoLlm, type ArchivoLlm } from "@/lib/archivos-llm";
import { MAX_ARCHIVOS_MATERIA, MAX_BYTES_ARCHIVO, MAX_BYTES_TOTAL } from "@/lib/documentos";
import { SYSTEM_RESUMIR_CLASE } from "@/lib/prompts";

export type ResumenClase = {
  resumen: string;
  conceptos_clave: string[];
  repasar_manana: string[];
};

function armarMarkdown(data: ResumenClase): string {
  const conceptos =
    data.conceptos_clave.length > 0
      ? `\n\nConceptos clave:\n${data.conceptos_clave.map((item) => `- ${item}`).join("\n")}`
      : "";
  const repaso =
    data.repasar_manana.length > 0
      ? `\n\nPara repasar mañana:\n${data.repasar_manana.map((item) => `- ${item}`).join("\n")}`
      : "";
  return `${data.resumen.trim()}${conceptos}${repaso}`.trim();
}

export async function resumirClaseConClaude(input: {
  materiaNombre: string;
  notas: string;
  archivos: ArchivoLlm[];
}): Promise<{ ok: true; data: string } | { ok: false; error: string }> {
  if (!input.notas.trim() && input.archivos.length === 0) {
    return {
      ok: false,
      error: "Subí un PDF o pegá las notas de la clase para generar el resumen.",
    };
  }
  if (input.archivos.length > MAX_ARCHIVOS_MATERIA) {
    return { ok: false, error: `Podés subir hasta ${MAX_ARCHIVOS_MATERIA} archivos por sesión.` };
  }
  const total = input.archivos.reduce((suma, file) => suma + file.size, 0);
  if (input.archivos.some((file) => file.size > MAX_BYTES_ARCHIVO)) {
    return { ok: false, error: "Algún archivo pesa más de 32 MB. Subí una versión más liviana." };
  }
  if (total > MAX_BYTES_TOTAL) {
    return {
      ok: false,
      error: "El conjunto de archivos pesa demasiado. Subí menos archivos o versiones más livianas.",
    };
  }
  if (input.archivos.some((file) => !esArchivoLlm(file))) {
    return { ok: false, error: "Usá PDF, JPG, PNG, WEBP o TXT." };
  }

  try {
    const contenido: Anthropic.ContentBlockParam[] = input.archivos.flatMap((file) =>
      bloquesDeArchivo({
        ...file,
        etiqueta: `Material de clase "${file.name}".`,
      }),
    );
    if (input.notas.trim()) {
      contenido.push({
        type: "text",
        text: `Notas del estudiante:\n${input.notas.trim().slice(0, 20000)}`,
      });
    }
    contenido.push({
      type: "text",
      text: `Materia: ${input.materiaNombre}. Resumí esta clase para repasar mañana.`,
    });

    const anthropic = createAnthropicClient();
    const respuesta = await anthropic.messages.create({
      model: MODELO_CLAUDE,
      max_tokens: 2500,
      system: SYSTEM_RESUMIR_CLASE,
      tools: [
        {
          name: "resumir_clase",
          description: "Resumen de una clase universitaria, conceptos clave y tareas de repaso.",
          input_schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              resumen: { type: "string" },
              conceptos_clave: { type: "array", items: { type: "string" } },
              repasar_manana: { type: "array", items: { type: "string" } },
            },
            required: ["resumen", "conceptos_clave", "repasar_manana"],
          },
        },
      ],
      tool_choice: { type: "tool", name: "resumir_clase" },
      messages: [{ role: "user", content: contenido }],
    });

    const herramienta = respuesta.content.find((bloque) => bloque.type === "tool_use");
    if (!herramienta || herramienta.type !== "tool_use") {
      return { ok: false, error: "No pude armar el resumen. Probá con otro PDF o más notas." };
    }

    const raw = herramienta.input as {
      resumen?: unknown;
      conceptos_clave?: unknown;
      repasar_manana?: unknown;
    };
    const resumen =
      typeof raw.resumen === "string" && raw.resumen.trim().length > 0
        ? raw.resumen.trim()
        : null;
    if (!resumen) {
      return { ok: false, error: "El resumen salió vacío. Probá de nuevo con el material." };
    }

    return {
      ok: true,
      data: armarMarkdown({
        resumen,
        conceptos_clave: Array.isArray(raw.conceptos_clave)
          ? raw.conceptos_clave.filter((item): item is string => typeof item === "string")
          : [],
        repasar_manana: Array.isArray(raw.repasar_manana)
          ? raw.repasar_manana.filter((item): item is string => typeof item === "string")
          : [],
      }),
    };
  } catch (error) {
    const texto = error instanceof Error ? error.message : "";
    if (texto === "FORMATO_INVALIDO") {
      return { ok: false, error: "Subí un PDF, una imagen JPG/PNG/WEBP o un TXT." };
    }
    if (texto.toLowerCase().includes("api key") || texto.includes("ANTHROPIC")) {
      return { ok: false, error: "Falta configurar ANTHROPIC_API_KEY en .env.local." };
    }
    return {
      ok: false,
      error: "Claude no pudo leer el material ahora. Probá de nuevo en unos segundos.",
    };
  }
}
