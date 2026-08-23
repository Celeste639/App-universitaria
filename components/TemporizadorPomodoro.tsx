"use client";

import { useEffect, useMemo, useState } from "react";
import { minutosSegunMetodo } from "@/lib/preferencias";
import type { MetodoTimer } from "@/lib/types";

function formatTiempo(totalSegundos: number): string {
  const minutos = Math.floor(totalSegundos / 60)
    .toString()
    .padStart(2, "0");
  const segundos = (totalSegundos % 60).toString().padStart(2, "0");
  return `${minutos}:${segundos}`;
}

type TemporizadorPomodoroProps = {
  metodo?: MetodoTimer;
  minutosFoco?: number;
  minutosDescanso?: number;
};

export function TemporizadorPomodoro({
  metodo = "pomodoro",
  minutosFoco,
  minutosDescanso,
}: TemporizadorPomodoroProps) {
  const minutos = minutosSegunMetodo(metodo, minutosFoco, minutosDescanso);
  const [enDescanso, setEnDescanso] = useState(false);
  const [segundos, setSegundos] = useState(minutos.foco * 60);
  const [corriendo, setCorriendo] = useState(false);

  useEffect(() => {
    setCorriendo(false);
    setEnDescanso(false);
    setSegundos(minutos.foco * 60);
  }, [minutos.foco, minutos.descanso]);

  const total = (enDescanso ? minutos.descanso : minutos.foco) * 60;
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
        return (siguienteEsDescanso ? minutos.descanso : minutos.foco) * 60;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [corriendo, enDescanso, minutos.descanso, minutos.foco]);

  const etiqueta =
    metodo === "profundo" ? "Estudio profundo" : metodo === "custom" ? "Timer" : "Pomodoro";

  return (
    <section className="rounded-xl border border-primary/30 bg-surface p-5 shadow-sm">
      <p className="text-sm font-medium text-surface-text">
        {enDescanso ? "Descanso" : "Foco"} · {etiqueta}
      </p>
      <p className="mt-2 font-mono text-4xl font-semibold tracking-tight text-text">
        {formatTiempo(segundos)}
      </p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-primary/30">
        <div
          className="h-full rounded-full bg-primary transition-[width]"
          style={{ width: `${progreso * 100}%` }}
        />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCorriendo((valor) => !valor)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-text hover:bg-accent hover:text-accent-text"
        >
          {corriendo ? "Pausar" : "Empezar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setCorriendo(false);
            setEnDescanso(false);
            setSegundos(minutos.foco * 60);
          }}
          className="rounded-lg border border-primary/30 px-4 py-2 text-sm font-medium text-text hover:bg-primary/40"
        >
          Reiniciar
        </button>
      </div>
    </section>
  );
}
