import Link from "next/link";
import { SelectorEstado } from "@/components/SelectorEstado";
import type { EstadoMateria, EstadoVisualMateria } from "@/lib/types";

const ESTILOS: Record<
  EstadoVisualMateria,
  { wrap: string; badge: string; etiqueta: string }
> = {
  habilitada: {
    wrap: "border-primary/40 bg-surface",
    badge: "bg-primary text-primary-text",
    etiqueta: "Habilitada",
  },
  cursando: {
    wrap: "border-primary bg-primary/50",
    badge: "bg-primary text-primary-text",
    etiqueta: "Cursando",
  },
  aprobada: {
    wrap: "border-success bg-success",
    badge: "bg-success text-success-text",
    etiqueta: "Aprobada",
  },
  bloqueada: {
    wrap: "border-primary/20 bg-surface-light opacity-80",
    badge: "bg-surface text-surface-text",
    etiqueta: "Bloqueada",
  },
  libre: {
    wrap: "border-primary/50 bg-surface",
    badge: "bg-primary/70 text-primary-text",
    etiqueta: "Libre",
  },
  recursando: {
    wrap: "border-primary bg-primary/40",
    badge: "bg-primary text-primary-text",
    etiqueta: "Recursando",
  },
};

type CardMateriaProps = {
  materiaId?: string;
  nombre: string;
  codigo?: string;
  estado: EstadoVisualMateria;
  estadoPersistido?: EstadoMateria;
  puntaje?: number;
  directas?: number;
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
  directas,
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
            <p className="text-xs font-medium uppercase tracking-wide text-surface-text">
              {codigo}
            </p>
          )}
          <h3 className="text-base font-semibold text-text">{nombre}</h3>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${estilos.badge}`}>
          {estilos.etiqueta}
        </span>
      </div>
      {typeof puntaje === "number" && (
        <p className="mt-3 text-sm text-surface-text">
          {typeof directas === "number" && directas !== puntaje
            ? `Abre ${directas} materia${directas === 1 ? "" : "s"} de forma directa; en cadena, ${puntaje}.`
            : `Desbloquea ${puntaje} materia${puntaje === 1 ? "" : "s"} futura${puntaje === 1 ? "" : "s"}`}
        </p>
      )}
      {explicacion && (
        <p className="mt-2 text-sm leading-relaxed text-surface-text">{explicacion}</p>
      )}
      {mostrarSelector && materiaId && estadoPersistido ? (
        <SelectorEstado materiaId={materiaId} estado={estadoPersistido} />
      ) : null}
      {href && (
        <Link
          href={href}
          className="mt-3 inline-block text-sm font-medium text-primary-text hover:underline"
        >
          Abrir materia
        </Link>
      )}
    </article>
  );
}
