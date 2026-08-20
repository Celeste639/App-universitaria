import { CardMateria } from "@/components/CardMateria";
import { TemporizadorPomodoro } from "@/components/TemporizadorPomodoro";
import { UploadPlan } from "@/components/UploadPlan";

type MateriaPageProps = {
  params: { id: string };
};

export default function MateriaPage({ params }: MateriaPageProps) {
  return (
    <main className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="space-y-6">
        <CardMateria
          nombre={`Materia ${params.id}`}
          codigo={params.id}
          estado="cursando"
        />

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-medium">Sesión de estudio</h2>
          <p className="mt-1 text-sm text-slate-600">
            Subí el contenido de una clase (texto o archivo). El resumen con IA se
            conecta en el próximo paso.
          </p>
          <div className="mt-4">
            <UploadPlan />
          </div>
          <textarea
            className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            rows={6}
            placeholder="O pegá acá las notas de la clase…"
          />
          <button
            type="button"
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Generar resumen
          </button>
        </section>

        <section className="rounded-xl border border-dashed border-slate-300 bg-white p-5">
          <h3 className="text-sm font-medium text-slate-700">Resumen de la IA</h3>
          <p className="mt-2 text-sm text-slate-500">
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
