"use server";

import { extraerHistorialConClaude } from "@/lib/parse-historial";
import { cargarPlanYAvance } from "@/lib/datos";
import { MAX_ARCHIVOS_PLAN } from "@/lib/documentos";
import { getAuthUser } from "@/lib/auth";
import type { AvanceMateria, ResultadoAccion } from "@/lib/types";

export async function prellenarHistorialDesdeArchivo(
  formData: FormData,
): Promise<ResultadoAccion<AvanceMateria[]>> {
  const user = await getAuthUser();
  if (!user) {
    return { ok: false, error: "Tenés que iniciar sesión para leer el historial." };
  }

  const { plan } = await cargarPlanYAvance(user.id);
  if (!plan) {
    return { ok: false, error: "Cargá tu plan de estudios antes de importar el historial." };
  }

  const archivos = formData
    .getAll("archivos")
    .filter((item): item is File => item instanceof File && item.size > 0);
  if (archivos.length === 0) {
    return { ok: false, error: "Subí el PDF o una foto de tu historial académico." };
  }
  if (archivos.length > MAX_ARCHIVOS_PLAN) {
    return { ok: false, error: `Podés subir hasta ${MAX_ARCHIVOS_PLAN} archivos.` };
  }

  const payload = await Promise.all(
    archivos.map(async (archivo) => ({
      name: archivo.name,
      type: archivo.type,
      size: archivo.size,
      bytes: Buffer.from(await archivo.arrayBuffer()),
    })),
  );

  return extraerHistorialConClaude({ archivos: payload, materias: plan.materias });
}
