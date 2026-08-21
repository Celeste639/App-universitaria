"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorMessage } from "@/components/ErrorMessage";
import { UploadPlan } from "@/components/UploadPlan";
import { completarOnboarding } from "@/app/actions/plan";

export function OnboardingForm() {
  const router = useRouter();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(formData: FormData) {
    setError(null);
    setEnviando(true);

    if (archivo) {
      formData.set("plan", archivo);
    }

    try {
      const resultado = await completarOnboarding(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }

      router.push("/dashboard");
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
        <h2 className="text-lg font-medium">Plan de estudios</h2>
        <UploadPlan onFileSelected={setArchivo} disabled={enviando} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          Horas de trabajo por semana
          <input
            name="horas_trabajo"
            type="number"
            min={0}
            max={80}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700">
          Tipo de trabajo
          <select
            name="tipo_trabajo"
            defaultValue=""
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 sm:col-span-2">
          <input
            name="horario_rotativo"
            type="checkbox"
            value="true"
            className="h-4 w-4 rounded border-slate-300"
          />
          Tengo horario rotativo
        </label>
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Otras actividades (entrenamiento, cuidados, etc.)
          <textarea
            name="otras_actividades"
            rows={3}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            placeholder="Ej. entreno de 19 a 21, lunes a jueves"
          />
        </label>
        <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
          Método de estudio preferido
          <select
            name="metodo_estudio"
            defaultValue="pomodoro"
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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

      <button
        type="submit"
        disabled={enviando}
        className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 sm:w-auto"
      >
        {enviando ? "Leyendo el plan con IA…" : "Guardar y continuar"}
      </button>
    </form>
  );
}
