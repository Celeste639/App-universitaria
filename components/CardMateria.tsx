import Link from "next/link";
import type { EstadoVisualMateria } from "@/lib/types";

const ESTILOS: Record<
  EstadoVisualMateria,
  { wrap: string; badge: string; etiqueta: string }
> = {
  habilitada: {
    wrap: "border-emerald-200 bg-emerald-50",
    badge: "bg-emerald-100 text-emerald-800",
    etiqueta: "Habilitada",
  },
  cursando: {
    wrap: "border-sky-200 bg-sky-50",
    badge: "bg-sky-100 text-sky-800",
    etiqueta: "Cursando",
  },
  aprobada: {
    wrap: "border-slate-200 bg-slate-50",
    badge: "bg-slate-200 text-slate-700",
    etiqueta: "Aprobada",
  },
  bloqueada: {
    wrap: "border-slate-200 bg-white opacity-80",
    badge: "bg-amber-100 text-amber-800",
    etiqueta: "Bloqueada",
  },
};

type CardMateriaProps = {
  nombre: string;
  codigo?: string;
  estado: EstadoVisualMateria;
  puntaje?: number;
  explicacion?: string;
  href?: string;
};

export function CardMateria({
  nombre,
  codigo,
  estado,
  puntaje,
  explicacion,
  href,
}: CardMateriaProps) {
  const estilos = ESTILOS[estado];

  const contenido = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          {codigo && (
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {codigo}
            </p>
          )}
          <h3 className="text-base font-semibold text-slate-900">{nombre}</h3>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${estilos.badge}`}
        >
          {estilos.etiqueta}
        </span>
      </div>
      {typeof puntaje === "number" && (
        <p className="mt-3 text-sm text-slate-600">
          Desbloquea {puntaje} materia{puntaje === 1 ? "" : "s"} futura
          {puntaje === 1 ? "" : "s"}
        </p>
      )}
      {explicacion && (
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {explicacion}
        </p>
      )}
    </>
  );

  const className = `block rounded-xl border p-4 shadow-sm ${estilos.wrap}`;

  if (href) {
    return (
      <Link href={href} className={`${className} transition hover:shadow-md`}>
        {contenido}
      </Link>
    );
  }

  return <article className={className}>{contenido}</article>;
}
