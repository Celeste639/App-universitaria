"use client";

import { useEffect, useMemo, useState } from "react";

const MINUTOS_FOCO = 25;
const MINUTOS_DESCANSO = 5;

function formatTiempo(totalSegundos: number): string {
  const minutos = Math.floor(totalSegundos / 60)
    .toString()
    .padStart(2, "0");
  const segundos = (totalSegundos % 60).toString().padStart(2, "0");
  return `${minutos}:${segundos}`;
}

export function TemporizadorPomodoro() {
  const [enDescanso, setEnDescanso] = useState(false);
  const [segundos, setSegundos] = useState(MINUTOS_FOCO * 60);
  const [corriendo, setCorriendo] = useState(false);

  const total = (enDescanso ? MINUTOS_DESCANSO : MINUTOS_FOCO) * 60;
  const progreso = useMemo(
    () => Math.max(0, Math.min(1, 1 - segundos / total)),
    [segundos, total],
  );

  useEffect(() => {
    if (!corriendo) return;

    const id = window.setInterval(() => {
      setSegundos((actual) => {
        if (actual > 1) return actual - 1;
        const siguienteEsDescanso = !enDescanso;
        setEnDescanso(siguienteEsDescanso);
        return (siguienteEsDescanso ? MINUTOS_DESCANSO : MINUTOS_FOCO) * 60;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [corriendo, enDescanso]);

  function reiniciar() {
    setCorriendo(false);
    setEnDescanso(false);
    setSegundos(MINUTOS_FOCO * 60);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">
        {enDescanso ? "Descanso" : "Foco"} · Pomodoro
      </p>
      <p className="mt-2 font-mono text-4xl font-semibold tracking-tight text-slate-900">
        {formatTiempo(segundos)}
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-indigo-600 transition-[width]"
          style={{ width: `${progreso * 100}%` }}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCorriendo((valor) => !valor)}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          {corriendo ? "Pausar" : "Empezar"}
        </button>
        <button
          type="button"
          onClick={reiniciar}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Reiniciar
        </button>
      </div>
    </section>
  );
}
