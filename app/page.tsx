import Link from "next/link";
import { getAuthUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getAuthUser();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-4 py-16">
      <p className="text-sm font-medium text-indigo-600">MVP universitario</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
        Copiloto de IA para tu carrera
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
        Subí tu plan de estudios, priorizá las materias que más desbloquean y
        armá un calendario de estudio que conviva con el trabajo, el entrenamiento
        y tu método preferido.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {user ? (
          <>
            <Link
              href="/onboarding"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-700"
            >
              Cargar plan
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ir al dashboard
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/registro"
              className="rounded-lg bg-indigo-600 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-indigo-700"
            >
              Crear cuenta
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-center text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Iniciar sesión
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
