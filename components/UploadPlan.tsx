"use client";

import { useCallback, useState } from "react";

const TIPOS_ACEPTADOS = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

type UploadPlanProps = {
  onFileSelected?: (file: File) => void;
  disabled?: boolean;
  error?: string | null;
};

export function UploadPlan({
  onFileSelected,
  disabled = false,
  error = null,
}: UploadPlanProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;

      const esValido =
        TIPOS_ACEPTADOS.includes(file.type) ||
        /\.(pdf|png|jpe?g|webp|heic)$/i.test(file.name);

      if (!esValido) {
        setLocalError("Subí un PDF o una imagen (JPG, PNG, WEBP).");
        setFileName(null);
        return;
      }

      setLocalError(null);
      setFileName(file.name);
      onFileSelected?.(file);
    },
    [onFileSelected],
  );

  return (
    <div className="space-y-2">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          if (!disabled) handleFile(event.dataTransfer.files[0]);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
          disabled
            ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400"
            : isDragging
              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
              : "border-slate-300 bg-white text-slate-600 hover:border-indigo-400 hover:bg-indigo-50/40"
        }`}
      >
        <input
          type="file"
          accept=".pdf,image/jpeg,image/png,image/webp,image/heic"
          className="sr-only"
          disabled={disabled}
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        <span className="text-sm font-medium">
          {fileName
            ? fileName
            : "Arrastrá tu plan de estudios o hacé clic para elegir"}
        </span>
        <span className="mt-1 text-xs text-slate-500">
          PDF o imagen · máximo 10 MB
        </span>
      </label>
      {(localError || error) && (
        <p className="text-sm text-red-600" role="alert">
          {localError ?? error}
        </p>
      )}
    </div>
  );
}
