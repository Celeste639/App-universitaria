import Link from "next/link";
import { SelectorEstado } from "@/components/SelectorEstado";
import type { EstadoMateria, EstadoVisualMateria } from "@/lib/types";

const ESTILOS: Record<
  EstadoVisualMateria,
  { wrap: string; badge: string; etiqueta: string }
> = {
  habilitada: {
    wrap: "border-clever-skyMid bg-clever-sky",
    badge: "bg-white/80 text-clever-ink",
    etiqueta: "Habilitada",
  },
  cursando: {
    wrap: "border-clever-skyDeep bg-clever-cream",
    badge: "bg-clever-sky text-clever-ink",
    etiqueta: "Cursando",
  },
  aprobada: {
    wrap: "border-clever-sand bg-clever-beige",
    badge: "bg-clever-sand text-clever-ink",
    etiqueta: "Aprobada",
  },
  bloqueada: {
    wrap: "border-clever-sand bg-clever-cream opacity-80",
    badge: "bg-amber-100 text-amber-800",
    etiqueta: "Bloqueada",
  },
};

type CardMateriaProps = {
  materiaId?: string;
  nombre: string;
  codigo?: string;
  estado: EstadoVisualMateria;
  estadoPersistido?: EstadoMateria;
  puntaje?: number;
  explicacion?: string;
  href?: string;
  mostrarSelector?: boolean;
};

export function CardMateria({
  materiaId,
  nombre,
  codigo,
  estado,
  estadoPersistido,
  puntaje,
  explicacion,
  href,
  mostrarSelector = false,
}: CardMateriaProps) {
  const estilos = ESTILOS[estado];

  return (
    <article className={`rounded-xl border p-4 shadow-sm ${estilos.wrap}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {codigo && (
            <p className="text-xs font-medium uppercase tracking-wide text-clever-muted">
              {codigo}
            </p>
          )}
          <h3 className="text-base font-semibold text-clever-ink">{nombre}</h3>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${estilos.badge}`}>
          {estilos.etiqueta}
        </span>
      </div>
      {typeof puntaje === "number" && (
        <p className="mt-3 text-sm text-clever-muted">
          Desbloquea {puntaje} materia{puntaje === 1 ? "" : "s"} futura
          {puntaje === 1 ? "" : "s"}
        </p>
      )}
      {explicacion && (
        <p className="mt-2 text-sm leading-relaxed text-clever-muted">{explicacion}</p>
      )}
      {mostrarSelector && materiaId && estadoPersistido ? (
        <SelectorEstado materiaId={materiaId} estado={estadoPersistido} />
      ) : null}
      {href && (
        <Link
          href={href}
          className="mt-3 inline-block text-sm font-medium text-clever-skyDeep hover:underline"
        >
          Abrir materia
        </Link>
      )}
    </article>
  );
}
