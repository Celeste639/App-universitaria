import type { Correlativa, Materia, RankingMateria } from "@/lib/types";
import { alinearCorrelativas } from "@/lib/correlativas";

type GrafoHabilitacion = Map<string, string[]>;

export function construirGrafoHabilitacion(
  correlativas: Correlativa[],
): GrafoHabilitacion {
  const adj: GrafoHabilitacion = new Map();

  for (const correlativa of correlativas) {
    for (const requisito of correlativa.requiere) {
      const destinos = adj.get(requisito) ?? [];
      if (!destinos.includes(correlativa.materia_id)) {
        destinos.push(correlativa.materia_id);
      }
      adj.set(requisito, destinos);
    }
  }

  return adj;
}

export function materiasDependientes(
  materiaId: string,
  grafo: GrafoHabilitacion,
): { directas: string[]; indirectas: string[] } {
  const directas = [...(grafo.get(materiaId) ?? [])];
  const visitadas = new Set<string>(directas);
  const pila = [...directas];

  while (pila.length > 0) {
    const actual = pila.pop();
    if (!actual) continue;

    for (const siguiente of grafo.get(actual) ?? []) {
      if (visitadas.has(siguiente)) continue;
      visitadas.add(siguiente);
      pila.push(siguiente);
    }
  }

  const indirectas = Array.from(visitadas).filter(
    (id) => !directas.includes(id),
  );
  return { directas, indirectas };
}

export function rankingEstrategico(
  materias: Materia[],
  correlativas: Correlativa[],
  idsNoCursadas: Set<string>,
): RankingMateria[] {
  const correlativasAlineadas = alinearCorrelativas(materias, correlativas);
  const grafo = construirGrafoHabilitacion(correlativasAlineadas);
  const porId = new Map(materias.map((materia) => [materia.id, materia]));

  const ranking = materias
    .filter((materia) => idsNoCursadas.has(materia.id))
    .map((materia) => {
      const { directas, indirectas } = materiasDependientes(materia.id, grafo);
      const futurasDirectas = directas.filter(
        (id) => id !== materia.id && idsNoCursadas.has(id) && porId.has(id),
      );
      const futurasIndirectas = indirectas.filter(
        (id) =>
          id !== materia.id &&
          idsNoCursadas.has(id) &&
          porId.has(id) &&
          !futurasDirectas.includes(id),
      );

      return {
        materia,
        puntaje: futurasDirectas.length + futurasIndirectas.length,
        desbloqueaDirectas: futurasDirectas
          .map((id) => porId.get(id)?.nombre ?? id)
          .sort((a, b) => a.localeCompare(b, "es")),
        desbloqueaIndirectas: futurasIndirectas
          .map((id) => porId.get(id)?.nombre ?? id)
          .sort((a, b) => a.localeCompare(b, "es")),
      } satisfies RankingMateria;
    });

  return ranking.sort((a, b) => {
    if (b.puntaje !== a.puntaje) return b.puntaje - a.puntaje;
    return a.materia.nombre.localeCompare(b.materia.nombre, "es");
  });
}

export function explicarRankingLocal(item: RankingMateria): string {
  if (item.puntaje === 0) {
    return `${item.materia.nombre} no desbloquea otras materias pendientes.`;
  }

  const directas = item.desbloqueaDirectas.join(", ");
  if (item.desbloqueaIndirectas.length === 0) {
    return `Priorizá ${item.materia.nombre} porque desbloquea ${directas}.`;
  }

  const extra = item.desbloqueaIndirectas;
  if (extra.length > 6) {
    return `Priorizá ${item.materia.nombre} porque desbloquea ${directas} y, más adelante, otras ${extra.length} materias en cadena.`;
  }

  return `Priorizá ${item.materia.nombre} porque desbloquea ${directas} y, más adelante, ${extra.join(", ")}.`;
}
