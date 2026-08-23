import Link from "next/link";
import { CardMateria } from "@/components/CardMateria";
import { requireAuthUser } from "@/lib/auth";
import { cargarPlanYAvance } from "@/lib/datos";
import { estadoVisualMateria } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function HistorialPage() {
  const user = await requireAuthUser();
  const { plan, avance } = await cargarPlanYAvance(user.id);

  if (!plan || plan.materias.length === 0) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Historial de avance
        </h1>
        <p className="text-sm text-clever-muted">
          Cargá tu plan para ver el porcentaje de la carrera.
        </p>
        <Link
          href="/onboarding"
          className="inline-flex rounded-lg bg-clever-skyDeep px-4 py-2 text-sm font-medium text-white hover:bg-[#4d92b3]"
        >
          Ir al onboarding
        </Link>
      </main>
    );
  }

  const total = plan.materias.length;
  const aprobadas = plan.materias.filter(
    (materia) => avance.get(materia.id) === "aprobada",
  ).length;
  const porcentaje = total === 0 ? 0 : Math.round((aprobadas / total) * 100);

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Historial de avance
        </h1>
        <p className="mt-2 text-sm text-clever-muted">
          Marcá cursando o aprobada: el porcentaje y el ranking se mueven con tu
          avance.{" "}
          <Link href="/revisar-plan" className="font-medium text-clever-skyDeep hover:underline">
            Revisar correlativas
          </Link>
        </p>
      </div>

      <section className="rounded-xl border border-clever-sand bg-clever-cream p-5 shadow-sm">
        <p className="text-sm font-medium text-clever-muted">Completado</p>
        <p className="mt-1 text-3xl font-semibold">{porcentaje}%</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-clever-sand">
          <div
            className="h-full rounded-full bg-clever-skyDeep"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-clever-muted">
          {aprobadas} de {total} materias aprobadas
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {plan.materias.map((materia) => {
          const estado = avance.get(materia.id) ?? "pendiente";
          return (
            <CardMateria
              key={materia.id}
              materiaId={materia.id}
              nombre={materia.nombre}
              codigo={materia.codigo ?? materia.id}
              estado={estadoVisualMateria(
                materia.id,
                estado,
                plan.correlativas,
                avance,
              )}
              estadoPersistido={estado}
              href={`/materias/${encodeURIComponent(materia.id)}`}
              mostrarSelector
            />
          );
        })}
      </section>
    </main>
  );
}
