/*
  LAS RESEÑAS EN EL PANEL  ·  qué hay que revisar (29/10/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: un apartado con TODAS las reseñas y de qué
  comercio es cada una, y en la portada una alerta cuando una reseña tiene
  menos de 4 estrellas, «para que se pueda validar».

  Una reseña está POR REVISAR si tiene menos de `UMBRAL_REVISION` estrellas
  y nadie la ha marcado como revisada. Sin la migración de
  `revisada_at` (se aplica a mano), la única señal de que alguien la miró es
  que ORUM la respondió: se usa esa. Puro y probado.
*/

/** Por debajo de esto, la reseña pide que alguien la mire. */
export const UMBRAL_REVISION = 4

export const FILTROS_RESENAS = ['todas', 'por_revisar', 'bajas'] as const
export type FiltroResenas = (typeof FILTROS_RESENAS)[number]

export function leerFiltroResenas(valor: unknown): FiltroResenas {
  return (FILTROS_RESENAS as readonly unknown[]).includes(valor) ? (valor as FiltroResenas) : 'todas'
}

export function esCalificacionBaja(estrellas: number): boolean {
  return estrellas < UMBRAL_REVISION
}

export function necesitaRevision(
  r: { estrellas: number; revisadaAt: string | null; respuestaAdmin: string | null },
  /** ¿Existe la columna `revisada_at`? */
  conRevision: boolean,
): boolean {
  if (!esCalificacionBaja(r.estrellas)) return false
  return conRevision ? r.revisadaAt === null : r.respuestaAdmin === null
}

/** «1 reseña por revisar», «3 reseñas por revisar». */
export function textoPorRevisar(total: number): string {
  return total === 1 ? '1 reseña por revisar' : `${total} reseñas por revisar`
}
