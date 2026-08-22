"use client";

import { useState } from "react";
import { UploadPlan } from "@/components/UploadPlan";
import type { ArchivoCargado } from "@/lib/recoger-archivos";

export function UploadSesionMateria() {
  const [archivos, setArchivos] = useState<ArchivoCargado[]>([]);

  return (
    <UploadPlan
      multiple
      allowFolders
      modo="materia"
      files={archivos}
      onFilesChange={setArchivos}
    />
  );
}
