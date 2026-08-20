"use server";

import type { ResultadoAccion } from "@/lib/types";

export async function resumirContenidoClase(
  formData: FormData,
): Promise<ResultadoAccion<{ resumen: string }>> {
  void formData;
  return {
    ok: false,
    error: "Todavía no está conectado el resumen de clases con Claude.",
  };
}
