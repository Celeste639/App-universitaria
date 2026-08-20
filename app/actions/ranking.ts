"use server";

import type { RankingMateria, ResultadoAccion } from "@/lib/types";

export async function explicarRanking(
  ranking: RankingMateria[],
): Promise<ResultadoAccion<RankingMateria[]>> {
  void ranking;
  return {
    ok: false,
    error:
      "Todavía no está conectada la explicación del ranking con Claude.",
  };
}
