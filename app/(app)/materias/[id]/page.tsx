import { format } from "date-fns";
import { es } from "date-fns/locale";
import { notFound } from "next/navigation";
import { CardMateria } from "@/components/CardMateria";
import { FormSesionMateria } from "@/components/FormSesionMateria";
import { TemporizadorPomodoro } from "@/components/TemporizadorPomodoro";
import { requireAuthUser } from "@/lib/auth";
import { cargarPlanYAvance, cargarSesionesMateria } from "@/lib/datos";
import { estadoVisualMateria } from "@/lib/plan";

type MateriaPageProps = {
  params: { id: string };
};

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function MateriaPage({ params }: MateriaPageProps) {
  const user = await requireAuthUser();
  const materiaId = decodeURIComponent(params.id);
  const [{ plan, avance }, sesiones] = await Promise.all([
    cargarPlanYAvance(user.id),
    cargarSesionesMateria(user.id, materiaId),
  ]);
  const materia = plan?.materias.find((item) => item.id === materiaId);

  if (!materia || !plan) {
    notFound();
  }

  const estado = avance.get(materia.id) ?? "pendiente";

  return (
    <main className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-6">
        <CardMateria
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
          mostrarSelector
        />

        <section className="rounded-xl border border-clever-sand bg-clever-cream p-5 shadow-sm">
          <h2 className="text-lg font-medium">Sesión de estudio</h2>
          <p className="mt-1 text-sm text-clever-muted">
            Subí uno o varios PDF de la materia (clases de 20+ páginas entran) o
            pegá tus notas. Clever guarda el resumen acá.
          </p>
          <div className="mt-4">
            <FormSesionMateria materiaId={materia.id} />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-clever-ink">Resúmenes guardados</h3>
          {sesiones.length === 0 ? (
            <p className="rounded-xl border border-dashed border-clever-sand bg-clever-cream p-5 text-sm text-clever-muted">
              Todavía no hay sesiones guardadas para esta materia.
            </p>
          ) : (
            sesiones.map((sesion) => (
              <article
                key={sesion.id}
                className="rounded-xl border border-clever-sand bg-clever-cream p-5"
              >
                <p className="text-xs text-clever-muted">
                  {format(new Date(sesion.creado_en), "d MMM yyyy, HH:mm", {
                    locale: es,
                  })}
                </p>
                {sesion.resumen_ia ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-clever-ink">
                    {sesion.resumen_ia}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-clever-muted">Sin resumen.</p>
                )}
              </article>
            ))
          )}
        </section>
      </div>

      <aside>
        <TemporizadorPomodoro />
      </aside>
    </main>
  );
}
