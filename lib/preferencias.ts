import type { Json } from "@/types/database";
import type {
  FormatoSesion,
  MetodoTimer,
  NivelDetalle,
  PreferenciasUsuario,
  TarjetaDashboard,
  VistaCalendario,
} from "@/lib/types";

export const COLORES_MATERIA = [
  { id: "celeste", hex: "#B6CFDB", label: "Celeste" },
  { id: "azul", hex: "#8AB0C4", label: "Azul" },
  { id: "pizarra", hex: "#2C4A56", label: "Pizarra" },
  { id: "arena", hex: "#F1E2CF", label: "Arena" },
  { id: "tierra", hex: "#5A4A32", label: "Tierra" },
  { id: "verde", hex: "#A9CBA0", label: "Verde" },
  { id: "niebla", hex: "#D5E4EB", label: "Niebla" },
  { id: "grafito", hex: "#444544", label: "Grafito" },
] as const;

export type IdColorMateria = (typeof COLORES_MATERIA)[number]["id"];

export const TARJETAS_DASHBOARD: { id: TarjetaDashboard; etiqueta: string }[] = [
  { id: "porcentaje", etiqueta: "% de la carrera" },
  { id: "proximas_fechas", etiqueta: "Próximas fechas" },
  { id: "prioritarias", etiqueta: "Materias prioritarias" },
  { id: "tiempo_egreso", etiqueta: "Tiempo estimado para recibirte" },
];

export const PREFERENCIAS_DEFAULT: PreferenciasUsuario = {
  formato_sesion: "bullets",
  nivel_detalle: "rapido",
  metodo_timer: "pomodoro",
  minutos_foco: 25,
  minutos_descanso: 5,
  vista_calendario: "week",
  colores_materias: {},
  tarjetas_dashboard: ["porcentaje", "proximas_fechas", "prioritarias", "tiempo_egreso"],
};

const FORMATOS: FormatoSesion[] = ["bullets", "narrativo", "flashcards", "podcast"];
const NIVELES: NivelDetalle[] = ["rapido", "completo"];
const TIMERS: MetodoTimer[] = ["pomodoro", "profundo", "custom"];
const VISTAS: VistaCalendario[] = ["week", "month"];
const TARJETAS: TarjetaDashboard[] = [
  "porcentaje",
  "proximas_fechas",
  "prioritarias",
  "tiempo_egreso",
];
const COLORES = new Set(COLORES_MATERIA.map((item) => item.id));

export function minutosSegunMetodo(
  metodo: MetodoTimer,
  minutosFoco?: number,
  minutosDescanso?: number,
): { foco: number; descanso: number } {
  if (metodo === "pomodoro") return { foco: 25, descanso: 5 };
  if (metodo === "profundo") return { foco: 50, descanso: 10 };
  return {
    foco: limitarMinutos(minutosFoco ?? 25, 5, 120),
    descanso: limitarMinutos(minutosDescanso ?? 5, 1, 60),
  };
}

export function limitarMinutos(valor: number, min: number, max: number): number {
  if (!Number.isFinite(valor)) return min;
  return Math.min(max, Math.max(min, Math.round(valor)));
}

export function hexDeColor(id: string | undefined): string {
  return COLORES_MATERIA.find((item) => item.id === id)?.hex ?? COLORES_MATERIA[0].hex;
}

export function parsePreferencias(raw: unknown): PreferenciasUsuario {
  if (!raw || typeof raw !== "object") return { ...PREFERENCIAS_DEFAULT };
  const fila = raw as Record<string, unknown>;
  const metodo = TIMERS.includes(fila.metodo_timer as MetodoTimer)
    ? (fila.metodo_timer as MetodoTimer)
    : PREFERENCIAS_DEFAULT.metodo_timer;
  const minutos = minutosSegunMetodo(
    metodo,
    typeof fila.minutos_foco === "number" ? fila.minutos_foco : undefined,
    typeof fila.minutos_descanso === "number" ? fila.minutos_descanso : undefined,
  );

  const colores: Record<string, string> = {};
  if (fila.colores_materias && typeof fila.colores_materias === "object") {
    for (const [materiaId, color] of Object.entries(
      fila.colores_materias as Record<string, unknown>,
    )) {
      if (typeof color === "string" && COLORES.has(color as IdColorMateria)) {
        colores[materiaId] = color;
      }
    }
  }

  const tarjetas = Array.isArray(fila.tarjetas_dashboard)
    ? fila.tarjetas_dashboard.filter((id): id is TarjetaDashboard =>
        TARJETAS.includes(id as TarjetaDashboard),
      )
    : [...PREFERENCIAS_DEFAULT.tarjetas_dashboard];

  return {
    formato_sesion: FORMATOS.includes(fila.formato_sesion as FormatoSesion)
      ? (fila.formato_sesion as FormatoSesion)
      : PREFERENCIAS_DEFAULT.formato_sesion,
    nivel_detalle: NIVELES.includes(fila.nivel_detalle as NivelDetalle)
      ? (fila.nivel_detalle as NivelDetalle)
      : PREFERENCIAS_DEFAULT.nivel_detalle,
    metodo_timer: metodo,
    minutos_foco: minutos.foco,
    minutos_descanso: minutos.descanso,
    vista_calendario: VISTAS.includes(fila.vista_calendario as VistaCalendario)
      ? (fila.vista_calendario as VistaCalendario)
      : PREFERENCIAS_DEFAULT.vista_calendario,
    colores_materias: colores,
    tarjetas_dashboard:
      tarjetas.length > 0 ? tarjetas : [...PREFERENCIAS_DEFAULT.tarjetas_dashboard],
  };
}

export function preferenciasComoJson(prefs: PreferenciasUsuario): Json {
  return prefs as unknown as Json;
}

export function esFormatoSesion(valor: string): valor is FormatoSesion {
  return FORMATOS.includes(valor as FormatoSesion);
}

export function esNivelDetalle(valor: string): valor is NivelDetalle {
  return NIVELES.includes(valor as NivelDetalle);
}

export function esMetodoTimer(valor: string): valor is MetodoTimer {
  return TIMERS.includes(valor as MetodoTimer);
}
