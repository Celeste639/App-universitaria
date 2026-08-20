import { CardMateria } from "@/components/CardMateria";

const EJEMPLO = [
  { nombre: "Química general", codigo: "QUI101", estado: "aprobada" as const },
  {
    nombre: "Introducción a la programación",
    codigo: "INF101",
    estado: "cursando" as const,
  },
  { nombre: "Álgebra I", codigo: "MAT101", estado: "habilitada" as const },
  { nombre: "Física II", codigo: "FIS201", estado: "bloqueada" as const },
];

export default function HistorialPage() {
  const aprobadas = 1;
  const total = EJEMPLO.length;
  const porcentaje = Math.round((aprobadas / total) * 100);

  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Historial de avance
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Porcentaje de la carrera y materias por estado. Los datos reales van a
          salir de <code className="rounded bg-slate-100 px-1">avance_carrera</code>
          .
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Completado</p>
        <p className="mt-1 text-3xl font-semibold">{porcentaje}%</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-indigo-600"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {aprobadas} de {total} materias aprobadas
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {EJEMPLO.map((materia) => (
          <CardMateria
            key={materia.codigo}
            nombre={materia.nombre}
            codigo={materia.codigo}
            estado={materia.estado}
            href={`/materias/${materia.codigo}`}
          />
        ))}
      </section>
    </main>
  );
}
