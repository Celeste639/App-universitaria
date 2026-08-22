"use client";

import { useMemo } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type Event as RBCEvent,
} from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import type { EventoCalendario } from "@/lib/types";

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
};

type EventoVista = RBCEvent & { tipo?: string; aviso?: string };

export function CalendarioSemanal({
  eventos = [],
  avisos = [],
  resumen,
}: CalendarioSemanalProps) {
  const eventosVista = useMemo<EventoVista[]>(
    () =>
      eventos.map((evento) => ({
        title: evento.title,
        start: new Date(evento.start),
        end: new Date(evento.end),
        tipo: evento.tipo,
        aviso: evento.aviso,
      })),
    [eventos],
  );

  return (
    <div className="space-y-4">
      {resumen && (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700">
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
      <div className="h-[420px] rounded-xl border border-slate-200 bg-white p-2 sm:h-[560px]">
        <Calendar
          localizer={localizer}
          events={eventosVista}
          culture="es"
          messages={MENSAJES}
          defaultView="week"
          views={["week", "day"]}
          startAccessor="start"
          endAccessor="end"
          popup
        />
      </div>
    </div>
  );
}
