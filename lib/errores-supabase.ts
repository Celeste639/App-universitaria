export function mensajeErrorSupabase(
  error: { code?: string; message?: string },
  fallback: string,
): string {
  const texto = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  if (
    texto.includes("pgrst205") ||
    texto.includes("schema cache") ||
    texto.includes("does not exist")
  ) {
    return "Faltan las tablas en Supabase. Abrí el SQL Editor, pegá supabase/schema.sql y dale Run.";
  }
  if (texto.includes("row-level security") || texto.includes("rls")) {
    return "Supabase rechazó el guardado por permisos. Volvé a ejecutar supabase/schema.sql completo (incluye las políticas RLS).";
  }
  return fallback;
}
