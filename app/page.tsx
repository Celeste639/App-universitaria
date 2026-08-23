import Link from "next/link";
import { LogoTraza } from "@/components/LogoTraza";
import { getAuthUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getAuthUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16">
      <LogoTraza />
      <p className="mt-6 text-sm font-medium text-primary-text">ORGANIZÁ. PLANIFICÁ. AVANZÁ.</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        Tu copiloto de IA para la carrera
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-surface-text">
        Subí tu plan de estudios, priorizá las materias que más desbloquean y
        armá un calendario de estudio que conviva con el trabajo, el entrenamiento
        y tu método preferido.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {user ? (
          <>
            <Link
              href="/onboarding"
              className="rounded-lg bg-primary px-5 py-2.5 text-center text-sm font-medium text-primary-text hover:bg-accent hover:text-accent-text"
            >
              Cargar plan
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-primary/40 bg-surface px-5 py-2.5 text-center text-sm font-medium text-text hover:bg-primary/40"
            >
              Ir al dashboard
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/registro"
              className="rounded-lg bg-primary px-5 py-2.5 text-center text-sm font-medium text-primary-text hover:bg-accent hover:text-accent-text"
            >
              Crear cuenta
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-primary/40 bg-surface px-5 py-2.5 text-center text-sm font-medium text-text hover:bg-primary/40"
            >
              Iniciar sesión
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
