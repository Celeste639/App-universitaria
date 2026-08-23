import Link from "next/link";
import { AvisoAnalisis } from "@/components/AvisoAnalisis";
import { EditorPlan } from "@/components/EditorPlan";
import { requireAuthUser } from "@/lib/auth";
import { cargarPlanYAvance } from "@/lib/datos";

export const dynamic = "force-dynamic";

type RevisarPlanPageProps = {
  searchParams: { analisis?: string };
};

export default async function RevisarPlanPage({ searchParams }: RevisarPlanPageProps) {
  const user = await requireAuthUser();
  const { plan, avance } = await cargarPlanYAvance(user.id);
  const recienAnalizado = searchParams.analisis === "ok";

  if (!plan || plan.materias.length === 0) {
    return (
      <main className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Revisar plan</h1>
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

  const correlativasDetectadas = plan.correlativas.filter(
    (fila) => fila.requiere.length > 0,
  ).length;

  return (
    <main className="space-y-6">
      {recienAnalizado && <AvisoAnalisis />}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Revisar plan</h1>
        <p className="mt-2 text-sm text-surface-text">
          traza leyó {plan.materias.length} materias y encontró correlativas en{" "}
          {correlativasDetectadas}. Corregí si hace falta y marcá lo que ya
          cursaste o aprobaste: el ranking se arma con eso.
        </p>
      </div>
      <EditorPlan
        materias={plan.materias}
        correlativas={plan.correlativas}
        avance={plan.materias.map((materia) => ({
          materia_id: materia.id,
          estado: avance.get(materia.id) ?? "pendiente",
        }))}
        redirigirAlDashboard={recienAnalizado}
      />
    </main>
  );
}
