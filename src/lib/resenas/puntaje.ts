/*
  EL PUNTAJE DE LAS RESEÑAS  ·  puro, solo para el panel (11/11/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: «las reseñas en general, con una media, dándole
  al administrador una perspectiva del puntaje que le ponen las personas,
  con una clasificación en estrellas; solo para el portal administrador».

  Tres piezas: cuántas reseñas tiene cada número de estrellas (5 → 1, con su
  porcentaje), la clasificación del promedio en palabras —las mismas del
  selector del socio: Malo · Regular · Bueno · Muy bueno · Excelente— y el
  promedio de cada comercio para la lista.
*/

import { ESTRELLAS_MAX, ESTRELLAS_MIN, etiquetaEstrellas, resumenDeConteos } from './resenas'

export type FilaDistribucion = {
  estrellas: number
  cantidad: number
  /** Sobre el total, entero; 0 sin reseñas. */
  porcentaje: number
}

/**
 * De `conteos` (`conteos[0]` = las de 1 estrella … `conteos[4]` = las de 5)
 * a las filas que se pintan, de 5 a 1 estrellas, como en cualquier tienda.
 */
export function distribucionEstrellas(conteos: readonly number[]): FilaDistribucion[] {
  const total = conteos.reduce((a, b) => a + b, 0)
  const filas: FilaDistribucion[] = []
  for (let n = ESTRELLAS_MAX; n >= ESTRELLAS_MIN; n--) {
    const cantidad = conteos[n - 1] ?? 0
    filas.push({ estrellas: n, cantidad, porcentaje: total > 0 ? Math.round((cantidad / total) * 100) : 0 })
  }
  return filas
}

/** «Muy bueno» para un 4,2; vacío sin promedio. Redondea al entero más cercano. */
export function clasificacionPromedio(promedio: number | null): string {
  if (promedio === null || !Number.isFinite(promedio) || promedio <= 0) return ''
  const n = Math.min(ESTRELLAS_MAX, Math.max(ESTRELLAS_MIN, Math.round(promedio)))
  return etiquetaEstrellas(n)
}

/** Las cinco cuentas (1 → 5) a partir de filas sueltas de estrellas. */
export function conteosDe(estrellas: readonly number[]): number[] {
  const conteos = [0, 0, 0, 0, 0]
  for (const e of estrellas) {
    if (Number.isInteger(e) && e >= ESTRELLAS_MIN && e <= ESTRELLAS_MAX) conteos[e - 1]++
  }
  return conteos
}

export type Calificacion = { total: number; promedio: number | null }

/** El promedio y el total de cada comercio, para la lista del panel. */
export function calificacionPorComercio(
  filas: readonly { comercio_id: number; estrellas: number }[],
): Map<number, Calificacion> {
  const porComercio = new Map<number, number[]>()
  for (const f of filas) {
    const lista = porComercio.get(f.comercio_id) ?? []
    lista.push(f.estrellas)
    porComercio.set(f.comercio_id, lista)
  }
  return new Map([...porComercio].map(([id, lista]) => [id, resumenDeConteos(conteosDe(lista))]))
}
