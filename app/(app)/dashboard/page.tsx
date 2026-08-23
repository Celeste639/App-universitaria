import { Suspense } from "react";
import Link from "next/link";
import { AvisoAnalisis } from "@/components/AvisoAnalisis";
import { CalendarioDashboard } from "@/components/CalendarioDashboard";
import { CardMateria } from "@/components/CardMateria";
import { requireAuthUser } from "@/lib/auth";
import { cargarPlanYAvance } from "@/lib/datos";
import { explicarRankingConPerfil } from "@/lib/explicaciones";
import { rankingEstrategico } from "@/lib/graph";
import { estadoVisualMateria } from "@/lib/plan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type DashboardPageProps = {
  searchParams: { analisis?: string };
};

function CalendarioPendiente() {
  return (
    <div
      className="h-[420px] animate-pulse rounded-xl border border-clever-sand bg-clever-cream sm:h-[560px]"
      aria-busy="true"
    >
      <p className="px-4 py-6 text-sm text-clever-muted">Armando tu semana…</p>
    </div>
  );
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const user = await requireAuthUser();
  const { plan, avance, perfil } = await cargarPlanYAvance(user.id);

  if (!plan || plan.materias.length === 0) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Tu semana</h1>
        <p className="text-sm text-clever-muted">
          Todavía no hay un plan de estudios cargado.
        </p>
        <Link
          href="/onboarding"
          className="inline-flex rounded-lg bg-clever-skyDeep px-4 py-2 text-sm font-medium text-white hover:bg-[#4d92b3]"
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

  const ranking = explicarRankingConPerfil(
    rankingEstrategico(plan.materias, plan.correlativas, noCursadas),
    perfil,
  );

  return (
    <main className="space-y-8">
      {searchParams.analisis === "ok" && <AvisoAnalisis />}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tu semana</h1>
        <p className="mt-2 text-sm text-clever-muted">
          El orden sale de las correlativas. Marcá cursando o aprobada y el ranking
          se actualiza. El calendario se arma en paralelo y queda guardado para la
          semana.{" "}
          <Link href="/revisar-plan" className="font-medium text-clever-skyDeep hover:underline">
            Revisar correlativas
          </Link>
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Materias priorizadas</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ranking.length === 0 ? (
            <p className="text-sm text-clever-muted sm:col-span-2">
              Todas las materias del plan figuran como aprobadas.
            </p>
          ) : (
            ranking.map((item) => {
              const estado = avance.get(item.materia.id) ?? "pendiente";
              return (
                <CardMateria
                  key={item.materia.id}
                  materiaId={item.materia.id}
                  nombre={item.materia.nombre}
                  codigo={item.materia.codigo ?? item.materia.id}
                  estado={estadoVisualMateria(
                    item.materia.id,
                    estado,
                    plan.correlativas,
                    avance,
                  )}
                  estadoPersistido={estado}
                  puntaje={item.puntaje}
                  explicacion={item.explicacion}
                  href={`/materias/${encodeURIComponent(item.materia.id)}`}
                  mostrarSelector
                />
              );
            })
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Calendario semanal</h2>
        <Suspense fallback={<CalendarioPendiente />}>
          <CalendarioDashboard ranking={ranking} />
        </Suspense>
      </section>
    </main>
  );
}
