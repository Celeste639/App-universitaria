import type { DragEvent } from "react";
import {
  esArchivoDePlan,
  inferirTipoDocumento,
  MAX_ARCHIVOS_PLAN,
  MAX_BYTES_ARCHIVO,
  MAX_BYTES_TOTAL,
  MB_POR_ARCHIVO,
} from "@/lib/documentos";
import type { TipoDocumentoPlan } from "@/lib/types";

export type ArchivoCargado = {
  id: string;
  file: File;
  tipo: TipoDocumentoPlan;
  relativePath: string;
};

type WebkitEntry = {
  isFile: boolean;
  isDirectory: boolean;
  name: string;
  file?: (
    successCallback: (file: File) => void,
    errorCallback?: (error: DOMException) => void,
  ) => void;
  createReader?: () => {
    readEntries: (
      successCallback: (entries: WebkitEntry[]) => void,
      errorCallback?: (error: DOMException) => void,
    ) => void;
  };
};

function nuevoId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function archivoDesdeFile(file: File, relativePath?: string): ArchivoCargado {
  const path =
    relativePath ||
    (typeof file.webkitRelativePath === "string" && file.webkitRelativePath.length > 0
      ? file.webkitRelativePath
      : file.name);

  return {
    id: nuevoId(),
    file,
    tipo: inferirTipoDocumento(path),
    relativePath: path,
  };
}

async function leerDirectorio(reader: {
  readEntries: (
    successCallback: (entries: WebkitEntry[]) => void,
    errorCallback?: (error: DOMException) => void,
  ) => void;
}): Promise<WebkitEntry[]> {
  const acumulado: WebkitEntry[] = [];

  for (;;) {
    const lote = await new Promise<WebkitEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (lote.length === 0) break;
    acumulado.push(...lote);
  }

  return acumulado;
}

async function archivosDesdeEntry(
  entry: WebkitEntry,
  prefix = "",
): Promise<File[]> {
  if (entry.name.startsWith(".")) return [];

  const path = prefix ? `${prefix}/${entry.name}` : entry.name;

  if (entry.isFile && entry.file) {
    const file = await new Promise<File>((resolve, reject) => {
      entry.file!(resolve, reject);
    });
    if (!esArchivoDePlan(file) || file.size > MAX_BYTES_ARCHIVO) return [];
    try {
      Object.defineProperty(file, "webkitRelativePath", {
        value: path,
        configurable: true,
      });
    } catch {
      // Si el File no admite el path relativo, usamos file.name.
    }
    return [file];
  }

  if (entry.isDirectory && entry.createReader) {
    const hijos = await leerDirectorio(entry.createReader());
    const anidados = await Promise.all(
      hijos.map((hijo) => archivosDesdeEntry(hijo, path)),
    );
    return anidados.flat();
  }

  return [];
}

export async function archivosDesdeDrop(event: DragEvent): Promise<File[]> {
  const items = event.dataTransfer?.items;
  if (items && items.length > 0) {
    const entradas = Array.from(items)
      .map((item) => {
        const conWebkit = item as DataTransferItem & {
          webkitGetAsEntry?: () => FileSystemEntry | null;
        };
        return conWebkit.webkitGetAsEntry?.() ?? null;
      })
      .filter((entry): entry is FileSystemEntry => entry !== null);

    if (entradas.length > 0) {
      const grupos = await Promise.all(
        entradas.map((entry) => archivosDesdeEntry(entry as unknown as WebkitEntry)),
      );
      return grupos.flat();
    }
  }

  return Array.from(event.dataTransfer?.files ?? []).filter(esArchivoDePlan);
}

export function fusionarArchivos(
  actuales: ArchivoCargado[],
  nuevos: File[],
  opciones?: { maxArchivos?: number },
): { archivos: ArchivoCargado[]; error: string | null } {
  const maxArchivos = opciones?.maxArchivos ?? MAX_ARCHIVOS_PLAN;
  const fusionados = [...actuales];

  for (const file of nuevos) {
    if (!esArchivoDePlan(file)) continue;
    if (file.size > MAX_BYTES_ARCHIVO) {
      return {
        archivos: actuales,
        error: `${file.name} pesa más de ${MB_POR_ARCHIVO} MB. Subí una versión más liviana.`,
      };
    }

    const path =
      typeof file.webkitRelativePath === "string" && file.webkitRelativePath.length > 0
        ? file.webkitRelativePath
        : file.name;

    const duplicado = fusionados.some(
      (item) =>
        item.relativePath === path &&
        item.file.size === file.size &&
        item.file.lastModified === file.lastModified,
    );
    if (duplicado) continue;

    fusionados.push(archivoDesdeFile(file, path));
  }

  const totalBytes = fusionados.reduce((suma, item) => suma + item.file.size, 0);
  if (totalBytes > MAX_BYTES_TOTAL) {
    return {
      archivos: actuales,
      error: `El conjunto pesa más de ${Math.round(MAX_BYTES_TOTAL / (1024 * 1024))} MB. Subí menos archivos o versiones más livianas.`,
    };
  }

  if (fusionados.length > maxArchivos) {
    return {
      archivos: actuales,
      error: `Podés subir hasta ${maxArchivos} archivos.`,
    };
  }

  return { archivos: fusionados, error: null };
}
