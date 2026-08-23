import { format } from "date-fns";
import { es } from "date-fns/locale";
import { notFound } from "next/navigation";
import { CardMateria } from "@/components/CardMateria";
import { FormAvanceMateria } from "@/components/FormAvanceMateria";
import { FormSesionMateria } from "@/components/FormSesionMateria";
import { TemporizadorPomodoro } from "@/components/TemporizadorPomodoro";
import { requireAuthUser } from "@/lib/auth";
import { cargarPlanYAvance, cargarSesionesMateria } from "@/lib/datos";
import { PREFERENCIAS_DEFAULT } from "@/lib/preferencias";
import { estadoVisualMateria } from "@/lib/plan";

type MateriaPageProps = {
  params: { id: string };
};

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function MateriaPage({ params }: MateriaPageProps) {
  const user = await requireAuthUser();
  const materiaId = decodeURIComponent(params.id);
  const [{ plan, avance, registros, perfil }, sesiones] = await Promise.all([
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
          mostrarSelector={false}
        />

        <section className="rounded-xl border border-primary/30 bg-surface p-5 shadow-sm">
          <h2 className="text-lg font-medium">Historial de la materia</h2>
          <p className="mt-1 text-sm text-surface-text">
            Estado, nota, fecha y un comentario personal. La nota es opcional
            (libre o cursando suelen no tenerla).
          </p>
          <div className="mt-4">
            <FormAvanceMateria
              materiaId={materia.id}
              registro={registros.get(materia.id)}
            />
          </div>
        </section>

        <section className="rounded-xl border border-primary/30 bg-surface p-5 shadow-sm">
          <h2 className="text-lg font-medium">Sesión de estudio</h2>
          <p className="mt-1 text-sm text-surface-text">
            Subí un PDF o pegá notas. El resumen queda corto para repasarlo
            mañana — no un apunte largo.
          </p>
          <div className="mt-4">
            <FormSesionMateria
              materiaId={materia.id}
              preferencias={perfil?.preferencias ?? PREFERENCIAS_DEFAULT}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-medium text-text">Resúmenes guardados</h3>
          {sesiones.length === 0 ? (
            <p className="rounded-xl border border-dashed border-primary/30 bg-surface p-5 text-sm text-surface-text">
              Todavía no hay sesiones guardadas para esta materia.
            </p>
          ) : (
            sesiones.map((sesion) => (
              <article
                key={sesion.id}
                className="rounded-xl border border-primary/30 bg-surface p-5"
              >
                <p className="text-xs text-surface-text">
                  {format(new Date(sesion.creado_en), "d MMM yyyy, HH:mm", {
                    locale: es,
                  })}
                </p>
                {sesion.resumen_ia ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text">
                    {sesion.resumen_ia}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-surface-text">Sin resumen.</p>
                )}
              </article>
            ))
          )}
        </section>
      </div>

      <aside>
        <TemporizadorPomodoro
          metodo={perfil?.preferencias.metodo_timer}
          minutosFoco={perfil?.preferencias.minutos_foco}
          minutosDescanso={perfil?.preferencias.minutos_descanso}
        />
      </aside>
    </main>
  );
}
