import Link from "next/link";
import { TablaCargaHistorial } from "@/components/TablaCargaHistorial";
import { requireAuthUser } from "@/lib/auth";
import { cargarPlanYAvance } from "@/lib/datos";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function CargarHistorialPage() {
  const user = await requireAuthUser();
  const { plan, registros } = await cargarPlanYAvance(user.id);

  if (!plan || plan.materias.length === 0) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Cargar historial</h1>
        <p className="text-sm text-surface-text">
          Primero cargá el plan de estudios.
        </p>
        <Link
          href="/onboarding"
          className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-text hover:bg-accent hover:text-accent-text"
        >
          Ir al onboarding
        </Link>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Carga retroactiva</h1>
        <p className="mt-2 text-sm text-surface-text">
          Completá el estado, la nota y la fecha de varias materias de una vez.
          Sirve para reconstruir hasta un par de años de cursada.{" "}
          <Link href="/historial" className="font-medium text-primary-text hover:underline">
            Volver al historial
          </Link>
        </p>
      </div>
      <TablaCargaHistorial
        materias={plan.materias}
        registros={Array.from(registros.values())}
      />
    </main>
  );
}
