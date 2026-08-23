import { AppNav } from "@/components/AppNav";
import { AuthForm } from "@/components/AuthForm";
import { ErrorMessage } from "@/components/ErrorMessage";
import { hasSupabaseConfig, MENSAJE_FALTAN_CLAVES_SUPABASE } from "@/lib/env";

export default function RegistroPage() {
  return (
    <>
      <AppNav />
      <main className="mx-auto max-w-md px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Crear cuenta</h1>
        <p className="mt-2 text-sm text-surface-text">
          Usá tu email. Después vas a subir el plan de estudios.
        </p>
        <div className="mt-8 rounded-xl border border-primary/30 bg-surface p-5 shadow-sm">
          {!hasSupabaseConfig() && (
            <div className="mb-4">
              <ErrorMessage
                title="Falta configurar Supabase"
                message={MENSAJE_FALTAN_CLAVES_SUPABASE}
              />
            </div>
          )}
          <AuthForm modo="registro" next="/onboarding" />
        </div>
      </main>
    </>
  );
}
