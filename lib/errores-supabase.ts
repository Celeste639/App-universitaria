function extraerColumna(mensaje: string): string | null {
  const schemaCache = mensaje.match(
    /could not find the '([^']+)' column/i,
  );
  if (schemaCache?.[1]) return schemaCache[1];
  const postgres = mensaje.match(
    /column (?:[\w.]+\.)?["']?(\w+)["']? does not exist/i,
  );
  return postgres?.[1] ?? null;
}

export function mensajeErrorSupabase(
  error: { code?: string; message?: string },
  fallback: string,
): string {
  const codigo = (error.code ?? "").toLowerCase();
  const mensaje = error.message ?? "";
  const texto = `${codigo} ${mensaje}`.toLowerCase();

  if (
    texto.includes("pgrst301") ||
    texto.includes("jwt expired") ||
    texto.includes("invalid jwt") ||
    texto.includes("not authenticated") ||
    texto.includes("auth session missing") ||
    texto.includes("invalid api key")
  ) {
    return "La sesión expiró o no estás autenticado. Cerrá sesión y volvé a entrar.";
  }

  const faltaColumna =
    codigo === "pgrst204" ||
    texto.includes("pgrst204") ||
    /could not find the '.+' column/.test(texto) ||
    /column .+ does not exist/.test(texto) ||
    codigo === "42703";

  if (faltaColumna) {
    const columna = extraerColumna(mensaje);
    const detalle = columna ? ` Falta la columna «${columna}».` : "";
    return `Hay un problema de configuración del servidor.${detalle} Vos no tenés que correr SQL: avisá a quien administra la app (tiene que ejecutar supabase/migracion-historial.sql; no borra datos).`;
  }

  const faltaTabla =
    codigo === "pgrst205" ||
    texto.includes("pgrst205") ||
    /could not find the table/.test(texto) ||
    /relation .+ does not exist/.test(texto) ||
    codigo === "42p01";

  if (faltaTabla) {
    return "Falta una tabla en el servidor. Vos no tenés que correr SQL: avisá a quien administra la app (supabase/migracion-historial.sql; si sigue, supabase/schema.sql).";
  }

  if (texto.includes("schema cache")) {
    return "El esquema del servidor no coincide con la app. Vos no tenés que correr SQL: avisá a quien administra la app (supabase/migracion-historial.sql).";
  }

  if (
    texto.includes("invalid input value for enum") ||
    (texto.includes("estado_materia") && texto.includes("enum"))
  ) {
    return "El servidor todavía no conoce los estados Libre o Recursando. Vos no tenés que correr SQL: avisá a quien administra la app (supabase/migracion-historial.sql).";
  }

  if (
    texto.includes("row-level security") ||
    texto.includes("violates row-level security") ||
    codigo === "42501" ||
    texto.includes("permission denied")
  ) {
    return "El servidor rechazó el guardado por permisos. Vos no tenés que correr SQL: avisá a quien administra la app (tiene que reejecutar supabase/schema.sql, que incluye RLS).";
  }

  return fallback;
}
