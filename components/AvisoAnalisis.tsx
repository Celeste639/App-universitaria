"use client";

import { AVISO_ANALISIS_LISTO } from "@/lib/notificar";

export function AvisoAnalisis() {
  return (
    <div
      className="rounded-xl border border-clever-skyMid bg-clever-sky px-4 py-3 text-sm text-clever-ink"
      role="status"
    >
      {AVISO_ANALISIS_LISTO}
    </div>
  );
}
