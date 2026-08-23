import type Anthropic from "@anthropic-ai/sdk";
import { createAnthropicClient, MODELO_CLAUDE } from "@/lib/anthropic";
import { bloquesDeArchivo, esArchivoLlm, esTextoPlano, type ArchivoLlm } from "@/lib/archivos-llm";
import { MAX_ARCHIVOS_MATERIA, MAX_BYTES_ARCHIVO, MAX_BYTES_TOTAL } from "@/lib/documentos";
import { systemResumirClase } from "@/lib/prompts";
import type { FormatoSesion, NivelDetalle } from "@/lib/types";

const LIMITE_CHUNK = 9000;

export const LIMITE_RESUMEN_CHARS = {
  rapido: 1400,
  completo: 4800,
} as const;

export const LIMITE_RESUMEN_TOKENS = {
  rapido: 400,
  completo: 900,
} as const;

export function limiteResumenChars(detalle: NivelDetalle): number {
  return LIMITE_RESUMEN_CHARS[detalle];
}

export function cortarResumenLimpio(texto: string, maxChars: number): string {
  const limpio = texto.trim();
  if (limpio.length <= maxChars) return limpio;

  const corte = limpio.slice(0, maxChars);
  const ultimoNl = Math.max(corte.lastIndexOf("\n"), corte.lastIndexOf("\r"));
  if (ultimoNl >= Math.floor(maxChars * 0.5)) {
    return corte.slice(0, ultimoNl).trim();
  }

  const ultimoPunto = Math.max(
    corte.lastIndexOf(". "),
    corte.lastIndexOf(".\n"),
    corte.lastIndexOf("! "),
    corte.lastIndexOf("? "),
  );
  if (ultimoPunto >= Math.floor(maxChars * 0.5)) {
    return corte.slice(0, ultimoPunto + 1).trim();
  }

  return corte.trim();
}

export type OpcionesResumen = {
  materiaNombre: string;
  notas: string;
  archivos: ArchivoLlm[];
  formato?: FormatoSesion;
  detalle?: NivelDetalle;
};

function validarInput(input: OpcionesResumen): string | null {
  if (!input.notas.trim() && input.archivos.length === 0) {
    return "Subí un PDF o pegá las notas de la clase para generar el resumen.";
  }
  if (input.archivos.length > MAX_ARCHIVOS_MATERIA) {
    return `Podés subir hasta ${MAX_ARCHIVOS_MATERIA} archivos por sesión.`;
  }
  const total = input.archivos.reduce((suma, file) => suma + file.size, 0);
  if (input.archivos.some((file) => file.size > MAX_BYTES_ARCHIVO)) {
    return "Algún archivo pesa más de 32 MB. Subí una versión más liviana.";
  }
  if (total > MAX_BYTES_TOTAL) {
    return "El conjunto de archivos pesa demasiado. Subí menos archivos o versiones más livianas.";
  }
  if (input.archivos.some((file) => !esArchivoLlm(file))) {
    return "Usá PDF, JPG, PNG, WEBP o TXT.";
  }
  return null;
}

function partirTexto(texto: string): string[] {
  const limpio = texto.trim();
  if (limpio.length <= LIMITE_CHUNK) return limpio ? [limpio] : [];
  const partes: string[] = [];
  let resto = limpio;
  while (resto.length > 0) {
    if (resto.length <= LIMITE_CHUNK) {
      partes.push(resto);
      break;
    }
    const corte = resto.lastIndexOf("\n\n", LIMITE_CHUNK);
    const indice = corte > LIMITE_CHUNK / 2 ? corte : LIMITE_CHUNK;
    partes.push(resto.slice(0, indice).trim());
    resto = resto.slice(indice).trim();
  }
  return partes.filter((parte) => parte.length > 0);
}

type Pedazo = { etiqueta: string; contenido: Anthropic.ContentBlockParam[] };

function armarPedazos(input: OpcionesResumen): Pedazo[] {
  const notasChunks = partirTexto(input.notas);
  const textos = input.archivos.filter((file) => esTextoPlano(file));
  const binarios = input.archivos.filter((file) => !esTextoPlano(file));
  const pedazos: Pedazo[] = [];

  for (let index = 0; index < notasChunks.length; index += 1) {
    const nota = notasChunks[index];
    pedazos.push({
      etiqueta: notasChunks.length > 1 ? `Notas ${index + 1}/${notasChunks.length}` : "Notas",
      contenido: [{ type: "text", text: `Notas del estudiante:\n${nota}` }],
    });
  }

  for (const file of textos) {
    const texto = file.bytes.toString("utf8");
    const partes = partirTexto(texto);
    partes.forEach((parte, index) => {
      pedazos.push({
        etiqueta:
          partes.length > 1 ? `${file.name} (${index + 1}/${partes.length})` : file.name,
        contenido: [{ type: "text", text: `Archivo "${file.name}":\n${parte}` }],
      });
    });
  }

  if (binarios.length === 1 && pedazos.length === 0) {
    pedazos.push({
      etiqueta: binarios[0].name,
      contenido: bloquesDeArchivo({
        ...binarios[0],
        etiqueta: `Material de clase "${binarios[0].name}".`,
      }),
    });
  } else {
    for (const file of binarios) {
      pedazos.push({
        etiqueta: file.name,
        contenido: bloquesDeArchivo({
          ...file,
          etiqueta: `Material de clase "${file.name}".`,
        }),
      });
    }
  }

  if (pedazos.length === 0) {
    pedazos.push({
      etiqueta: "Material",
      contenido: [{ type: "text", text: "No hay texto extraíble." }],
    });
  }

  return pedazos;
}

export async function streamResumenClase(
  input: OpcionesResumen,
  onEvento: (evento: { tipo: "delta" | "parcial" | "error"; texto: string }) => void,
): Promise<{ ok: true; data: string } | { ok: false; error: string }> {
  const invalido = validarInput(input);
  if (invalido) return { ok: false, error: invalido };

  const formato = input.formato ?? "bullets";
  const detalle = input.detalle ?? "rapido";
  const maxChars = limiteResumenChars(detalle);
  const maxTokens = LIMITE_RESUMEN_TOKENS[detalle];
  const pedazos = armarPedazos(input);
  const anthropic = createAnthropicClient();
  const partes: string[] = [];
  let emitidos = 0;

  try {
    for (let index = 0; index < pedazos.length; index += 1) {
      if (emitidos >= maxChars) break;

      const pedazo = pedazos[index];
      const extra =
        pedazos.length > 1
          ? `Este es el fragmento ${index + 1} de ${pedazos.length} (${pedazo.etiqueta}). Escribí como máximo 2 viñetas de lo central de ESTE fragmento. No armes el resumen final ni una intro.`
          : `Materia: ${input.materiaNombre}. Resumí esta clase para repasar mañana. Respetá el tope de longitud.`;

      const stream = anthropic.messages.stream({
        model: MODELO_CLAUDE,
        max_tokens: pedazos.length > 1 ? Math.min(220, maxTokens) : maxTokens,
        system: systemResumirClase(formato, detalle),
        messages: [
          {
            role: "user",
            content: [
              ...pedazo.contenido,
              { type: "text", text: extra },
            ],
          },
        ],
      });

      let acumulado = "";
      try {
        for await (const evento of stream) {
          if (
            evento.type === "content_block_delta" &&
            evento.delta.type === "text_delta"
          ) {
            const resto = maxChars - emitidos - acumulado.length;
            if (resto <= 0) {
              try {
                stream.abort();
              } catch {
                /* el corte ya alcanzó */
              }
              break;
            }
            const delta =
              evento.delta.text.length > resto
                ? evento.delta.text.slice(0, resto)
                : evento.delta.text;
            acumulado += delta;
            onEvento({ tipo: "delta", texto: delta });
            if (evento.delta.text.length > resto) {
              try {
                stream.abort();
              } catch {
                /* el corte ya alcanzó */
              }
              break;
            }
          }
        }
      } catch {
        /* abortar el stream puede rechazar el iterador */
      }

      const texto = acumulado.trim();
      if (texto) {
        const bloque =
          pedazos.length > 1 ? `### ${pedazo.etiqueta}\n${texto}` : texto;
        partes.push(bloque);
        emitidos += bloque.length + 2;
        if (pedazos.length > 1 && emitidos < maxChars) {
          onEvento({ tipo: "parcial", texto: `\n\n--- fin ${pedazo.etiqueta} ---\n\n` });
        }
      }
    }

    let final = partes.join("\n\n").trim();
    if (!final) {
      return { ok: false, error: "El resumen salió vacío. Probá de nuevo con el material." };
    }

    if (partes.length > 1) {
      const unificado = await unificarResumen(anthropic, {
        materiaNombre: input.materiaNombre,
        formato,
        detalle,
        parciales: final,
      });
      if (unificado) {
        final = unificado;
      }
    }

    return { ok: true, data: cortarResumenLimpio(final, maxChars) };
  } catch (error) {
    const texto = error instanceof Error ? error.message : "";
    if (texto === "FORMATO_INVALIDO") {
      return { ok: false, error: "Subí un PDF, una imagen JPG/PNG/WEBP o un TXT." };
    }
    if (texto.toLowerCase().includes("api key") || texto.includes("ANTHROPIC")) {
      return { ok: false, error: "El resumen no está disponible ahora. Avisá a quien administra la app." };
    }
    return {
      ok: false,
      error: "Claude no pudo leer el material ahora. Probá de nuevo en unos segundos.",
    };
  }
}

async function unificarResumen(
  anthropic: ReturnType<typeof createAnthropicClient>,
  input: {
    materiaNombre: string;
    formato: FormatoSesion;
    detalle: NivelDetalle;
    parciales: string;
  },
): Promise<string | null> {
  try {
    const respuesta = await anthropic.messages.create({
      model: MODELO_CLAUDE,
      max_tokens: LIMITE_RESUMEN_TOKENS[input.detalle],
      system: systemResumirClase(input.formato, input.detalle),
      messages: [
        {
          role: "user",
          content: `Materia: ${input.materiaNombre}. Unificá estos apuntes parciales en UN solo resumen corto. No concatenes: reescribí y quedate con lo central.\n\n${input.parciales}`,
        },
      ],
    });
    const texto = respuesta.content
      .filter((bloque): bloque is Anthropic.TextBlock => bloque.type === "text")
      .map((bloque) => bloque.text)
      .join("\n")
      .trim();
    return texto || null;
  } catch {
    return null;
  }
}

export async function resumirClaseConClaude(
  input: OpcionesResumen,
): Promise<{ ok: true; data: string } | { ok: false; error: string }> {
  return streamResumenClase(input, () => undefined);
}
