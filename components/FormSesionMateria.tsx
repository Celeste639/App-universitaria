"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorMessage } from "@/components/ErrorMessage";
import { UploadPlan } from "@/components/UploadPlan";
import { resumirContenidoClase } from "@/app/actions/sesiones";
import type { ArchivoCargado } from "@/lib/recoger-archivos";

type FormSesionMateriaProps = {
  materiaId: string;
};

export function FormSesionMateria({ materiaId }: FormSesionMateriaProps) {
  const router = useRouter();
  const [archivos, setArchivos] = useState<ArchivoCargado[]>([]);
  const [notas, setNotas] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit() {
    setError(null);
    if (archivos.length === 0 && notas.trim().length === 0) {
      setError("Subí un PDF o pegá las notas de la clase.");
      return;
    }

    setEnviando(true);
    const formData = new FormData();
    formData.set("materia_id", materiaId);
    formData.set("notas", notas);
    for (const item of archivos) {
      formData.append("archivos", item.file);
    }

    try {
      const resultado = await resumirContenidoClase(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
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
        className="w-full rounded-lg border border-clever-sand bg-white px-3 py-2 text-sm"
        rows={6}
        placeholder="O pegá acá las notas de la clase…"
      />
      {error && <ErrorMessage title="No se pudo generar el resumen" message={error} />}
      <button
        type="button"
        onClick={() => void onSubmit()}
        disabled={enviando}
        className="rounded-lg bg-clever-skyDeep px-4 py-2 text-sm font-medium text-white hover:bg-[#4d92b3] disabled:bg-clever-skyMid"
      >
        {enviando ? "Leyendo el material con IA…" : "Generar resumen"}
      </button>
    </div>
  );
}
