"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { guardarPreferenciasUsuario } from "@/app/actions/preferencias";
import { TARJETAS_DASHBOARD } from "@/lib/preferencias";
import type {
  EventoCalendario,
  PreferenciasUsuario,
  RankingMateria,
  TarjetaDashboard,
} from "@/lib/types";

type DashboardAvanceProps = {
  porcentaje: number;
  aprobadas: number;
  total: number;
  cuatrimestres: number;
  ranking: RankingMateria[];
  eventos: EventoCalendario[];
  preferencias: PreferenciasUsuario;
};

export function DashboardAvance({
  porcentaje,
  aprobadas,
  total,
  cuatrimestres,
  ranking,
  eventos,
  preferencias,
}: DashboardAvanceProps) {
  const [visibles, setVisibles] = useState<TarjetaDashboard[]>(
    preferencias.tarjetas_dashboard,
  );

  const proximas = useMemo(() => {
    const ahora = Date.now();
    return [...eventos]
      .filter((evento) => new Date(evento.start).getTime() >= ahora)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
      .slice(0, 4);
  }, [eventos]);

  async function toggle(id: TarjetaDashboard) {
    const siguiente = visibles.includes(id)
      ? visibles.filter((item) => item !== id)
      : [...visibles, id];
    const ordenadas = TARJETAS_DASHBOARD.map((item) => item.id).filter((item) =>
      siguiente.includes(item),
    );
    setVisibles(ordenadas);
    await guardarPreferenciasUsuario({ tarjetas_dashboard: ordenadas });
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-medium">Tu avance</h2>
        <fieldset className="flex flex-wrap gap-3 text-xs text-surface-text">
          <legend className="sr-only">Tarjetas visibles</legend>
          {TARJETAS_DASHBOARD.map((tarjeta) => (
            <label key={tarjeta.id} className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={visibles.includes(tarjeta.id)}
                onChange={() => void toggle(tarjeta.id)}
              />
              {tarjeta.etiqueta}
            </label>
          ))}
        </fieldset>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {visibles.includes("porcentaje") && (
          <article className="rounded-xl border border-primary/30 bg-surface p-5">
            <p className="text-sm text-surface-text">Carrera completada</p>
            <p className="mt-1 text-3xl font-semibold">{porcentaje}%</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-primary/30">
              <div className="h-full rounded-full bg-success" style={{ width: `${porcentaje}%` }} />
            </div>
            <p className="mt-2 text-sm text-surface-text">
              {aprobadas} de {total} materias aprobadas
            </p>
          </article>
        )}

        {visibles.includes("tiempo_egreso") && (
          <article className="rounded-xl border border-primary/30 bg-surface p-5">
            <p className="text-sm text-surface-text">Tiempo estimado para recibirte</p>
            <p className="mt-1 text-3xl font-semibold">
              {cuatrimestres === 0 ? "Listo" : `${cuatrimestres} cuatri.`}
            </p>
            <p className="mt-2 text-sm text-surface-text">
              Según tus materias pendientes y cuántas cursás por cuatrimestre.
            </p>
          </article>
        )}

        {visibles.includes("prioritarias") && (
          <article className="rounded-xl border border-primary/30 bg-surface p-5">
            <p className="text-sm text-surface-text">Materias prioritarias</p>
            {ranking.length === 0 ? (
              <p className="mt-2 text-sm">No te quedan materias pendientes.</p>
            ) : (
              <ol className="mt-2 space-y-1 text-sm">
                {ranking.slice(0, 3).map((item, index) => (
                  <li key={item.materia.id}>
                    {index + 1}.{" "}
                    <Link
                      href={`/materias/${encodeURIComponent(item.materia.id)}`}
                      className="font-medium text-primary-text hover:underline"
                    >
                      {item.materia.nombre}
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </article>
        )}

        {visibles.includes("proximas_fechas") && (
          <article className="rounded-xl border border-primary/30 bg-surface p-5">
            <p className="text-sm text-surface-text">Próximas fechas</p>
            {proximas.length === 0 ? (
              <p className="mt-2 text-sm">Todavía no hay eventos próximos en el calendario.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm">
                {proximas.map((evento) => (
                  <li key={evento.id}>
                    <span className="text-surface-text">
                      {format(new Date(evento.start), "d MMM HH:mm", { locale: es })}
                    </span>{" "}
                    {evento.title}
                  </li>
                ))}
              </ul>
            )}
          </article>
        )}
      </div>
    </section>
  );
}
