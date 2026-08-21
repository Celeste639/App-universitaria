"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/env";
import { mensajeErrorAuth, rutaSegura } from "@/lib/auth";
import type { ResultadoAccion } from "@/lib/types";

function supabaseOrError() {
  if (!hasSupabaseConfig()) {
    return null;
  }
  return createSupabaseServerClient();
}

export async function iniciarSesion(
  formData: FormData,
): Promise<ResultadoAccion<{ next: string }>> {
  const supabase = supabaseOrError();
  if (!supabase) {
    return { ok: false, error: "Faltan las claves de Supabase en .env.local." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { ok: false, error: "Completá email y contraseña." };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { ok: false, error: mensajeErrorAuth(error.message) };
  }

  return { ok: true, data: { next: rutaSegura(formData.get("next")) } };
}

export async function registrarUsuario(
  formData: FormData,
): Promise<ResultadoAccion<{ next: string; confirmarEmail: boolean }>> {
  const supabase = supabaseOrError();
  if (!supabase) {
    return { ok: false, error: "Faltan las claves de Supabase en .env.local." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) {
    return { ok: false, error: "Completá email y contraseña." };
  }
  if (password.length < 6) {
    return { ok: false, error: "La contraseña tiene que tener al menos 6 caracteres." };
  }

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    return { ok: false, error: mensajeErrorAuth(error.message) };
  }

  if (!data.session) {
    return {
      ok: true,
      data: { next: "/login", confirmarEmail: true },
    };
  }

  return { ok: true, data: { next: "/onboarding", confirmarEmail: false } };
}

export async function cerrarSesion() {
  const supabase = supabaseOrError();
  if (supabase) {
    await supabase.auth.signOut();
  }
  redirect("/");
}
