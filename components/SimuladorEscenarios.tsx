"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { aplicarEscenarioPerfil, compararEscenarios } from "@/app/actions/escenarios";
import { ErrorMessage } from "@/components/ErrorMessage";
import {
  armarResumenEscenario,
  escenariosIguales,
  parametrosDesdePerfil,
  textoComparacionLocal,
  type ParametrosEscenario,
} from "@/lib/escenarios";
import type { Correlativa, Materia, PerfilEstudiante, RankingMateria } from "@/lib/types";

type SimuladorEscenariosProps = {
  materias: Materia[];
  correlativas: Correlativa[];
  idsPendientes: string[];
  perfil: PerfilEstudiante | null;
};

function ListaPrioridad({
  items,
  vacio,
}: {
  items: RankingMateria[];
  vacio: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-surface-text">{vacio}</p>;
  }

  return (
    <ol className="space-y-2">
      {items.map((item, index) => (
        <li key={item.materia.id} className="text-sm">
          <p className="font-medium text-text">
            {index + 1}. {item.materia.nombre}
          </p>
          <p className="text-xs text-surface-text">
            Desbloquea {item.puntaje} materia{item.puntaje === 1 ? "" : "s"}
            {item.explicacion ? ` · ${item.explicacion}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function SimuladorEscenarios({
  materias,
  correlativas,
  idsPendientes,
  perfil,
}: SimuladorEscenariosProps) {
  const router = useRouter();
  const actualParams = useMemo(() => parametrosDesdePerfil(perfil), [perfil]);
  const [simulado, setSimulado] = useState<ParametrosEscenario>(actualParams);
  const [comparacionIa, setComparacionIa] = useState<string | null>(null);
  const [cargandoIa, setCargandoIa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [guardando, startGuardar] = useTransition();

  const actual = useMemo(
    () =>
      armarResumenEscenario(
        materias,
        correlativas,
        idsPendientes,
        perfil,
        actualParams,
      ),
    [actualParams, correlativas, idsPendientes, materias, perfil],
  );

  const proyectado = useMemo(
    () =>
      armarResumenEscenario(
        materias,
        correlativas,
        idsPendientes,
        perfil,
        simulado,
      ),
    [correlativas, idsPendientes, materias, perfil, simulado],
  );

  const sinCambios = escenariosIguales(actualParams, simulado);
  const comparacionLocal = textoComparacionLocal(actual, proyectado);

  useEffect(() => {
    setSimulado(actualParams);
  }, [actualParams]);

  useEffect(() => {
    if (sinCambios) {
      setComparacionIa(null);
      setCargandoIa(false);
      return;
    }

    const ac = new AbortController();
    setCargandoIa(true);
    const timer = window.setTimeout(() => {
      void compararEscenarios({
        materias,
        correlativas,
        idsPendientes,
        perfil,
        actual: actualParams,
        simulado,
      })
        .then((resultado) => {
          if (ac.signal.aborted) return;
          if (resultado.ok) setComparacionIa(resultado.data.comparacion);
        })
        .finally(() => {
          if (!ac.signal.aborted) setCargandoIa(false);
        });
    }, 700);

    return () => {
      ac.abort();
      window.clearTimeout(timer);
    };
  }, [actualParams, correlativas, idsPendientes, materias, perfil, simulado, sinCambios]);

  function aplicar() {
    setError(null);
    setAviso(null);
    startGuardar(async () => {
      const resultado = await aplicarEscenarioPerfil(simulado);
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setAviso("Listo. Este escenario quedó guardado en tu perfil.");
      router.refresh();
    });
  }

  return (
    <section className="space-y-4 rounded-xl border border-primary/30 bg-surface p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-medium">¿Qué pasaría si…?</h2>
        <p className="mt-1 text-sm text-surface-text">
          Probá otra carga de trabajo o de materias. El ranking usa el mismo grafo
          de correlativas; no se guarda nada hasta que lo apliques a tu perfil.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block text-sm font-medium text-text">
          Horas de trabajo por semana
          <input
            type="range"
            min={0}
            max={60}
            value={simulado.horas_trabajo}
            onChange={(event) =>
              setSimulado((prev) => ({
                ...prev,
                horas_trabajo: Number(event.target.value),
              }))
            }
            className="mt-2 w-full accent-primary"
          />
          <span className="mt-1 block text-xs font-normal text-surface-text">
            {simulado.horas_trabajo} h (hoy: {actualParams.horas_trabajo} h)
          </span>
        </label>

        <label className="block text-sm font-medium text-text">
          Materias por cuatrimestre
          <input
            type="number"
            min={1}
            max={8}
            value={simulado.materias_por_cuatrimestre}
            onChange={(event) =>
              setSimulado((prev) => ({
                ...prev,
                materias_por_cuatrimestre: Number(event.target.value) || 1,
              }))
            }
            className="mt-2 w-full rounded-lg border border-primary/30 bg-white px-3 py-2 text-sm"
          />
          <span className="mt-1 block text-xs font-normal text-surface-text">
            Hoy: {actualParams.materias_por_cuatrimestre}
          </span>
        </label>

        <label className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-white px-3 py-3 text-sm font-medium text-text sm:mt-6">
          Horario rotativo
          <button
            type="button"
            role="switch"
            aria-checked={simulado.horario_rotativo}
            onClick={() =>
              setSimulado((prev) => ({
                ...prev,
                horario_rotativo: !prev.horario_rotativo,
              }))
            }
            className={`relative h-6 w-11 rounded-full transition ${
              simulado.horario_rotativo ? "bg-accent" : "bg-primary/40"
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${
                simulado.horario_rotativo ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </label>
      </div>

      <p
        className="rounded-lg border border-accent bg-accent px-4 py-3 text-sm leading-relaxed text-accent-text"
        role="status"
      >
        {cargandoIa ? "traza está comparando los escenarios…" : comparacionIa ?? comparacionLocal}
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-primary/30 bg-white p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-surface-text">
            Escenario actual
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {actual.cuatrimestres} cuatri{actual.cuatrimestres === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-xs text-surface-text">
            {actual.pendientes} pendientes · {actual.parametros.materias_por_cuatrimestre} por
            cuatri · {actual.parametros.horas_trabajo} h de trabajo
            {actual.parametros.horario_rotativo ? " · rotativo" : ""}
          </p>
          <h3 className="mt-4 text-sm font-medium">Próximo cuatrimestre</h3>
          <div className="mt-2">
            <ListaPrioridad
              items={actual.proximoCuatrimestre}
              vacio="No hay materias pendientes."
            />
          </div>
        </article>

        <article className="rounded-lg border border-accent bg-primary/40 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-surface-text">
            Escenario simulado
          </p>
          <p className="mt-1 text-2xl font-semibold">
            {proyectado.cuatrimestres} cuatri{proyectado.cuatrimestres === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-xs text-surface-text">
            {proyectado.pendientes} pendientes · {proyectado.parametros.materias_por_cuatrimestre}{" "}
            por cuatri · {proyectado.parametros.horas_trabajo} h de trabajo
            {proyectado.parametros.horario_rotativo ? " · rotativo" : ""}
          </p>
          <h3 className="mt-4 text-sm font-medium">Próximo cuatrimestre</h3>
          <div className="mt-2">
            <ListaPrioridad
              items={proyectado.proximoCuatrimestre}
              vacio="No hay materias pendientes."
            />
          </div>
        </article>
      </div>

      {error && <ErrorMessage title="No se pudo aplicar el escenario" message={error} />}
      {aviso && (
        <p className="text-sm text-primary-text" role="status">
          {aviso}
        </p>
      )}

      <button
        type="button"
        disabled={sinCambios || guardando}
        onClick={aplicar}
        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-text hover:bg-accent hover:text-accent-text disabled:cursor-not-allowed disabled:bg-primary/50"
      >
        {guardando ? "Guardando…" : "Aplicar este escenario a mi perfil"}
      </button>
    </section>
  );
}
