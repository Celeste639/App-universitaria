"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorMessage } from "@/components/ErrorMessage";
import { UploadPlan } from "@/components/UploadPlan";
import { completarOnboarding } from "@/app/actions/plan";
import { notificarAnalisisListo, pedirPermisoNotificaciones } from "@/lib/notificar";
import type { ArchivoCargado } from "@/lib/recoger-archivos";

export function OnboardingForm() {
  const router = useRouter();
  const [archivos, setArchivos] = useState<ArchivoCargado[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);

    if (archivos.length === 0) {
      setError(
        "Subí al menos el plan de estudios. Si no tenés correlativas o cronograma, igual podés continuar.",
      );
      return;
    }

    setEnviando(true);
    await pedirPermisoNotificaciones();

    for (const item of archivos) {
      formData.append("archivos", item.file);
      formData.append("tipos", item.tipo);
    }

    try {
      const resultado = await completarOnboarding(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      setListo(true);
      notificarAnalisisListo();
      router.push("/revisar-plan?analisis=ok");
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Probá de nuevo en unos segundos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(new FormData(event.currentTarget));
      }}
      className="mt-8 space-y-8"
    >
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Documentos de la carrera</h2>
        <p className="text-sm text-surface-text">
          El plan de estudios alcanza para avanzar. Si tenés el PDF de
          correlativas o el cronograma, sumalos — o subí toda la carpeta. Los PDF
          largos (20+ páginas) entran bien. Volver a cargar reemplaza el plan
          anterior.
        </p>
        <UploadPlan
          multiple
          allowFolders
          files={archivos}
          onFilesChange={setArchivos}
          disabled={enviando}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-text">
          Horas de trabajo por semana
          <input
            name="horas_trabajo"
            type="number"
            min={0}
            max={80}
            className="mt-1 w-full rounded-lg border border-primary/30 bg-surface px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium text-text">
          Tipo de trabajo
          <select
            name="tipo_trabajo"
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-primary/30 bg-surface px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Elegí una opción
            </option>
            <option value="no_trabajo">No trabajo</option>
            <option value="part_time">Part time</option>
            <option value="full_time">Full time</option>
            <option value="rotativo">Turnos / rotativo</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm font-medium text-text sm:col-span-2">
          <input
            name="horario_rotativo"
            type="checkbox"
            value="true"
            className="h-4 w-4 rounded border-primary/30"
          />
          Tengo horario rotativo
        </label>
        <label className="block text-sm font-medium text-text sm:col-span-2">
          Otras actividades (entrenamiento, cuidados, etc.)
          <textarea
            name="otras_actividades"
            rows={3}
            className="mt-1 w-full rounded-lg border border-primary/30 bg-surface px-3 py-2 text-sm"
            placeholder="Ej. entreno de 19 a 21, lunes a jueves"
          />
        </label>
        <label className="block text-sm font-medium text-text sm:col-span-2">
          Método de estudio preferido
          <select
            name="metodo_estudio"
            defaultValue="pomodoro"
            className="mt-1 w-full rounded-lg border border-primary/30 bg-surface px-3 py-2 text-sm"
          >
            <option value="pomodoro">Pomodoro</option>
            <option value="bloques_largos">Bloques largos</option>
            <option value="revision_espaciada">Revisión espaciada</option>
          </select>
        </label>
      </section>

      {error && (
        <ErrorMessage title="No pudimos procesar el onboarding" message={error} />
      )}
      {listo && (
        <p className="rounded-xl border border-accent bg-primary px-4 py-3 text-sm text-text" role="status">
          traza ya analizó tu plan. Te avisamos y te llevamos a revisar correlativas.
        </p>
      )}

      <button
        type="submit"
        disabled={enviando || listo}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-text hover:bg-accent hover:text-accent-text disabled:cursor-not-allowed disabled:bg-primary/50 sm:w-auto"
      >
        {enviando ? "Leyendo los documentos con IA…" : listo ? "Análisis listo" : "Guardar y continuar"}
      </button>
    </form>
  );
}
