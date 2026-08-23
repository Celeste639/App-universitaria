"use client";

import { useMemo, useState } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type Event as RBCEvent,
  type View,
} from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { guardarPreferenciasUsuario } from "@/app/actions/preferencias";
import { COLORES_MATERIA, hexDeColor } from "@/lib/preferencias";
import type { EventoCalendario, Materia, PreferenciasUsuario, VistaCalendario } from "@/lib/types";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date: Date) => startOfWeek(date, { weekStartsOn: 1, locale: es }),
  getDay,
  locales: { es },
});

const MENSAJES = {
  next: "Siguiente",
  previous: "Anterior",
  today: "Hoy",
  month: "Mes",
  week: "Semana",
  day: "Día",
  agenda: "Agenda",
  date: "Fecha",
  time: "Hora",
  event: "Evento",
  noEventsInRange: "No hay eventos en este rango",
  showMore: (total: number) => `+${total} más`,
};

type CalendarioSemanalProps = {
  eventos?: EventoCalendario[];
  avisos?: string[];
  resumen?: string;
  materias?: Materia[];
  preferencias?: PreferenciasUsuario;
};

type EventoVista = RBCEvent & {
  tipo?: string;
  aviso?: string;
  materia_id?: string;
};

export function CalendarioSemanal({
  eventos = [],
  avisos = [],
  resumen,
  materias = [],
  preferencias,
}: CalendarioSemanalProps) {
  const [vista, setVista] = useState<View>(preferencias?.vista_calendario ?? "week");
  const [colores, setColores] = useState<Record<string, string>>(
    preferencias?.colores_materias ?? {},
  );

  const eventosVista = useMemo<EventoVista[]>(
    () =>
      eventos.map((evento) => ({
        title: evento.title,
        start: new Date(evento.start),
        end: new Date(evento.end),
        tipo: evento.tipo,
        aviso: evento.aviso,
        materia_id: evento.materia_id,
      })),
    [eventos],
  );

  const materiasConEvento = useMemo(() => {
    const ids = new Set(
      eventos.map((evento) => evento.materia_id).filter((id): id is string => Boolean(id)),
    );
    const lista = materias.filter((materia) => ids.has(materia.id));
    return lista.length > 0 ? lista : materias.slice(0, 8);
  }, [eventos, materias]);

  async function cambiarVista(siguiente: View) {
    setVista(siguiente);
    if (siguiente === "week" || siguiente === "month") {
      await guardarPreferenciasUsuario({ vista_calendario: siguiente });
    }
  }

  async function cambiarColor(materiaId: string, colorId: string) {
    const siguiente = { ...colores, [materiaId]: colorId };
    setColores(siguiente);
    await guardarPreferenciasUsuario({ colores_materias: siguiente });
  }

  return (
    <div className="space-y-4">
      {resumen && (
        <p className="rounded-lg border border-primary/30 bg-surface px-3 py-2 text-sm leading-relaxed text-text">
          {resumen}
        </p>
      )}
      {avisos.length > 0 && (
        <div className="space-y-2">
          {avisos.map((aviso) => (
            <p
              key={aviso}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              role="status"
            >
              {aviso}
            </p>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void cambiarVista("week")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            vista === "week"
              ? "bg-primary text-primary-text"
              : "border border-primary/30 bg-white text-text"
          }`}
        >
          Semana
        </button>
        <button
          type="button"
          onClick={() => void cambiarVista("month")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            vista === "month"
              ? "bg-primary text-primary-text"
              : "border border-primary/30 bg-white text-text"
          }`}
        >
          Mes
        </button>
      </div>

      {materiasConEvento.length > 0 && (
        <div className="space-y-2 rounded-xl border border-primary/20 bg-white p-3">
          <p className="text-xs font-medium text-surface-text">Color por materia</p>
          <ul className="space-y-2">
            {materiasConEvento.map((materia) => (
              <li key={materia.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="min-w-[8rem] font-medium">{materia.nombre}</span>
                <div className="flex flex-wrap gap-1">
                  {COLORES_MATERIA.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      title={color.label}
                      aria-label={`${materia.nombre}: ${color.label}`}
                      onClick={() => void cambiarColor(materia.id, color.id)}
                      className={`h-6 w-6 rounded-full border ${
                        colores[materia.id] === color.id
                          ? "border-text ring-2 ring-text/30"
                          : "border-black/10"
                      }`}
                      style={{ backgroundColor: color.hex }}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="h-[420px] rounded-xl border border-primary/30 bg-surface p-2 sm:h-[560px]">
        <Calendar
          localizer={localizer}
          events={eventosVista}
          culture="es"
          messages={MENSAJES}
          view={vista}
          onView={(siguiente) => void cambiarVista(siguiente)}
          views={["week", "month", "day"]}
          startAccessor="start"
          endAccessor="end"
          popup
          eventPropGetter={(evento) => {
            const hex = hexDeColor(colores[evento.materia_id ?? ""]);
            return {
              style: {
                backgroundColor: hex,
                borderColor: hex,
                color: "#1E3A47",
              },
            };
          }}
        />
      </div>
    </div>
  );
}
