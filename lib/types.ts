export type EstadoMateria = "pendiente" | "cursando" | "aprobada";

export type EstadoVisualMateria =
  | "habilitada"
  | "cursando"
  | "aprobada"
  | "bloqueada";

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

export type ResultadoAccion<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
