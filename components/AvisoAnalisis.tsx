"use client";

import { AVISO_ANALISIS_LISTO } from "@/lib/notificar";

export function AvisoAnalisis() {
  return (
    <div
      className="rounded-xl border border-accent bg-accent px-4 py-3 text-sm text-accent-text"
      role="status"
    >
      {AVISO_ANALISIS_LISTO}
    </div>
  );
}
