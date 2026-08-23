"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ErrorMessage } from "@/components/ErrorMessage";
import { guardarRevisionPlan } from "@/app/actions/avance";
import { construirGrafoHabilitacion } from "@/lib/graph";
import type { AvanceMateria, Correlativa, EstadoMateria, Materia } from "@/lib/types";

type EditorPlanProps = {
  materias: Materia[];
  correlativas: Correlativa[];
  avance: AvanceMateria[];
  redirigirAlDashboard?: boolean;
};

function nombreDe(materias: Materia[], id: string): string {
  return materias.find((materia) => materia.id === id)?.nombre ?? id;
}

export function EditorPlan({
  materias,
  correlativas,
  avance,
  redirigirAlDashboard = false,
}: EditorPlanProps) {
  const router = useRouter();
  const [requiere, setRequiere] = useState<Record<string, string[]>>(() => {
    const inicial: Record<string, string[]> = {};
    for (const materia of materias) inicial[materia.id] = [];
    for (const fila of correlativas) {
      inicial[fila.materia_id] = [...fila.requiere];
    }
    return inicial;
  });
  const [estados, setEstados] = useState<Record<string, EstadoMateria>>(() => {
    const inicial: Record<string, EstadoMateria> = {};
    for (const materia of materias) inicial[materia.id] = "pendiente";
    for (const fila of avance) inicial[fila.materia_id] = fila.estado;
    return inicial;
  });
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const grafo = useMemo(() => {
    const filas = Object.entries(requiere).map(([materia_id, reqs]) => ({
      materia_id,
      requiere: reqs,
    }));
    return construirGrafoHabilitacion(filas);
  }, [requiere]);

  const grupos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    const filtradas = materias.filter((materia) => {
      if (!q) return true;
      return (
        materia.nombre.toLowerCase().includes(q) ||
        (materia.codigo ?? "").toLowerCase().includes(q) ||
        materia.id.toLowerCase().includes(q)
      );
    });
    const porAnio = new Map<string, Materia[]>();
    for (const materia of filtradas) {
      const clave = materia.anio ? `Año ${materia.anio}` : "Sin año";
      const lista = porAnio.get(clave) ?? [];
      lista.push(materia);
      porAnio.set(clave, lista);
    }
    return Array.from(porAnio.entries());
  }, [busqueda, materias]);

  function agregarRequisito(materiaId: string, requisitoId: string) {
    if (!requisitoId || requisitoId === materiaId) return;
    setRequiere((actual) => {
      const lista = actual[materiaId] ?? [];
      if (lista.includes(requisitoId)) return actual;
      return { ...actual, [materiaId]: [...lista, requisitoId] };
    });
    setOk(false);
  }

  function quitarRequisito(materiaId: string, requisitoId: string) {
    setRequiere((actual) => ({
      ...actual,
      [materiaId]: (actual[materiaId] ?? []).filter((id) => id !== requisitoId),
    }));
    setOk(false);
  }

  async function guardar() {
    setError(null);
    setOk(false);
    setEnviando(true);
    try {
      const resultado = await guardarRevisionPlan({
        correlativas: Object.entries(requiere).map(([materia_id, reqs]) => ({
          materia_id,
          requiere: reqs,
        })),
        avance: Object.entries(estados).map(([materia_id, estado]) => ({
          materia_id,
          estado,
        })),
      });
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setOk(true);
      router.refresh();
      if (redirigirAlDashboard) {
        router.push("/dashboard");
      }
    } catch {
      setError("No pude guardar. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block flex-1 text-sm font-medium text-text">
          Buscar materia
          <input
            type="search"
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Nombre o código"
            className="mt-1 w-full rounded-lg border border-primary/30 bg-surface px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={() => void guardar()}
          disabled={enviando}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-accent hover:text-accent-text disabled:bg-primary/50"
        >
          {enviando
            ? "Guardando…"
            : redirigirAlDashboard
              ? "Guardar y ver mi semana"
              : "Guardar cambios"}
        </button>
      </div>

      {error && <ErrorMessage title="No se pudo guardar" message={error} />}
      {ok && !redirigirAlDashboard && (
        <p className="rounded-xl border border-primary/40 bg-primary px-4 py-3 text-sm" role="status">
          Listo. El ranking y las materias habilitadas ya usan estas correlativas y tu avance.
        </p>
      )}

      {grupos.map(([anio, lista]) => (
        <section key={anio} className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-surface-text">
            {anio}
          </h2>
          <ul className="space-y-3">
            {lista.map((materia) => {
              const requisitos = requiere[materia.id] ?? [];
              const desbloquea = grafo.get(materia.id) ?? [];
              const opciones = materias.filter(
                (otra) => otra.id !== materia.id && !requisitos.includes(otra.id),
              );
              return (
                <li
                  key={materia.id}
                  className="rounded-xl border border-primary/30 bg-surface p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-surface-text">
                        {materia.codigo ?? materia.id}
                      </p>
                      <h3 className="text-base font-semibold">{materia.nombre}</h3>
                      {desbloquea.length > 0 && (
                        <p className="mt-1 text-xs text-surface-text">
                          Desbloquea:{" "}
                          {desbloquea.map((id) => nombreDe(materias, id)).join(", ")}
                        </p>
                      )}
                    </div>
                    <label className="block text-xs font-medium text-surface-text sm:w-40">
                      Avance
                      <select
                        value={estados[materia.id] ?? "pendiente"}
                        onChange={(event) => {
                          setEstados((actual) => ({
                            ...actual,
                            [materia.id]: event.target.value as EstadoMateria,
                          }));
                          setOk(false);
                        }}
                        className="mt-1 w-full rounded-lg border border-primary/30 bg-white px-2 py-1.5 text-sm text-text"
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="cursando">Cursando</option>
                        <option value="aprobada">Aprobada</option>
                        <option value="libre">Libre</option>
                        <option value="recursando">Recursando</option>
                      </select>
                    </label>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs font-medium text-surface-text">Requiere (correlativas)</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {requisitos.length === 0 && (
                        <span className="text-xs text-surface-text">Ninguna</span>
                      )}
                      {requisitos.map((id) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => quitarRequisito(materia.id, id)}
                          className="rounded-full bg-primary px-2.5 py-1 text-xs text-text hover:bg-primary/50"
                        >
                          {nombreDe(materias, id)} ×
                        </button>
                      ))}
                    </div>
                    {opciones.length > 0 && (
                      <select
                        defaultValue=""
                        key={`${materia.id}-${requisitos.join(",")}`}
                        onChange={(event) => {
                          agregarRequisito(materia.id, event.target.value);
                        }}
                        className="mt-2 w-full rounded-lg border border-primary/30 bg-white px-2 py-1.5 text-sm"
                        aria-label={`Agregar correlativa a ${materia.nombre}`}
                      >
                        <option value="" disabled>
                          Agregar correlativa…
                        </option>
                        {opciones.map((otra) => (
                          <option key={otra.id} value={otra.id}>
                            {otra.nombre}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
