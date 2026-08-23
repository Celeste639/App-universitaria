"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { actualizarEstadoMateria } from "@/app/actions/avance";
import type { EstadoMateria } from "@/lib/types";

type SelectorEstadoProps = {
  materiaId: string;
  estado: EstadoMateria;
};

export function SelectorEstado({ materiaId, estado }: SelectorEstadoProps) {
  const router = useRouter();
  const [valor, setValor] = useState(estado);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setValor(estado);
  }, [estado]);

  function onChange(siguiente: EstadoMateria) {
    const anterior = valor;
    setValor(siguiente);
    setError(null);
    startTransition(async () => {
      const resultado = await actualizarEstadoMateria(materiaId, siguiente);
      if (!resultado.ok) {
        setValor(anterior);
        setError(resultado.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="mt-3">
      <label className="block text-xs font-medium text-clever-muted">
        Tu avance
        <select
          value={valor}
          disabled={pending}
          onChange={(event) => onChange(event.target.value as EstadoMateria)}
          className="mt-1 w-full rounded-lg border border-clever-sand bg-white px-2 py-1.5 text-sm text-clever-ink disabled:opacity-60"
        >
          <option value="pendiente">Pendiente</option>
          <option value="cursando">Cursando</option>
          <option value="aprobada">Aprobada</option>
        </select>
      </label>
      {error && (
        <p className="mt-1 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
