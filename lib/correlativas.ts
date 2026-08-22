import type { Correlativa, Materia } from "@/lib/types";

export function normalizarClave(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function resolverMateriaId(
  referencia: string,
  materias: Materia[],
): string | null {
  const clave = normalizarClave(referencia);
  if (!clave) return null;

  for (const materia of materias) {
    if (normalizarClave(materia.id) === clave) return materia.id;
    if (materia.codigo && normalizarClave(materia.codigo) === clave) {
      return materia.id;
    }
  }

  const exactas = materias.filter(
    (materia) => normalizarClave(materia.nombre) === clave,
  );
  if (exactas.length === 1) return exactas[0].id;
  if (exactas.length > 1) return exactas[0].id;

  if (clave.length >= 8) {
    const parciales = materias.filter((materia) => {
      const nombre = normalizarClave(materia.nombre);
      if (nombre.length < 8) return false;
      return nombre.includes(clave) || clave.includes(nombre);
    });
    if (parciales.length === 1) return parciales[0].id;
  }

  return null;
}

export function alinearCorrelativas(
  materias: Materia[],
  correlativas: Correlativa[],
): Correlativa[] {
  const porMateria = new Map<string, Set<string>>();

  function agregar(materiaId: string, requisitoId: string) {
    if (materiaId === requisitoId) return;
    const set = porMateria.get(materiaId) ?? new Set<string>();
    set.add(requisitoId);
    porMateria.set(materiaId, set);
  }

  for (const correlativa of correlativas) {
    const materiaId = resolverMateriaId(correlativa.materia_id, materias);
    if (!materiaId) continue;
    for (const requisito of correlativa.requiere) {
      const requisitoId = resolverMateriaId(requisito, materias);
      if (requisitoId) agregar(materiaId, requisitoId);
    }
  }

  return Array.from(porMateria.entries()).map(([materia_id, requiere]) => ({
    materia_id,
    requiere: Array.from(requiere),
  }));
}
