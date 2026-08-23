"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { guardarAvanceMateria } from "@/app/actions/avance";
import { ErrorMessage } from "@/components/ErrorMessage";
import { ESTADOS_MATERIA, ETIQUETAS_ESTADO } from "@/lib/estados";
import type { AvanceMateria, EstadoMateria } from "@/lib/types";

type FormAvanceMateriaProps = {
  materiaId: string;
  registro?: AvanceMateria;
};

export function FormAvanceMateria({ materiaId, registro }: FormAvanceMateriaProps) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoMateria>(registro?.estado ?? "pendiente");
  const [nota, setNota] = useState(registro?.nota?.toString() ?? "");
  const [fecha, setFecha] = useState(registro?.fecha ?? "");
  const [comentario, setComentario] = useState(registro?.comentario ?? "");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setOk(false);
    setEnviando(true);
    try {
      const resultado = await guardarAvanceMateria({
        materiaId,
        estado,
        nota: nota.trim() === "" ? null : nota,
        fecha: fecha.trim() === "" ? null : fecha,
        comentario: comentario.trim() === "" ? null : comentario,
      });
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setOk(true);
      router.refresh();
    } catch {
      setError("No pude guardar. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm font-medium">
          Estado
          <select
            value={estado}
            onChange={(event) => setEstado(event.target.value as EstadoMateria)}
            className="mt-1 w-full rounded-lg border border-primary/30 bg-white px-3 py-2 text-sm"
          >
            {ESTADOS_MATERIA.map((item) => (
              <option key={item} value={item}>
                {ETIQUETAS_ESTADO[item]}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium">
          Nota (0 a 10)
          <input
            type="number"
            min={0}
            max={10}
            step="0.01"
            value={nota}
            onChange={(event) => setNota(event.target.value)}
            placeholder="Opcional"
            className="mt-1 w-full rounded-lg border border-primary/30 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-sm font-medium">
          Fecha
          <input
            type="date"
            value={fecha}
            onChange={(event) => setFecha(event.target.value)}
            className="mt-1 w-full rounded-lg border border-primary/30 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Comentario
        <textarea
          value={comentario}
          onChange={(event) => setComentario(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder='Opcional. Ej: "me costó mucho el final".'
          className="mt-1 w-full rounded-lg border border-primary/30 bg-white px-3 py-2 text-sm"
        />
      </label>
      {error && <ErrorMessage title="No se pudo guardar" message={error} />}
      {ok && (
        <p className="text-sm text-success-text" role="status">
          Historial actualizado.
        </p>
      )}
      <button
        type="submit"
        disabled={enviando}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-text hover:bg-accent hover:text-accent-text disabled:bg-primary/50"
      >
        {enviando ? "Guardando…" : "Guardar historial"}
      </button>
    </form>
  );
}
