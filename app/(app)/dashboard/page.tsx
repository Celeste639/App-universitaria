import { Suspense } from "react";
import Link from "next/link";
import { AvisoAnalisis } from "@/components/AvisoAnalisis";
import { CalendarioDashboard } from "@/components/CalendarioDashboard";
import { CardMateria } from "@/components/CardMateria";
import { DashboardAvance } from "@/components/DashboardAvance";
import { SimuladorEscenarios } from "@/components/SimuladorEscenarios";
import { requireAuthUser } from "@/lib/auth";
import { cargarPlanYAvance, cargarCalendarioSemana } from "@/lib/datos";
import { explicarRankingConPerfil } from "@/lib/explicaciones";
import {
  estimarCuatrimestres,
  materiasPorCuatrimestreDesdePerfil,
} from "@/lib/escenarios";
import { rankingEstrategico } from "@/lib/graph";
import { PREFERENCIAS_DEFAULT } from "@/lib/preferencias";
import { estadoVisualMateria } from "@/lib/plan";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type DashboardPageProps = {
  searchParams: { analisis?: string };
};

function CalendarioPendiente() {
  return (
    <div
      className="h-[420px] animate-pulse rounded-xl border border-primary/30 bg-surface sm:h-[560px]"
      aria-busy="true"
    >
      <p className="px-4 py-6 text-sm text-surface-text">Armando tu semana…</p>
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
        <p className="text-sm text-surface-text">
          Todavía no hay un plan de estudios cargado.
        </p>
        <Link
          href="/onboarding"
          className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-text hover:bg-accent hover:text-accent-text"
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
  const aprobadas = plan.materias.length - noCursadas.size;
  const porcentaje =
    plan.materias.length === 0
      ? 0
      : Math.round((aprobadas / plan.materias.length) * 100);
  const cuatrimestres = estimarCuatrimestres(
    noCursadas.size,
    materiasPorCuatrimestreDesdePerfil(perfil),
  );
  const calendario = await cargarCalendarioSemana(user.id);
  const preferencias = perfil?.preferencias ?? PREFERENCIAS_DEFAULT;

  return (
    <main className="space-y-8">
      {searchParams.analisis === "ok" && <AvisoAnalisis />}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tu semana</h1>
        <p className="mt-2 text-sm text-surface-text">
          El orden sale de las correlativas. Marcá cursando o aprobada y el ranking
          se actualiza. El calendario se arma en paralelo y queda guardado para la
          semana.{" "}
          <Link href="/revisar-plan" className="font-medium text-primary-text hover:underline">
            Revisar correlativas
          </Link>
        </p>
      </div>

      <DashboardAvance
        porcentaje={porcentaje}
        aprobadas={aprobadas}
        total={plan.materias.length}
        cuatrimestres={cuatrimestres}
        ranking={ranking}
        eventos={calendario?.eventos ?? []}
        preferencias={preferencias}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Materias priorizadas</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {ranking.length === 0 ? (
            <p className="text-sm text-surface-text sm:col-span-2">
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

      <SimuladorEscenarios
        materias={plan.materias}
        correlativas={plan.correlativas}
        idsPendientes={Array.from(noCursadas)}
        perfil={perfil}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Calendario</h2>
        <Suspense fallback={<CalendarioPendiente />}>
          <CalendarioDashboard
            ranking={ranking}
            materias={plan.materias}
            preferencias={preferencias}
          />
        </Suspense>
      </section>
    </main>
  );
}
