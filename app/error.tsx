"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Algo salió mal</h1>
      <p className="mt-2 text-sm text-surface-text">
        Probá de nuevo. Si se repite, volvé al inicio.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-text hover:bg-accent hover:text-accent-text"
        >
          Reintentar
        </button>
        <a
          href="/"
          className="rounded-lg border border-primary/40 bg-surface px-4 py-2 text-sm font-medium text-text hover:bg-primary/40"
        >
          Ir al inicio
        </a>
      </div>
    </main>
  );
}
