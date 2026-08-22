import { notFound } from "next/navigation";
import { CardMateria } from "@/components/CardMateria";
import { TemporizadorPomodoro } from "@/components/TemporizadorPomodoro";
import { UploadSesionMateria } from "@/components/UploadSesionMateria";
import { requireAuthUser } from "@/lib/auth";
import { cargarPlanYAvance } from "@/lib/datos";
import { estadoVisualMateria } from "@/lib/plan";

type MateriaPageProps = {
  params: { id: string };
};

export const dynamic = "force-dynamic";

export default async function MateriaPage({ params }: MateriaPageProps) {
  const user = await requireAuthUser();
  const materiaId = decodeURIComponent(params.id);
  const { plan, avance } = await cargarPlanYAvance(user.id);
  const materia = plan?.materias.find((item) => item.id === materiaId);

  if (!materia || !plan) {
    notFound();
  }

  const estado = avance.get(materia.id) ?? "pendiente";

  return (
    <main className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-6">
        <CardMateria
          nombre={materia.nombre}
          codigo={materia.codigo ?? materia.id}
          estado={estadoVisualMateria(
            materia.id,
            estado,
            plan.correlativas,
            avance,
          )}
        />

        <section className="rounded-xl border border-clever-sand bg-clever-cream p-5 shadow-sm">
          <h2 className="text-lg font-medium">Sesión de estudio</h2>
          <p className="mt-1 text-sm text-clever-muted">
            Subí uno o varios PDF de la materia (clases de 20+ páginas entran).
            El resumen con IA se conecta en el próximo paso.
          </p>
          <div className="mt-4">
            <UploadSesionMateria />
          </div>
          <textarea
            className="mt-4 w-full rounded-lg border border-clever-sand bg-white px-3 py-2 text-sm"
            rows={6}
            placeholder="O pegá acá las notas de la clase…"
          />
          <button
            type="button"
            className="mt-4 rounded-lg bg-clever-skyDeep px-4 py-2 text-sm font-medium text-white hover:bg-[#4d92b3]"
          >
            Generar resumen
          </button>
        </section>

        <section className="rounded-xl border border-dashed border-clever-sand bg-clever-cream p-5">
          <h3 className="text-sm font-medium text-clever-ink">Resumen de la IA</h3>
          <p className="mt-2 text-sm text-clever-muted">
            Todavía no hay sesiones guardadas para esta materia.
          </p>
        </section>
      </div>

      <aside>
        <TemporizadorPomodoro />
      </aside>
    </main>
  );
}
