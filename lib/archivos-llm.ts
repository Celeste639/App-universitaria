import type Anthropic from "@anthropic-ai/sdk";

type ImagenSoportada = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

export type ArchivoLlm = {
  name: string;
  type: string;
  size: number;
  bytes: Buffer;
  etiqueta?: string;
};

export function tipoImagen(file: Pick<ArchivoLlm, "name" | "type">): ImagenSoportada | null {
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

export function esPdf(file: Pick<ArchivoLlm, "name" | "type">): boolean {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export function esTextoPlano(file: Pick<ArchivoLlm, "name" | "type">): boolean {
  return (
    file.type === "text/plain" ||
    file.type === "text/csv" ||
    /\.(txt|csv)$/i.test(file.name)
  );
}

export function esArchivoLlm(file: Pick<ArchivoLlm, "name" | "type">): boolean {
  return esPdf(file) || tipoImagen(file) !== null || esTextoPlano(file);
}

export function bloquesDeArchivo(file: ArchivoLlm): Anthropic.ContentBlockParam[] {
  const etiqueta = file.etiqueta ?? `Archivo "${file.name}".`;

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
      { type: "text", text: etiqueta },
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
    { type: "text", text: etiqueta },
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
