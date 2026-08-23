import { generarCalendarioSemanal } from "@/app/actions/calendario";
import { CalendarioSemanal } from "@/components/CalendarioSemanal";
import { requireAuthUser } from "@/lib/auth";
import { cargarCalendarioSemana } from "@/lib/datos";
import type { RankingMateria } from "@/lib/types";

type CalendarioDashboardProps = {
  ranking: RankingMateria[];
  materias?: import("@/lib/types").Materia[];
  preferencias?: import("@/lib/types").PreferenciasUsuario;
};

export async function CalendarioDashboard({
  ranking,
  materias = [],
  preferencias,
}: CalendarioDashboardProps) {
  const user = await requireAuthUser();
  const cached = await cargarCalendarioSemana(user.id);
  const calendarioResultado = cached
    ? { ok: true as const, data: cached }
    : await generarCalendarioSemanal(ranking);
  const calendario = calendarioResultado.ok
    ? calendarioResultado.data
    : { eventos: [], avisos: [], resumen: "" };

  return (
    <CalendarioSemanal
      eventos={calendario.eventos}
      avisos={calendario.avisos}
      resumen={calendario.resumen}
      materias={materias}
      preferencias={preferencias}
    />
  );
}
