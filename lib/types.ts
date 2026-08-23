export type EstadoMateria =
  | "pendiente"
  | "cursando"
  | "aprobada"
  | "libre"
  | "recursando";

export type EstadoVisualMateria =
  | "habilitada"
  | "cursando"
  | "aprobada"
  | "bloqueada"
  | "libre"
  | "recursando";

export type FormatoSesion = "bullets" | "narrativo" | "flashcards" | "podcast";
export type NivelDetalle = "rapido" | "completo";
export type MetodoTimer = "pomodoro" | "profundo" | "custom";
export type VistaCalendario = "week" | "month";
export type TarjetaDashboard =
  | "porcentaje"
  | "proximas_fechas"
  | "prioritarias"
  | "tiempo_egreso";

export type PreferenciasUsuario = {
  formato_sesion: FormatoSesion;
  nivel_detalle: NivelDetalle;
  metodo_timer: MetodoTimer;
  minutos_foco: number;
  minutos_descanso: number;
  vista_calendario: VistaCalendario;
  colores_materias: Record<string, string>;
  tarjetas_dashboard: TarjetaDashboard[];
};

export type TipoDocumentoPlan = "plan" | "correlativas" | "cronograma";

export type Materia = {
  id: string;
  nombre: string;
  codigo?: string;
  anio?: number;
  cuatrimestre?: number;
  carga_horaria?: number;
  dia_semana?: string;
  horario?: string;
  comision?: string;
};

export type Correlativa = {
  materia_id: string;
  requiere: string[];
};

export type PlanEstudioParseado = {
  materias: Materia[];
  correlativas: Correlativa[];
};

export type PerfilEstudiante = {
  user_id: string;
  horas_trabajo: number | null;
  tipo_trabajo: string | null;
  horario_rotativo: boolean;
  otras_actividades: string | null;
  metodo_estudio: string | null;
  materias_por_cuatrimestre: number | null;
  preferencias: PreferenciasUsuario;
};

export type TipoEventoCalendario =
  | "estudio"
  | "trabajo"
  | "actividad"
  | "aviso";

export type EventoCalendario = {
  id: string;
  title: string;
  start: string;
  end: string;
  materia_id?: string;
  tipo: TipoEventoCalendario;
  aviso?: string;
};

export type CalendarioGenerado = {
  eventos: EventoCalendario[];
  avisos: string[];
  resumen: string;
};

export type RankingMateria = {
  materia: Materia;
  puntaje: number;
  desbloqueaDirectas: string[];
  desbloqueaIndirectas: string[];
  explicacion?: string;
};

export type SesionEstudio = {
  id: string;
  materia_id: string;
  contenido_original: string | null;
  resumen_ia: string | null;
  formato: FormatoSesion | null;
  nivel_detalle: NivelDetalle | null;
  creado_en: string;
};

export type AvanceMateria = {
  materia_id: string;
  estado: EstadoMateria;
  nota?: number | null;
  fecha?: string | null;
  comentario?: string | null;
  actualizado_en?: string | null;
};

export type ResultadoAccion<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
