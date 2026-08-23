import { explicarRankingConPerfil } from "@/lib/explicaciones";
import { rankingEstrategico } from "@/lib/graph";
import { PREFERENCIAS_DEFAULT } from "@/lib/preferencias";
import type {
  Correlativa,
  Materia,
  PerfilEstudiante,
  RankingMateria,
} from "@/lib/types";

export type ParametrosEscenario = {
  horas_trabajo: number;
  materias_por_cuatrimestre: number;
  horario_rotativo: boolean;
};

export type ResumenEscenario = {
  parametros: ParametrosEscenario;
  pendientes: number;
  cuatrimestres: number;
  ranking: RankingMateria[];
  proximoCuatrimestre: RankingMateria[];
};

export function limitarMateriasPorCuatrimestre(valor: number): number {
  if (!Number.isFinite(valor)) return 4;
  return Math.min(8, Math.max(1, Math.round(valor)));
}

export function limitarHorasTrabajo(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.min(80, Math.max(0, Math.round(valor)));
}

export function materiasPorCuatrimestreSugeridas(
  horasTrabajo: number | null | undefined,
  horarioRotativo: boolean,
): number {
  const horas = horasTrabajo ?? 0;
  if (horas >= 35) return 2;
  if (horas >= 20 || horarioRotativo) return 3;
  return 4;
}

export function materiasPorCuatrimestreDesdePerfil(
  perfil: PerfilEstudiante | null,
): number {
  const guardado = perfil?.materias_por_cuatrimestre;
  if (typeof guardado === "number" && guardado > 0) {
    return limitarMateriasPorCuatrimestre(guardado);
  }
  return materiasPorCuatrimestreSugeridas(
    perfil?.horas_trabajo,
    perfil?.horario_rotativo ?? false,
  );
}

export function parametrosDesdePerfil(
  perfil: PerfilEstudiante | null,
): ParametrosEscenario {
  return {
    horas_trabajo: limitarHorasTrabajo(perfil?.horas_trabajo ?? 0),
    materias_por_cuatrimestre: materiasPorCuatrimestreDesdePerfil(perfil),
    horario_rotativo: perfil?.horario_rotativo ?? false,
  };
}

export function estimarCuatrimestres(
  pendientes: number,
  materiasPorCuatrimestre: number,
): number {
  if (pendientes <= 0) return 0;
  return Math.ceil(pendientes / Math.max(1, materiasPorCuatrimestre));
}

export function perfilConParametros(
  base: PerfilEstudiante | null,
  parametros: ParametrosEscenario,
): PerfilEstudiante {
  return {
    user_id: base?.user_id ?? "",
    horas_trabajo: parametros.horas_trabajo,
    tipo_trabajo: base?.tipo_trabajo ?? null,
    horario_rotativo: parametros.horario_rotativo,
    otras_actividades: base?.otras_actividades ?? null,
    metodo_estudio: base?.metodo_estudio ?? null,
    materias_por_cuatrimestre: parametros.materias_por_cuatrimestre,
    preferencias: base?.preferencias ?? { ...PREFERENCIAS_DEFAULT },
  };
}

export function escenariosIguales(
  a: ParametrosEscenario,
  b: ParametrosEscenario,
): boolean {
  return (
    a.horas_trabajo === b.horas_trabajo &&
    a.materias_por_cuatrimestre === b.materias_por_cuatrimestre &&
    a.horario_rotativo === b.horario_rotativo
  );
}

export function rankingParaEscenario(
  materias: Materia[],
  correlativas: Correlativa[],
  idsPendientes: string[],
  perfilBase: PerfilEstudiante | null,
  parametros: ParametrosEscenario,
): RankingMateria[] {
  const ids = new Set(idsPendientes);
  return explicarRankingConPerfil(
    rankingEstrategico(materias, correlativas, ids),
    perfilConParametros(perfilBase, parametros),
  );
}

export function armarResumenEscenario(
  materias: Materia[],
  correlativas: Correlativa[],
  idsPendientes: string[],
  perfilBase: PerfilEstudiante | null,
  parametros: ParametrosEscenario,
): ResumenEscenario {
  const ranking = rankingParaEscenario(
    materias,
    correlativas,
    idsPendientes,
    perfilBase,
    parametros,
  );
  const cupo = limitarMateriasPorCuatrimestre(parametros.materias_por_cuatrimestre);
  return {
    parametros,
    pendientes: idsPendientes.length,
    cuatrimestres: estimarCuatrimestres(idsPendientes.length, cupo),
    ranking,
    proximoCuatrimestre: ranking.slice(0, cupo),
  };
}

export function textoComparacionLocal(
  actual: ResumenEscenario,
  simulado: ResumenEscenario,
): string {
  if (actual.pendientes === 0) {
    return "No te quedan materias pendientes: el escenario no cambia tu egreso.";
  }

  const actualTxt = `Con tu carga actual (${actual.parametros.horas_trabajo} h de trabajo, ${actual.parametros.materias_por_cuatrimestre} materia${actual.parametros.materias_por_cuatrimestre === 1 ? "" : "s"} por cuatrimestre${actual.parametros.horario_rotativo ? ", horario rotativo" : ""}), te recibís en aproximadamente ${actual.cuatrimestres} cuatrimestre${actual.cuatrimestres === 1 ? "" : "s"}.`;

  if (escenariosIguales(actual.parametros, simulado.parametros)) {
    return `${actualTxt} Mové las variables para ver qué pasaría si cambia tu carga.`;
  }

  const deltaMaterias =
    simulado.parametros.materias_por_cuatrimestre -
    actual.parametros.materias_por_cuatrimestre;
  const deltaCuatris = actual.cuatrimestres - simulado.cuatrimestres;

  if (deltaCuatris > 0 && deltaMaterias > 0) {
    return `${actualTxt} Si pasás a ${simulado.parametros.horas_trabajo} h de trabajo, podrías cursar ${deltaMaterias} materia${deltaMaterias === 1 ? "" : "s"} más por cuatrimestre y adelantar tu egreso a ${simulado.cuatrimestres} cuatrimestre${simulado.cuatrimestres === 1 ? "" : "s"}.`;
  }
  if (deltaCuatris > 0) {
    return `${actualTxt} En el escenario simulado tardarías ${simulado.cuatrimestres} cuatrimestre${simulado.cuatrimestres === 1 ? "" : "s"}: adelantás ${deltaCuatris}.`;
  }
  if (deltaCuatris < 0) {
    return `${actualTxt} Con esa carga el egreso se estira a ${simulado.cuatrimestres} cuatrimestres.`;
  }
  return `${actualTxt} El tiempo de egreso se mantiene en ${simulado.cuatrimestres} cuatrimestres, pero cambia lo que conviene priorizar este cuatri.`;
}

export function recorteRankingParaPrompt(ranking: RankingMateria[], limite = 6) {
  return ranking.slice(0, limite).map((item) => ({
    id: item.materia.id,
    nombre: item.materia.nombre,
    puntaje: item.puntaje,
    desbloqueaDirectas: item.desbloqueaDirectas,
    explicacion: item.explicacion ?? null,
  }));
}
