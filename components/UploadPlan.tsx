"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { etiquetaTipoDocumento } from "@/lib/documentos";
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
};

export function UploadPlan({
  onFileSelected,
  files = [],
  onFilesChange,
  multiple = false,
  allowFolders = false,
  disabled = false,
  error = null,
}: UploadPlanProps) {
  const inputArchivosRef = useRef<HTMLInputElement>(null);
  const inputCarpetaRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

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

      const resultado = fusionarArchivos(files, nuevos);
      setLocalError(resultado.error);
      if (!resultado.error) {
        onFilesChange?.(resultado.archivos);
      }
    },
    [files, multiple, onFileSelected, onFilesChange],
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
            ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
            : isDragging
              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
              : "border-slate-300 bg-white text-slate-600 hover:border-indigo-400 hover:bg-indigo-50/40"
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
        <span className="mt-1 max-w-md text-xs text-slate-500">
          {multiple
            ? "Plan de estudios (obligatorio). Correlativas y cronograma, si los tenés. PDF, imagen o txt · hasta 8 archivos"
            : "PDF o imagen · máximo 10 MB"}
        </span>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputArchivosRef.current?.click()}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {multiple ? "Elegir archivos" : "Elegir archivo"}
          </button>
          {allowFolders && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputCarpetaRef.current?.click()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
              className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">
                  {item.file.name}
                </p>
                {item.relativePath !== item.file.name && (
                  <p className="truncate text-xs text-slate-500">{item.relativePath}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
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
                  className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
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
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() =>
                    onFilesChange?.(files.filter((archivo) => archivo.id !== item.id))
                  }
                  className="text-xs font-medium text-slate-500 hover:text-red-600"
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
