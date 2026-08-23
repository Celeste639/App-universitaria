import type { Correlativa, Materia } from "@/lib/types";

const STOP = new Set([
  "DE",
  "DEL",
  "LA",
  "EL",
  "LOS",
  "LAS",
  "Y",
  "E",
  "O",
  "U",
  "EN",
  "A",
  "AL",
  "PARA",
  "CON",
  "UN",
  "UNA",
  "UNO",
  "POR",
  "THE",
  "OF",
  "AND",
]);

const ORDINALES = new Set([
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
]);

export function normalizarClave(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

type ClavesNombre = {
  compact: string;
  tokens: string[];
  ordinal: string;
};

function extraerOrdinalFinal(token: string): { stem: string; ordinal: string } {
  const romano = token.match(/^(.*?)(VIII|VII|III|II|IV|IX|VI|V|X|I)$/);
  if (romano && romano[1].length >= 4) {
    return { stem: romano[1], ordinal: romano[2] };
  }
  const numero = token.match(/^(.*?)([0-9]{1,2})$/);
  if (numero && numero[1].length >= 4) {
    return { stem: numero[1], ordinal: numero[2] };
  }
  return { stem: token, ordinal: "" };
}

export function analizarNombre(valor: string): ClavesNombre {
  const nfd = valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  const crudos = nfd.split(/[^A-Z0-9]+/).filter(Boolean);
  let ordinal = "";
  const tokens: string[] = [];

  for (const parte of crudos) {
    if (STOP.has(parte)) continue;
    if (ORDINALES.has(parte) || /^[0-9]{1,2}$/.test(parte)) {
      ordinal = parte;
      continue;
    }
    const { stem, ordinal: cola } = extraerOrdinalFinal(parte);
    tokens.push(stem);
    if (cola && !ordinal) ordinal = cola;
  }

  return { compact: crudos.join(""), tokens, ordinal };
}

function clavesDeMateria(materia: Materia): ClavesNombre[] {
  const lista = [analizarNombre(materia.id), analizarNombre(materia.nombre)];
  if (materia.codigo) lista.push(analizarNombre(materia.codigo));
  return lista;
}

function tokensCoinciden(ref: ClavesNombre, candidata: ClavesNombre): boolean {
  if (ref.tokens.length === 0 || candidata.tokens.length === 0) return false;
  if (ref.ordinal !== candidata.ordinal) return false;

  if (ref.tokens.length === 1) {
    if (ref.ordinal) {
      return candidata.tokens.includes(ref.tokens[0]);
    }
    return candidata.tokens.length === 1 && candidata.tokens[0] === ref.tokens[0];
  }

  return ref.tokens.every((token) => candidata.tokens.includes(token));
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
  if (exactas.length >= 1) return exactas[0].id;

  const ref = analizarNombre(referencia);
  if (ref.tokens.length === 0) return null;

  const parciales = materias.filter((materia) =>
    clavesDeMateria(materia).some((candidata) => tokensCoinciden(ref, candidata)),
  );
  if (parciales.length === 1) return parciales[0].id;

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

/** Evita que un parseo invente "esta materia habilita toda la carrera". */
export function podarRequisitosMasivos(
  correlativas: Correlativa[],
  totalMaterias: number,
): Correlativa[] {
  if (totalMaterias < 8) return correlativas;
  const umbral = Math.max(12, Math.floor(totalMaterias * 0.4));
  const conteo = new Map<string, number>();

  for (const fila of correlativas) {
    for (const requisito of fila.requiere) {
      conteo.set(requisito, (conteo.get(requisito) ?? 0) + 1);
    }
  }

  const explosivos = new Set(
    Array.from(conteo.entries())
      .filter(([, cantidad]) => cantidad > umbral)
      .map(([id]) => id),
  );
  if (explosivos.size === 0) return correlativas;

  return correlativas
    .map((fila) => ({
      ...fila,
      requiere: fila.requiere.filter((id) => !explosivos.has(id)),
    }))
    .filter((fila) => fila.requiere.length > 0);
}
