"use server";

import { resumirClaseConClaude } from "@/lib/resumir-clase";
import { cargarPlanYAvance } from "@/lib/datos";
import { MAX_ARCHIVOS_MATERIA, nombreArchivoSeguro } from "@/lib/documentos";
import { mensajeErrorSupabase } from "@/lib/errores-supabase";
import { revalidarRutasApp } from "@/lib/revalidar";
import { getAuthUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ResultadoAccion } from "@/lib/types";

export async function resumirContenidoClase(
  formData: FormData,
): Promise<ResultadoAccion<{ resumen: string }>> {
  const user = await getAuthUser();
  if (!user) {
    return { ok: false, error: "Tenés que iniciar sesión para guardar la sesión." };
  }

  const materiaId = String(formData.get("materia_id") ?? "").trim();
  const notas = String(formData.get("notas") ?? "");
  const archivos = formData
    .getAll("archivos")
    .filter((item): item is File => item instanceof File && item.size > 0);

  if (!materiaId) {
    return { ok: false, error: "Falta la materia de esta sesión." };
  }

  const { plan } = await cargarPlanYAvance(user.id);
  const materia = plan?.materias.find((item) => item.id === materiaId);
  if (!materia) {
    return { ok: false, error: "Esa materia no está en tu plan." };
  }
  if (archivos.length > MAX_ARCHIVOS_MATERIA) {
    return { ok: false, error: `Podés subir hasta ${MAX_ARCHIVOS_MATERIA} archivos.` };
  }

  const payload = await Promise.all(
    archivos.map(async (archivo) => ({
      name: archivo.name,
      type: archivo.type,
      size: archivo.size,
      bytes: Buffer.from(await archivo.arrayBuffer()),
    })),
  );

  const resumido = await resumirClaseConClaude({
    materiaNombre: materia.nombre,
    notas,
    archivos: payload,
  });
  if (!resumido.ok) {
    return resumido;
  }

  const supabase = createSupabaseServerClient();
  const lote = Date.now();
  await Promise.all(
    payload.map((archivo) =>
      supabase.storage
        .from("contenido-clases")
        .upload(
          `${user.id}/${nombreArchivoSeguro(materiaId)}/${lote}-${nombreArchivoSeguro(archivo.name)}`,
          archivo.bytes,
          {
            contentType: archivo.type || "application/octet-stream",
            upsert: true,
          },
        ),
    ),
  );

  const origen = [
    notas.trim() ? notas.trim().slice(0, 4000) : "",
    payload.length > 0 ? `Archivos: ${payload.map((archivo) => archivo.name).join(", ")}` : "",
  ]
    .filter((parte) => parte.length > 0)
    .join("\n\n");

  const { error } = await supabase.from("sesiones_estudio").insert({
    user_id: user.id,
    materia_id: materiaId,
    contenido_original: origen || null,
    resumen_ia: resumido.data,
  });

  if (error) {
    return {
      ok: false,
      error: mensajeErrorSupabase(
        error,
        "El resumen se armó, pero no pude guardarlo. Ejecutá supabase/schema.sql si faltan tablas.",
      ),
    };
  }

  revalidarRutasApp(materiaId);
  return { ok: true, data: { resumen: resumido.data } };
}
