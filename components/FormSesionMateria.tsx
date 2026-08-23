"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorMessage } from "@/components/ErrorMessage";
import { UploadPlan } from "@/components/UploadPlan";
import { guardarPreferenciasUsuario } from "@/app/actions/preferencias";
import { minutosSegunMetodo } from "@/lib/preferencias";
import type { ArchivoCargado } from "@/lib/recoger-archivos";
import type {
  FormatoSesion,
  MetodoTimer,
  NivelDetalle,
  PreferenciasUsuario,
} from "@/lib/types";

type FormSesionMateriaProps = {
  materiaId: string;
  preferencias: PreferenciasUsuario;
};

export function FormSesionMateria({ materiaId, preferencias }: FormSesionMateriaProps) {
  const router = useRouter();
  const [archivos, setArchivos] = useState<ArchivoCargado[]>([]);
  const [notas, setNotas] = useState("");
  const [formato, setFormato] = useState<FormatoSesion>(preferencias.formato_sesion);
  const [detalle, setDetalle] = useState<NivelDetalle>(preferencias.nivel_detalle);
  const [metodoTimer, setMetodoTimer] = useState<MetodoTimer>(preferencias.metodo_timer);
  const [minutosFoco, setMinutosFoco] = useState(String(preferencias.minutos_foco));
  const [minutosDescanso, setMinutosDescanso] = useState(String(preferencias.minutos_descanso));
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enVivo, setEnVivo] = useState("");

  async function onSubmit() {
    setError(null);
    setEnVivo("");
    if (archivos.length === 0 && notas.trim().length === 0) {
      setError("Subí un PDF o pegá las notas de la clase.");
      return;
    }

    const minutos = minutosSegunMetodo(metodoTimer, Number(minutosFoco), Number(minutosDescanso));
    setEnviando(true);
    const formData = new FormData();
    formData.set("materia_id", materiaId);
    formData.set("notas", notas);
    formData.set("formato", formato);
    formData.set("detalle", detalle);
    formData.set("metodo_timer", metodoTimer);
    formData.set("minutos_foco", String(minutos.foco));
    formData.set("minutos_descanso", String(minutos.descanso));
    for (const item of archivos) {
      formData.append("archivos", item.file);
    }

    try {
      const respuesta = await fetch("/api/sesiones/resumir", {
        method: "POST",
        body: formData,
      });
      if (!respuesta.ok || !respuesta.body) {
        const json = (await respuesta.json().catch(() => null)) as { error?: string } | null;
        setError(json?.error ?? "No pude generar el resumen.");
        return;
      }

      const lector = respuesta.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let texto = "";
      while (true) {
        const { done, value } = await lector.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const bloques = buffer.split("\n\n");
        buffer = bloques.pop() ?? "";
        for (const bloque of bloques) {
          const evento = bloque.match(/^event: (.+)$/m)?.[1];
          const dataLine = bloque.match(/^data: (.+)$/m)?.[1];
          if (!evento || !dataLine) continue;
          const data = JSON.parse(dataLine) as {
            texto?: string;
            error?: string;
            resumen?: string;
          };
          if (evento === "delta" || evento === "parcial") {
            texto += data.texto ?? "";
            setEnVivo(texto);
          }
          if (evento === "done" && data.resumen) {
            texto = data.resumen;
            setEnVivo(data.resumen);
          }
          if (evento === "error") {
            setError(data.error ?? "No pude generar el resumen.");
            return;
          }
        }
      }

      await guardarPreferenciasUsuario({
        formato_sesion: formato,
        nivel_detalle: detalle,
        metodo_timer: metodoTimer,
        minutos_foco: minutos.foco,
        minutos_descanso: minutos.descanso,
      });
      setArchivos([]);
      setNotas("");
      router.refresh();
    } catch {
      setError("Ocurrió un error inesperado. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium">
          Formato
          <select
            value={formato}
            onChange={(event) => setFormato(event.target.value as FormatoSesion)}
            className="mt-1 w-full rounded-lg border border-primary/30 bg-white px-3 py-2 text-sm"
          >
            <option value="bullets">Resumen en viñetas</option>
            <option value="narrativo">Resumen narrativo</option>
            <option value="flashcards">Tarjetas de repaso</option>
            <option value="podcast">Guión de podcast</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Nivel de detalle
          <select
            value={detalle}
            onChange={(event) => setDetalle(event.target.value as NivelDetalle)}
            className="mt-1 w-full rounded-lg border border-primary/30 bg-white px-3 py-2 text-sm"
          >
            <option value="rapido">Rápido (5–7 viñetas)</option>
            <option value="completo">Completo (acotado, con ejemplos)</option>
          </select>
        </label>
        <label className="block text-sm font-medium">
          Timer
          <select
            value={metodoTimer}
            onChange={(event) => setMetodoTimer(event.target.value as MetodoTimer)}
            className="mt-1 w-full rounded-lg border border-primary/30 bg-white px-3 py-2 text-sm"
          >
            <option value="pomodoro">Pomodoro (25/5)</option>
            <option value="profundo">Estudio profundo (50/10)</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>
        {metodoTimer === "custom" && (
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm font-medium">
              Foco (min)
              <input
                type="number"
                min={5}
                max={120}
                value={minutosFoco}
                onChange={(event) => setMinutosFoco(event.target.value)}
                className="mt-1 w-full rounded-lg border border-primary/30 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm font-medium">
              Descanso (min)
              <input
                type="number"
                min={1}
                max={60}
                value={minutosDescanso}
                onChange={(event) => setMinutosDescanso(event.target.value)}
                className="mt-1 w-full rounded-lg border border-primary/30 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
        )}
      </div>
      <UploadPlan
        multiple
        allowFolders
        modo="materia"
        files={archivos}
        onFilesChange={setArchivos}
        disabled={enviando}
      />
      <textarea
        value={notas}
        onChange={(event) => setNotas(event.target.value)}
        disabled={enviando}
        className="w-full rounded-lg border border-primary/30 bg-white px-3 py-2 text-sm"
        rows={4}
        placeholder="Notas de la clase (opcional si ya subiste un PDF). El resumen sale corto."
      />
      {enVivo && (
        <div className="rounded-xl border border-accent/40 bg-white p-4" aria-live="polite">
          <p className="text-xs font-medium text-accent-text">Resumen en vivo</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text">{enVivo}</p>
        </div>
      )}
      {error && <ErrorMessage title="No se pudo generar el resumen" message={error} />}
      <button
        type="button"
        onClick={() => void onSubmit()}
        disabled={enviando}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-text hover:bg-accent hover:text-accent-text disabled:bg-primary/50"
      >
        {enviando ? "Generando resumen…" : "Generar resumen"}
      </button>
    </div>
  );
}
