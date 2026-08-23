"use server";

import { revalidarRutasApp } from "@/lib/revalidar";
import { alinearCorrelativas } from "@/lib/correlativas";
import {
  cargarPlanYAvance,
  invalidarCalendarioSemanaActual,
} from "@/lib/datos";
import { esEstadoMateria, parseFecha, parseNota } from "@/lib/estados";
import { mensajeErrorSupabase } from "@/lib/errores-supabase";
import { getAuthUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AvanceMateria, Correlativa, EstadoMateria, ResultadoAccion } from "@/lib/types";
import type { Json } from "@/types/database";

export async function actualizarEstadoMateria(
  materiaId: string,
  estado: EstadoMateria,
): Promise<ResultadoAccion<{ estado: EstadoMateria }>> {
  const user = await getAuthUser();
  if (!user) {
    return { ok: false, error: "Tenés que iniciar sesión para actualizar el avance." };
  }
  if (!esEstadoMateria(estado)) {
    return { ok: false, error: "El estado de la materia no es válido." };
  }

  const { plan } = await cargarPlanYAvance(user.id);
  if (!plan?.materias.some((materia) => materia.id === materiaId)) {
    return { ok: false, error: "Esa materia no está en tu plan." };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("avance_carrera").upsert(
    {
      user_id: user.id,
      materia_id: materiaId,
      estado,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: "user_id,materia_id" },
  );

  if (error) {
    return {
      ok: false,
      error: mensajeErrorSupabase(error, "No pude guardar el avance de esa materia."),
    };
  }

  await invalidarCalendarioSemanaActual(user.id);
  revalidarRutasApp(materiaId);
  return { ok: true, data: { estado } };
}

export async function guardarAvanceMateria(input: {
  materiaId: string;
  estado: EstadoMateria;
  nota: string | number | null;
  fecha: string | null;
  comentario: string | null;
}): Promise<ResultadoAccion<{ materia_id: string }>> {
  const user = await getAuthUser();
  if (!user) {
    return { ok: false, error: "Tenés que iniciar sesión para guardar el historial." };
  }
  if (!esEstadoMateria(input.estado)) {
    return { ok: false, error: "El estado de la materia no es válido." };
  }

  const { plan } = await cargarPlanYAvance(user.id);
  if (!plan?.materias.some((materia) => materia.id === input.materiaId)) {
    return { ok: false, error: "Esa materia no está en tu plan." };
  }

  const nota = parseNota(input.nota);
  if (input.nota !== null && input.nota !== "" && nota === null) {
    return { ok: false, error: "La nota tiene que ser un número entre 0 y 10." };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("avance_carrera").upsert(
    {
      user_id: user.id,
      materia_id: input.materiaId,
      estado: input.estado,
      nota,
      fecha: parseFecha(input.fecha),
      comentario: input.comentario?.trim() ? input.comentario.trim().slice(0, 500) : null,
      actualizado_en: new Date().toISOString(),
    },
    { onConflict: "user_id,materia_id" },
  );

  if (error) {
    return {
      ok: false,
      error: mensajeErrorSupabase(error, "No pude guardar el historial de esa materia."),
    };
  }

  await invalidarCalendarioSemanaActual(user.id);
  revalidarRutasApp(input.materiaId);
  return { ok: true, data: { materia_id: input.materiaId } };
}

export async function guardarHistorialMasivo(
  filas: AvanceMateria[],
): Promise<ResultadoAccion<{ actualizadas: number }>> {
  const user = await getAuthUser();
  if (!user) {
    return { ok: false, error: "Tenés que iniciar sesión para cargar el historial." };
  }

  const { plan } = await cargarPlanYAvance(user.id);
  if (!plan) {
    return { ok: false, error: "Todavía no hay un plan de estudios cargado." };
  }

  const ids = new Set(plan.materias.map((materia) => materia.id));
  const ahora = new Date().toISOString();
  const payload = filas.flatMap((fila) => {
    if (!ids.has(fila.materia_id) || !esEstadoMateria(fila.estado)) return [];
    return [
      {
        user_id: user.id,
        materia_id: fila.materia_id,
        estado: fila.estado,
        nota: parseNota(fila.nota),
        fecha: parseFecha(fila.fecha),
        comentario: fila.comentario?.trim() ? fila.comentario.trim().slice(0, 500) : null,
        actualizado_en: ahora,
      },
    ];
  });

  if (payload.length === 0) {
    return { ok: false, error: "No llegó ninguna materia para guardar." };
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("avance_carrera").upsert(payload, {
    onConflict: "user_id,materia_id",
  });

  if (error) {
    return {
      ok: false,
      error: mensajeErrorSupabase(error, "No pude guardar el historial masivo."),
    };
  }

  await invalidarCalendarioSemanaActual(user.id);
  revalidarRutasApp();
  return { ok: true, data: { actualizadas: payload.length } };
}

export async function guardarRevisionPlan(input: {
  correlativas: Correlativa[];
  avance: AvanceMateria[];
}): Promise<ResultadoAccion<{ materias: number }>> {
  const user = await getAuthUser();
  if (!user) {
    return { ok: false, error: "Tenés que iniciar sesión para guardar el plan." };
  }

  const { plan } = await cargarPlanYAvance(user.id);
  if (!plan) {
    return { ok: false, error: "Todavía no hay un plan de estudios cargado." };
  }

  const ids = new Set(plan.materias.map((materia) => materia.id));
  const correlativas = alinearCorrelativas(
    plan.materias,
    input.correlativas.filter(
      (fila) =>
        ids.has(fila.materia_id) &&
        fila.requiere.every((requisito) => ids.has(requisito) && requisito !== fila.materia_id),
    ),
  );

  const avance = input.avance.filter(
    (fila) => ids.has(fila.materia_id) && esEstadoMateria(fila.estado),
  );
  if (avance.length === 0) {
    return { ok: false, error: "No llegó el avance de las materias." };
  }

  const supabase = createSupabaseServerClient();
  const { error: errorPlan } = await supabase
    .from("planes_estudio")
    .update({ correlativas: correlativas as unknown as Json })
    .eq("id", plan.id)
    .eq("user_id", user.id);

  if (errorPlan) {
    return {
      ok: false,
      error: mensajeErrorSupabase(errorPlan, "No pude guardar las correlativas."),
    };
  }

  const ahora = new Date().toISOString();
  const { error: errorAvance } = await supabase.from("avance_carrera").upsert(
    avance.map((fila) => ({
      user_id: user.id,
      materia_id: fila.materia_id,
      estado: fila.estado,
      actualizado_en: ahora,
    })),
    { onConflict: "user_id,materia_id" },
  );

  if (errorAvance) {
    return {
      ok: false,
      error: mensajeErrorSupabase(errorAvance, "Las correlativas se guardaron, pero no el avance."),
    };
  }

  await invalidarCalendarioSemanaActual(user.id);
  revalidarRutasApp();
  return { ok: true, data: { materias: plan.materias.length } };
}
