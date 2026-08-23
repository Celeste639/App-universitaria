"use client";

export const AVISO_ANALISIS_LISTO =
  "Clever ya analizó tu plan. Revisá correlativas y marcá lo que ya cursaste o aprobaste.";

export async function pedirPermisoNotificaciones(): Promise<void> {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

export function notificarAnalisisListo(): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  try {
    new Notification("Clever", {
      body: AVISO_ANALISIS_LISTO,
      lang: "es",
    });
  } catch {
    // Algunos navegadores bloquean Notification sin service worker.
  }
}
