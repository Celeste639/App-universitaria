"use server";

import { extraerPlanConClaude } from "@/lib/parse-plan";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import { inferirTipoDocumento, nombreArchivoSeguro } from "@/lib/documentos";
import { mensajeErrorSupabase } from "@/lib/errores-supabase";
import type { Json } from "@/types/database";
import type { PlanEstudioParseado, ResultadoAccion, TipoDocumentoPlan } from "@/lib/types";

function textoOpcional(valor: FormDataEntryValue | null): string | null {
  if (typeof valor !== "string") return null;
  const recortado = valor.trim();
  return recortado.length > 0 ? recortado : null;
}

function esTipoDocumento(valor: FormDataEntryValue | undefined): valor is TipoDocumentoPlan {
  return valor === "plan" || valor === "correlativas" || valor === "cronograma";
}

export async function completarOnboarding(
  formData: FormData,
): Promise<ResultadoAccion<PlanEstudioParseado>> {
  const user = await getAuthUser();
  if (!user) {
    return { ok: false, error: "Tenés que iniciar sesión para guardar el plan." };
  }
  const supabase = createSupabaseServerClient();
  const archivos = formData
    .getAll("archivos")
    .filter((item): item is File => item instanceof File && item.size > 0);
  const tipos = formData.getAll("tipos");

  if (archivos.length === 0) {
    return {
      ok: false,
      error: "Subí al menos el plan de estudios. Correlativas y cronograma son opcionales.",
    };
  }

  const payload = await Promise.all(
    archivos.map(async (archivo, index) => ({
      name: archivo.name,
      type: archivo.type,
      size: archivo.size,
      bytes: Buffer.from(await archivo.arrayBuffer()),
      tipo: esTipoDocumento(tipos[index])
        ? tipos[index]
        : inferirTipoDocumento(archivo.name),
      relativePath: archivo.name,
    })),
  );

  const parseado = await extraerPlanConClaude(payload);
  if (!parseado.ok) {
    return parseado;
  }

  const lote = Date.now();
  await Promise.all(
    payload.map((archivo) =>
      supabase.storage
        .from("planes-estudio")
        .upload(
          `${user.id}/${lote}-${archivo.tipo}-${nombreArchivoSeguro(archivo.name)}`,
          archivo.bytes,
          {
            contentType: archivo.type || "application/octet-stream",
            upsert: true,
          },
        ),
    ),
  );

  const { data: planExistente } = await supabase
    .from("planes_estudio")
    .select("id")
    .eq("user_id", user.id)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  const payloadPlan = {
    materias: parseado.data.materias as unknown as Json,
    correlativas: parseado.data.correlativas as unknown as Json,
  };

  const { error: errorPlan } = planExistente
    ? await supabase
        .from("planes_estudio")
        .update(payloadPlan)
        .eq("id", planExistente.id)
    : await supabase.from("planes_estudio").insert({
        user_id: user.id,
        ...payloadPlan,
      });

  if (errorPlan) {
    return {
      ok: false,
      error: mensajeErrorSupabase(
        errorPlan,
        "No pude guardar el plan. Probá de nuevo en unos segundos.",
      ),
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
    return {
      ok: false,
      error: mensajeErrorSupabase(
        errorPerfil,
        "El plan se leyó, pero no pude guardar tu perfil.",
      ),
    };
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
      error: mensajeErrorSupabase(
        errorAvance,
        "El plan se guardó, pero no pude inicializar el avance de carrera.",
      ),
    };
  }

  return { ok: true, data: parseado.data };
}
