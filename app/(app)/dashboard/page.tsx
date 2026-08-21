import Link from "next/link";
import { CalendarioSemanal } from "@/components/CalendarioSemanal";
import { CardMateria } from "@/components/CardMateria";
import { requireAuthUser } from "@/lib/auth";
import { cargarPlanYAvance } from "@/lib/datos";
import { explicarRankingLocal, rankingEstrategico } from "@/lib/graph";
import { estadoVisualMateria } from "@/lib/plan";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAuthUser();
  const { plan, avance, perfil } = await cargarPlanYAvance(user.id);

  if (!plan || plan.materias.length === 0) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-slate-600">
          Todavía no hay un plan de estudios cargado.
        </p>
        <Link
          href="/onboarding"
          className="inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Cargar plan de estudios
        </Link>
      </main>
    );
  }

  const noCursadas = new Set(
    plan.materias
      .filter((materia) => avance.get(materia.id) !== "aprobada")
      .map((materia) => materia.id),
  );

  const ranking = rankingEstrategico(
    plan.materias,
    plan.correlativas,
    noCursadas,
  ).map((item) => ({
    ...item,
    explicacion: explicarRankingLocal(item),
  }));

  const avisos = perfil?.horario_rotativo
    ? [
        "Detectamos horario rotativo: consultá disponibilidad con el profesor y pedí constancia laboral si corresponde.",
      ]
    : [];

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Ranking según cuántas materias futuras desbloquea cada una. El
          calendario semanal con IA lo conectamos en el próximo paso.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Materias priorizadas</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ranking.length === 0 ? (
            <p className="text-sm text-slate-600 sm:col-span-2">
              Todas las materias del plan figuran como aprobadas.
            </p>
          ) : (
            ranking.map((item) => {
              const estado = avance.get(item.materia.id) ?? "pendiente";
              return (
                <CardMateria
                  key={item.materia.id}
                  nombre={item.materia.nombre}
                  codigo={item.materia.codigo ?? item.materia.id}
                  estado={estadoVisualMateria(
                    item.materia.id,
                    estado,
                    plan.correlativas,
                    avance,
                  )}
                  puntaje={item.puntaje}
                  explicacion={item.explicacion}
                  href={`/materias/${encodeURIComponent(item.materia.id)}`}
                />
              );
            })
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Calendario semanal</h2>
        <CalendarioSemanal avisos={avisos} />
      </section>
    </main>
  );
}
