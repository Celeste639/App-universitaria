import type {
  Correlativa,
  EstadoMateria,
  EstadoVisualMateria,
  Materia,
} from "@/lib/types";
import type { Json } from "@/types/database";

function esRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseMaterias(json: Json): Materia[] {
  if (!Array.isArray(json)) return [];

  return json.flatMap((item) => {
    if (!esRecord(item) || typeof item.id !== "string" || typeof item.nombre !== "string") {
      return [];
    }

    return [
      {
        id: item.id,
        nombre: item.nombre,
        codigo: typeof item.codigo === "string" ? item.codigo : undefined,
        anio: typeof item.anio === "number" ? item.anio : undefined,
        cuatrimestre:
          typeof item.cuatrimestre === "number" ? item.cuatrimestre : undefined,
        carga_horaria:
          typeof item.carga_horaria === "number" ? item.carga_horaria : undefined,
        dia_semana: typeof item.dia_semana === "string" ? item.dia_semana : undefined,
        horario: typeof item.horario === "string" ? item.horario : undefined,
        comision: typeof item.comision === "string" ? item.comision : undefined,
      },
    ];
  });
}

export function parseCorrelativas(json: Json): Correlativa[] {
  if (!Array.isArray(json)) return [];

  return json.flatMap((item) => {
    if (!esRecord(item) || typeof item.materia_id !== "string" || !Array.isArray(item.requiere)) {
      return [];
    }

    return [
      {
        materia_id: item.materia_id,
        requiere: item.requiere.filter((id): id is string => typeof id === "string"),
      },
    ];
  });
}

export function estadoVisualMateria(
  materiaId: string,
  estado: EstadoMateria,
  correlativas: Correlativa[],
  porEstado: Map<string, EstadoMateria>,
): EstadoVisualMateria {
  if (estado === "aprobada") return "aprobada";
  if (estado === "cursando") return "cursando";

  const requisitos =
    correlativas.find((item) => item.materia_id === materiaId)?.requiere ?? [];
  const faltan = requisitos.filter((id) => porEstado.get(id) !== "aprobada");
  return faltan.length === 0 ? "habilitada" : "bloqueada";
}
