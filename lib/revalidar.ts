import { revalidatePath } from "next/cache";

export function revalidarRutasApp(materiaId?: string): void {
  revalidatePath("/dashboard");
  revalidatePath("/historial");
  revalidatePath("/historial/cargar");
  revalidatePath("/revisar-plan");
  if (materiaId) {
    revalidatePath(`/materias/${encodeURIComponent(materiaId)}`);
  } else {
    revalidatePath("/materias", "layout");
  }
}
