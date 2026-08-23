export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }
  return value;
}

export function hasSupabaseConfig(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export const MENSAJE_FALTAN_CLAVES_SUPABASE =
  "Faltan las claves de Supabase. En local van en .env.local; en el deploy, en Environment Variables de Vercel (y hay que redesplegar).";
