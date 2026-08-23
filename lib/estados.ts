import type { EstadoMateria } from "@/lib/types";

export const ESTADOS_MATERIA: EstadoMateria[] = [
  "pendiente",
  "cursando",
  "aprobada",
  "libre",
  "recursando",
];

export const ETIQUETAS_ESTADO: Record<EstadoMateria, string> = {
  pendiente: "Pendiente",
  cursando: "Cursando",
  aprobada: "Aprobada",
  libre: "Libre",
  recursando: "Recursando",
};

export function esEstadoMateria(valor: string): valor is EstadoMateria {
  return ESTADOS_MATERIA.includes(valor as EstadoMateria);
}

export function materiaAprobada(estado: EstadoMateria | undefined): boolean {
  return estado === "aprobada";
}

export function parseNota(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const n = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 10) return null;
  return Math.round(n * 100) / 100;
}

export function parseFecha(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const recortado = valor.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(recortado)) return null;
  return recortado;
}
