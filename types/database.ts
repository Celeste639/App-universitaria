export type EstadoMateria =
  | "pendiente"
  | "cursando"
  | "aprobada"
  | "libre"
  | "recursando";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      planes_estudio: {
        Row: {
          id: string;
          user_id: string;
          materias: Json;
          correlativas: Json;
          creado_en: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          materias?: Json;
          correlativas?: Json;
          creado_en?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          materias?: Json;
          correlativas?: Json;
          creado_en?: string;
        };
        Relationships: [];
      };
      perfil_estudiante: {
        Row: {
          user_id: string;
          horas_trabajo: number | null;
          tipo_trabajo: string | null;
          horario_rotativo: boolean;
          otras_actividades: string | null;
          metodo_estudio: string | null;
          materias_por_cuatrimestre: number | null;
          preferencias: Json;
        };
        Insert: {
          user_id: string;
          horas_trabajo?: number | null;
          tipo_trabajo?: string | null;
          horario_rotativo?: boolean;
          otras_actividades?: string | null;
          metodo_estudio?: string | null;
          materias_por_cuatrimestre?: number | null;
          preferencias?: Json;
        };
        Update: {
          user_id?: string;
          horas_trabajo?: number | null;
          tipo_trabajo?: string | null;
          horario_rotativo?: boolean;
          otras_actividades?: string | null;
          metodo_estudio?: string | null;
          materias_por_cuatrimestre?: number | null;
          preferencias?: Json;
        };
        Relationships: [];
      };
      calendario: {
        Row: {
          id: string;
          user_id: string;
          semana: string;
          eventos: Json;
        };
        Insert: {
          id?: string;
          user_id: string;
          semana: string;
          eventos?: Json;
        };
        Update: {
          id?: string;
          user_id?: string;
          semana?: string;
          eventos?: Json;
        };
        Relationships: [];
      };
      sesiones_estudio: {
        Row: {
          id: string;
          user_id: string;
          materia_id: string;
          contenido_original: string | null;
          resumen_ia: string | null;
          formato: string | null;
          nivel_detalle: string | null;
          metodo_timer: string | null;
          minutos_foco: number | null;
          minutos_descanso: number | null;
          creado_en: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          materia_id: string;
          contenido_original?: string | null;
          resumen_ia?: string | null;
          formato?: string | null;
          nivel_detalle?: string | null;
          metodo_timer?: string | null;
          minutos_foco?: number | null;
          minutos_descanso?: number | null;
          creado_en?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          materia_id?: string;
          contenido_original?: string | null;
          resumen_ia?: string | null;
          formato?: string | null;
          nivel_detalle?: string | null;
          metodo_timer?: string | null;
          minutos_foco?: number | null;
          minutos_descanso?: number | null;
          creado_en?: string;
        };
        Relationships: [];
      };
      avance_carrera: {
        Row: {
          user_id: string;
          materia_id: string;
          estado: EstadoMateria;
          nota: number | null;
          fecha: string | null;
          comentario: string | null;
          actualizado_en: string;
        };
        Insert: {
          user_id: string;
          materia_id: string;
          estado?: EstadoMateria;
          nota?: number | null;
          fecha?: string | null;
          comentario?: string | null;
          actualizado_en?: string;
        };
        Update: {
          user_id?: string;
          materia_id?: string;
          estado?: EstadoMateria;
          nota?: number | null;
          fecha?: string | null;
          comentario?: string | null;
          actualizado_en?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      estado_materia: EstadoMateria;
    };
    CompositeTypes: Record<string, never>;
  };
};
