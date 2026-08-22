import type { TipoDocumentoPlan } from "@/lib/types";

export const MAX_ARCHIVOS_PLAN = 8;
export const MAX_BYTES_ARCHIVO = 10 * 1024 * 1024;
export const MAX_BYTES_TOTAL = 28 * 1024 * 1024;

const EXTENSION_OK = /\.(pdf|png|jpe?g|webp|txt|csv)$/i;

const MIME_OK = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "text/plain",
  "text/csv",
]);

export function esArchivoDePlan(file: File): boolean {
  if (file.name.startsWith(".") || file.name === "Thumbs.db" || file.name === "desktop.ini") {
    return false;
  }
  return MIME_OK.has(file.type) || EXTENSION_OK.test(file.name);
}

export function inferirTipoDocumento(nombre: string): TipoDocumentoPlan {
  const n = nombre.toLowerCase();
  if (/correlat/.test(n)) return "correlativas";
  if (/cronogram|horario|dictad|semana|comisi[oó]n|oferta/.test(n)) {
    return "cronograma";
  }
  return "plan";
}

export function etiquetaTipoDocumento(tipo: TipoDocumentoPlan): string {
  if (tipo === "correlativas") return "Correlativas";
  if (tipo === "cronograma") return "Cronograma";
  return "Plan de estudios";
}
