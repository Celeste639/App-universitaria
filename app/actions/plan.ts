"use server";

import { extraerPlanConClaude } from "@/lib/parse-plan";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import type { Json } from "@/types/database";
import type { PlanEstudioParseado, ResultadoAccion } from "@/lib/types";

function textoOpcional(valor: FormDataEntryValue | null): string | null {
  if (typeof valor !== "string") return null;
  const recortado = valor.trim();
  return recortado.length > 0 ? recortado : null;
}

function nombreArchivoSeguro(nombre: string): string {
  return nombre.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "plan";
}

export async function completarOnboarding(
  formData: FormData,
): Promise<ResultadoAccion<PlanEstudioParseado>> {
  const user = await getAuthUser();
  if (!user) {
    return { ok: false, error: "Tenés que iniciar sesión para guardar el plan." };
  }
  const supabase = createSupabaseServerClient();
  const archivo = formData.get("plan");

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: "Subí el PDF o la imagen de tu plan de estudios." };
  }

  const bytes = Buffer.from(await archivo.arrayBuffer());
  const parseado = await extraerPlanConClaude({
    name: archivo.name,
    type: archivo.type,
    size: archivo.size,
    bytes,
  });
  if (!parseado.ok) {
    return parseado;
  }

  const rutaStorage = `${user.id}/${Date.now()}-${nombreArchivoSeguro(archivo.name)}`;
  await supabase.storage.from("planes-estudio").upload(rutaStorage, bytes, {
    contentType: archivo.type || "application/octet-stream",
    upsert: true,
  });

  const { error: errorPlan } = await supabase.from("planes_estudio").insert({
    user_id: user.id,
    materias: parseado.data.materias as unknown as Json,
    correlativas: parseado.data.correlativas as unknown as Json,
  });

  if (errorPlan) {
    return {
      ok: false,
      error:
        "No pude guardar el plan en la base. Ejecutá supabase/schema.sql en el SQL Editor de Supabase.",
    };
  }

  const horas = Number(formData.get("horas_trabajo"));
  const { error: errorPerfil } = await supabase.from("perfil_estudiante").upsert({
    user_id: user.id,
    horas_trabajo: Number.isFinite(horas) ? horas : null,
    tipo_trabajo: textoOpcional(formData.get("tipo_trabajo")),
    horario_rotativo: formData.get("horario_rotativo") === "true",
    otras_actividades: textoOpcional(formData.get("otras_actividades")),
    metodo_estudio: textoOpcional(formData.get("metodo_estudio")) ?? "pomodoro",
  });

  if (errorPerfil) {
    return { ok: false, error: "El plan se leyó, pero no pude guardar tu perfil." };
  }

  const { error: errorAvance } = await supabase.from("avance_carrera").upsert(
    parseado.data.materias.map((materia) => ({
      user_id: user.id,
      materia_id: materia.id,
      estado: "pendiente" as const,
    })),
    { onConflict: "user_id,materia_id", ignoreDuplicates: true },
  );

  if (errorAvance) {
    return {
      ok: false,
      error: "El plan se guardó, pero no pude inicializar el avance de carrera.",
    };
  }

  return { ok: true, data: parseado.data };
}
