import { explicarRankingLocal } from "@/lib/graph";
import type { PerfilEstudiante, RankingMateria } from "@/lib/types";

export function explicarRankingConPerfil(
  ranking: RankingMateria[],
  perfil: PerfilEstudiante | null,
): RankingMateria[] {
  return ranking.map((item) => {
    const base = item.explicacion ?? explicarRankingLocal(item);
    if (!perfil) return { ...item, explicacion: base };

    const extras: string[] = [];
    if (perfil.horario_rotativo) {
      extras.push(
        "Como tu horario es rotativo, revisá disponibilidad con el profesor; puede que necesites presentar constancia laboral.",
      );
    } else if ((perfil.horas_trabajo ?? 0) >= 20) {
      extras.push(
        `Con ${perfil.horas_trabajo} h de trabajo, conviene no saturar la semana y atacar primero lo que más desbloquea.`,
      );
    } else if (perfil.otras_actividades?.trim()) {
      extras.push(
        `Tené en cuenta ${perfil.otras_actividades.trim()} al elegir comisión y bloques de estudio.`,
      );
    }

    return {
      ...item,
      explicacion: extras.length > 0 ? `${base} ${extras.join(" ")}` : base,
    };
  });
}
