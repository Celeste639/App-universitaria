"use server";

import type { EventoCalendario, ResultadoAccion } from "@/lib/types";

export async function generarCalendarioSemanal(
  formData: FormData,
): Promise<
  ResultadoAccion<{ eventos: EventoCalendario[]; avisos: string[] }>
> {
  void formData;
  return {
    ok: false,
    error: "Todavía no está conectada la generación del calendario con IA.",
  };
}
