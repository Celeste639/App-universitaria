import { CalendarioSemanal } from "@/components/CalendarioSemanal";
import { CardMateria } from "@/components/CardMateria";

export default function DashboardPage() {
  return (
    <main className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-slate-600">
          Acá vas a ver el ranking de materias estratégicas y el calendario
          semanal. Todavía es un esqueleto: lo conectamos a Supabase y Claude en
          el próximo paso.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Materias priorizadas</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <CardMateria
            nombre="Álgebra I"
            codigo="MAT101"
            estado="habilitada"
            puntaje={4}
            explicacion="Priorizá esta materia: desbloquea Análisis I y las correlativas de segundo año."
            href="/materias/MAT101"
          />
          <CardMateria
            nombre="Introducción a la programación"
            codigo="INF101"
            estado="cursando"
            puntaje={3}
            href="/materias/INF101"
          />
          <CardMateria
            nombre="Física II"
            codigo="FIS201"
            estado="bloqueada"
          />
          <CardMateria
            nombre="Química general"
            codigo="QUI101"
            estado="aprobada"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-medium">Calendario semanal</h2>
        <CalendarioSemanal
          avisos={[
            "Si tu trabajo es rotativo, consultá disponibilidad con el profesor y pedí constancia laboral si corresponde.",
          ]}
        />
      </section>
    </main>
  );
}
