"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  etiquetaTipoDocumento,
  MAX_ARCHIVOS_MATERIA,
  MAX_ARCHIVOS_PLAN,
  MB_POR_ARCHIVO,
} from "@/lib/documentos";
import {
  archivosDesdeDrop,
  fusionarArchivos,
  type ArchivoCargado,
} from "@/lib/recoger-archivos";
import type { TipoDocumentoPlan } from "@/lib/types";

const TIPOS_ACEPTADOS = ".pdf,image/jpeg,image/png,image/webp,image/gif,text/plain,text/csv";

type UploadPlanProps = {
  onFileSelected?: (file: File) => void;
  files?: ArchivoCargado[];
  onFilesChange?: (files: ArchivoCargado[]) => void;
  multiple?: boolean;
  allowFolders?: boolean;
  disabled?: boolean;
  error?: string | null;
  modo?: "plan" | "materia";
};

export function UploadPlan({
  onFileSelected,
  files = [],
  onFilesChange,
  multiple = false,
  allowFolders = false,
  disabled = false,
  error = null,
  modo = "plan",
}: UploadPlanProps) {
  const inputArchivosRef = useRef<HTMLInputElement>(null);
  const inputCarpetaRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const esMateria = modo === "materia";
  const maxArchivos = esMateria ? MAX_ARCHIVOS_MATERIA : MAX_ARCHIVOS_PLAN;
  const mostrarTipo = multiple && !esMateria;

  const agregar = useCallback(
    (nuevos: File[]) => {
      if (nuevos.length === 0) {
        setLocalError("No encontré PDFs o imágenes válidas en lo que subiste.");
        return;
      }

      if (!multiple) {
        const primero = nuevos[0];
        setLocalError(null);
        setFileName(primero.name);
        onFileSelected?.(primero);
        onFilesChange?.(fusionarArchivos([], [primero]).archivos);
        return;
      }

      const resultado = fusionarArchivos(files, nuevos, { maxArchivos });
      setLocalError(resultado.error);
      if (!resultado.error) {
        onFilesChange?.(resultado.archivos);
      }
    },
    [files, maxArchivos, multiple, onFileSelected, onFilesChange],
  );

  useEffect(() => {
    const input = inputCarpetaRef.current;
    if (!input) return;
    input.setAttribute("webkitdirectory", "");
    input.setAttribute("directory", "");
  }, [allowFolders]);

  return (
    <div className="space-y-3">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (disabled) return;
          void archivosDesdeDrop(event).then(agregar);
        }}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
          disabled
            ? "cursor-not-allowed border-clever-sand bg-clever-beige text-clever-muted"
            : isDragging
              ? "border-clever-skyDeep bg-clever-sky text-clever-ink"
              : "border-clever-sand bg-clever-cream text-clever-muted hover:border-clever-skyMid hover:bg-clever-sky/50"
        }`}
      >
        <input
          ref={inputArchivosRef}
          type="file"
          accept={TIPOS_ACEPTADOS}
          multiple={multiple}
          className="sr-only"
          disabled={disabled}
          onChange={(event) => {
            agregar(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        {allowFolders && (
          <input
            ref={inputCarpetaRef}
            type="file"
            className="sr-only"
            disabled={disabled}
            multiple
            onChange={(event) => {
              agregar(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
          />
        )}
        <span className="text-sm font-medium">
          {multiple
            ? "Arrastrá archivos o una carpeta, o elegí desde el equipo"
            : fileName
              ? fileName
              : "Arrastrá tu archivo o hacé clic para elegir"}
        </span>
        <span className="mt-1 max-w-md text-xs text-clever-muted">
          {esMateria
            ? `Varios PDF de 20+ páginas están bien. PDF, imagen o txt · hasta ${maxArchivos} archivos · ${MB_POR_ARCHIVO} MB cada uno`
            : multiple
              ? `Plan de estudios (obligatorio). Correlativas y cronograma, si los tenés. PDF, imagen o txt · hasta ${maxArchivos} archivos · ${MB_POR_ARCHIVO} MB cada uno`
              : `PDF o imagen · máximo ${MB_POR_ARCHIVO} MB`}
        </span>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputArchivosRef.current?.click()}
            className="rounded-lg border border-clever-sand bg-clever-cream px-3 py-1.5 text-sm font-medium text-clever-ink hover:bg-clever-sky disabled:opacity-50"
          >
            {multiple ? "Elegir archivos" : "Elegir archivo"}
          </button>
          {allowFolders && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputCarpetaRef.current?.click()}
              className="rounded-lg border border-clever-sand bg-clever-cream px-3 py-1.5 text-sm font-medium text-clever-ink hover:bg-clever-sky disabled:opacity-50"
            >
              Elegir carpeta
            </button>
          )}
        </div>
      </div>

      {multiple && files.length > 0 && (
        <ul className="space-y-2">
          {files.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-lg border border-clever-sand bg-clever-cream px-3 py-2 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-clever-ink">
                  {item.file.name}
                </p>
                {item.relativePath !== item.file.name && (
                  <p className="truncate text-xs text-clever-muted">{item.relativePath}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {mostrarTipo && (
                  <select
                    value={item.tipo}
                    disabled={disabled}
                    onChange={(event) => {
                      const tipo = event.target.value as TipoDocumentoPlan;
                      onFilesChange?.(
                        files.map((archivo) =>
                          archivo.id === item.id ? { ...archivo, tipo } : archivo,
                        ),
                      );
                    }}
                    className="rounded-md border border-clever-sand bg-white px-2 py-1 text-xs text-clever-ink"
                    aria-label={`Tipo de ${item.file.name}`}
                  >
                    <option value="plan">{etiquetaTipoDocumento("plan")}</option>
                    <option value="correlativas">
                      {etiquetaTipoDocumento("correlativas")}
                    </option>
                    <option value="cronograma">
                      {etiquetaTipoDocumento("cronograma")}
                    </option>
                  </select>
                )}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onFilesChange?.(files.filter((archivo) => archivo.id !== item.id))
                  }
                  className="text-xs font-medium text-clever-muted hover:text-red-600"
                >
                  Quitar
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {(localError || error) && (
        <p className="text-sm text-red-600" role="alert">
          {localError ?? error}
        </p>
      )}
    </div>
  );
}
