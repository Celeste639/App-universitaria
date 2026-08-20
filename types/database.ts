export type EstadoMateria = "pendiente" | "cursando" | "aprobada";

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
        };
        Insert: {
          user_id: string;
          horas_trabajo?: number | null;
          tipo_trabajo?: string | null;
          horario_rotativo?: boolean;
          otras_actividades?: string | null;
          metodo_estudio?: string | null;
        };
        Update: {
          user_id?: string;
          horas_trabajo?: number | null;
          tipo_trabajo?: string | null;
          horario_rotativo?: boolean;
          otras_actividades?: string | null;
          metodo_estudio?: string | null;
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
          creado_en: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          materia_id: string;
          contenido_original?: string | null;
          resumen_ia?: string | null;
          creado_en?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          materia_id?: string;
          contenido_original?: string | null;
          resumen_ia?: string | null;
          creado_en?: string;
        };
        Relationships: [];
      };
      avance_carrera: {
        Row: {
          user_id: string;
          materia_id: string;
          estado: EstadoMateria;
        };
        Insert: {
          user_id: string;
          materia_id: string;
          estado?: EstadoMateria;
        };
        Update: {
          user_id?: string;
          materia_id?: string;
          estado?: EstadoMateria;
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
