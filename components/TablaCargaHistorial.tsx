"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { guardarHistorialMasivo } from "@/app/actions/avance";
import { prellenarHistorialDesdeArchivo } from "@/app/actions/historial";
import { ErrorMessage } from "@/components/ErrorMessage";
import { UploadPlan } from "@/components/UploadPlan";
import { ESTADOS_MATERIA, ETIQUETAS_ESTADO } from "@/lib/estados";
import type { ArchivoCargado } from "@/lib/recoger-archivos";
import type { AvanceMateria, EstadoMateria, Materia } from "@/lib/types";

type TablaCargaHistorialProps = {
  materias: Materia[];
  registros: AvanceMateria[];
};

type FilaEdicion = {
  materia_id: string;
  estado: EstadoMateria;
  nota: string;
  fecha: string;
  comentario: string;
};

function filaInicial(materiaId: string, registro?: AvanceMateria): FilaEdicion {
  return {
    materia_id: materiaId,
    estado: registro?.estado ?? "pendiente",
    nota: registro?.nota != null ? String(registro.nota) : "",
    fecha: registro?.fecha ?? "",
    comentario: registro?.comentario ?? "",
  };
}

export function TablaCargaHistorial({ materias, registros }: TablaCargaHistorialProps) {
  const router = useRouter();
  const porId = useMemo(
    () => new Map(registros.map((item) => [item.materia_id, item])),
    [registros],
  );
  const [filas, setFilas] = useState<Record<string, FilaEdicion>>(() => {
    const inicial: Record<string, FilaEdicion> = {};
    for (const materia of materias) {
      inicial[materia.id] = filaInicial(materia.id, porId.get(materia.id));
    }
    return inicial;
  });
  const [archivos, setArchivos] = useState<ArchivoCargado[]>([]);
  const [filtro, setFiltro] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [leyendo, setLeyendo] = useState(false);

  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    if (!q) return materias;
    return materias.filter(
      (materia) =>
        materia.nombre.toLowerCase().includes(q) ||
        (materia.codigo ?? "").toLowerCase().includes(q),
    );
  }, [filtro, materias]);

  function patch(materiaId: string, cambios: Partial<FilaEdicion>) {
    setFilas((actual) => ({
      ...actual,
      [materiaId]: { ...actual[materiaId], ...cambios },
    }));
  }

  async function leerHistorial() {
    setError(null);
    setAviso(null);
    if (archivos.length === 0) {
      setError("Subí el PDF o una foto de tu historial académico.");
      return;
    }
    setLeyendo(true);
    const formData = new FormData();
    for (const item of archivos) formData.append("archivos", item.file);
    try {
      const resultado = await prellenarHistorialDesdeArchivo(formData);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setFilas((actual) => {
        const siguiente = { ...actual };
        for (const fila of resultado.data) {
          siguiente[fila.materia_id] = {
            materia_id: fila.materia_id,
            estado: fila.estado,
            nota: fila.nota != null ? String(fila.nota) : "",
            fecha: fila.fecha ?? "",
            comentario: fila.comentario ?? "",
          };
        }
        return siguiente;
      });
      setAviso(
        `Precompleté ${resultado.data.length} materias. Revisá la tabla y confirmá.`,
      );
    } catch {
      setError("No pude leer el archivo. Probá de nuevo.");
    } finally {
      setLeyendo(false);
    }
  }

  async function guardar() {
    setError(null);
    setAviso(null);
    setGuardando(true);
    try {
      const resultado = await guardarHistorialMasivo(
        Object.values(filas).map((fila) => ({
          materia_id: fila.materia_id,
          estado: fila.estado,
          nota: fila.nota.trim() === "" ? null : Number(fila.nota),
          fecha: fila.fecha.trim() === "" ? null : fila.fecha,
          comentario: fila.comentario.trim() === "" ? null : fila.comentario,
        })),
      );
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setAviso(`Guardé ${resultado.data.actualizadas} materias.`);
      router.refresh();
      router.push("/historial");
    } catch {
      setError("No pude guardar el historial. Probá de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-primary/30 bg-surface p-5">
        <h2 className="text-base font-medium">Leer historial académico (opcional)</h2>
        <p className="mt-1 text-sm text-surface-text">
          Subí el PDF o una foto. La IA precompleta la tabla: vos revisás y confirmás.
        </p>
        <div className="mt-4">
          <UploadPlan
            multiple
            modo="materia"
            files={archivos}
            onFilesChange={setArchivos}
            disabled={leyendo || guardando}
          />
        </div>
        <button
          type="button"
          onClick={() => void leerHistorial()}
          disabled={leyendo || guardando}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-text hover:bg-accent hover:text-accent-text disabled:bg-primary/50"
        >
          {leyendo ? "Leyendo el historial…" : "Precompletar tabla"}
        </button>
      </section>

      <label className="block text-sm font-medium">
        Buscar materia
        <input
          type="search"
          value={filtro}
          onChange={(event) => setFiltro(event.target.value)}
          className="mt-1 w-full rounded-lg border border-primary/30 bg-white px-3 py-2 text-sm sm:max-w-md"
        />
      </label>

      {error && <ErrorMessage title="No se pudo continuar" message={error} />}
      {aviso && (
        <p className="text-sm text-primary-text" role="status">
          {aviso}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-primary/30 bg-surface">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-primary/40 text-primary-text">
            <tr>
              <th className="px-3 py-2 font-medium">Materia</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Nota</th>
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Comentario</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((materia) => {
              const fila = filas[materia.id];
              return (
                <tr key={materia.id} className="border-t border-primary/20">
                  <td className="px-3 py-2">
                    <p className="font-medium">{materia.nombre}</p>
                    <p className="text-xs text-surface-text">
                      {materia.codigo ?? materia.id}
                    </p>
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={fila.estado}
                      onChange={(event) =>
                        patch(materia.id, { estado: event.target.value as EstadoMateria })
                      }
                      className="w-36 rounded-lg border border-primary/30 bg-white px-2 py-1.5"
                    >
                      {ESTADOS_MATERIA.map((estado) => (
                        <option key={estado} value={estado}>
                          {ETIQUETAS_ESTADO[estado]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      step="0.01"
                      value={fila.nota}
                      onChange={(event) => patch(materia.id, { nota: event.target.value })}
                      className="w-20 rounded-lg border border-primary/30 bg-white px-2 py-1.5"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={fila.fecha}
                      onChange={(event) => patch(materia.id, { fecha: event.target.value })}
                      className="rounded-lg border border-primary/30 bg-white px-2 py-1.5"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={fila.comentario}
                      onChange={(event) =>
                        patch(materia.id, { comentario: event.target.value })
                      }
                      className="w-48 rounded-lg border border-primary/30 bg-white px-2 py-1.5"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => void guardar()}
        disabled={guardando || leyendo}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-text hover:bg-accent hover:text-accent-text disabled:bg-primary/50"
      >
        {guardando ? "Guardando…" : "Confirmar historial"}
      </button>
    </div>
  );
}
