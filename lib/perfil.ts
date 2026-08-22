import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth";
import type { PerfilEstudiante } from "@/lib/types";

export async function cargarPerfilEstudiante(): Promise<{
  userId: string | null;
  perfil: PerfilEstudiante | null;
}> {
  const user = await getAuthUser();
  if (!user) {
    return { userId: null, perfil: null };
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("perfil_estudiante")
    .select(
      "user_id, horas_trabajo, tipo_trabajo, horario_rotativo, otras_actividades, metodo_estudio",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  return { userId: user.id, perfil: data };
}
