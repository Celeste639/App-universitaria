import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/env";
import type { User } from "@supabase/supabase-js";

export async function getAuthUser(): Promise<User | null> {
  if (!hasSupabaseConfig()) return null;
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireAuthUser(): Promise<User> {
  const user = await getAuthUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export function mensajeErrorAuth(message: string): string {
  const texto = message.toLowerCase();
  if (texto.includes("invalid login")) {
    return "Email o contraseña incorrectos.";
  }
  if (texto.includes("already registered") || texto.includes("already been registered")) {
    return "Ese email ya tiene una cuenta. Iniciá sesión.";
  }
  if (texto.includes("password")) {
    return "La contraseña tiene que tener al menos 6 caracteres.";
  }
  if (texto.includes("email")) {
    return "Revisá que el email sea válido.";
  }
  return message;
}

export function rutaSegura(valor: FormDataEntryValue | null): string {
  if (typeof valor !== "string" || !valor.startsWith("/") || valor.startsWith("//")) {
    return "/dashboard";
  }
  return valor;
}
