/**
 * EL TOP DE COMERCIOS DEL INICIO DEL SOCIO (encargo del 29/10/2026).
 *
 * Dos listas de cinco: los mejor calificados (promedio de reseñas, con un
 * mínimo de reseñas para que una sola de cinco estrellas no mande) y los que
 * más ventas registraron en el último mes. Aquí vive solo la parte pura:
 * cruzar las filas que devuelven `top_comercios_calificados` y
 * `top_comercios_ventas` con el catálogo que el Inicio ya tiene, ordenar,
 * desempatar y dar formato. La consulta y su tolerancia al fallo viven en
 * `top-comercios-datos.ts`.
 *
 * Una fila cuyo comercio no está en el catálogo (oculto o inactivo desde que
 * se cacheó) se descarta: la lista queda más corta, nunca rota.
 */

import type { ComercioVitrina } from '@/lib/publico/datos-publicos'
import { detalleComercio } from '../publico/directorio'

/** Cuántos comercios muestra cada pestaña. */
export const TOPE_TOP = 5
/** Reseñas mínimas para entrar en «Mejor calificados». */
export const MINIMO_RESENAS = 3
/** Ventana de «Más ventas», en días corridos (la aplica la función SQL). */
export const DIAS_VENTAS = 30

export const MENSAJE_VACIO_CALIFICADOS = `Aún no hay comercios con ${MINIMO_RESENAS} reseñas o más.`
export const MENSAJE_VACIO_VENTAS = 'Aún no hay ventas registradas en el último mes.'

/** Lo que devuelve `top_comercios_calificados`. */
export type FilaCalificado = { comercio_id: number; promedio: number; total: number }
/** Lo que devuelve `top_comercios_ventas`. */
export type FilaVentas = { comercio_id: number; ventas: number }

/** Lo mínimo que se necesita saber de un comercio para pintar su fila. */
export type ComercioDelTop = Pick<
  ComercioVitrina,
  'id' | 'nombre' | 'logoUrl' | 'categorias' | 'ciudades'
>

/** Una fila lista para pintar. */
export type ItemTop = {
  /** Posición en la lista, empezando en 1. */
  posicion: number
  comercioId: number
  nombre: string
  logoUrl: string | null
  /** «Gastronomía (Pizzerías) · Bogotá». */
  detalle: string
  /** Lo que se ve a la derecha: «★ 4,9» o «128 ventas». */
  dato: string
  /** Lo que lee el lector de pantalla. */
  datoAccesible: string
}

export type TopComercios = { calificados: ItemTop[]; ventas: ItemTop[] }

const FORMATO_PROMEDIO = new Intl.NumberFormat('es-CO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const FORMATO_ENTERO = new Intl.NumberFormat('es-CO', { useGrouping: true })
/* es-CO no agrupa los millares de cuatro cifras ("1280"): se fuerza el punto. */
const entero = (n: number) =>
  n >= 1000 ? FORMATO_ENTERO.format(n).replace(/[,\s ]/g, '.') : String(n)

const porNombre = (a: ComercioDelTop, b: ComercioDelTop) => a.nombre.localeCompare(b.nombre, 'es-CO')

function pluralizar(n: number, singular: string, plural: string): string {
  return `${entero(n)} ${n === 1 ? singular : plural}`
}

function base(c: ComercioDelTop, posicion: number) {
  return {
    posicion,
    comercioId: c.id,
    nombre: c.nombre,
    logoUrl: c.logoUrl,
    detalle: detalleComercio(c.categorias, c.ciudades),
  }
}

export function armarTopCalificados(
  filas: readonly FilaCalificado[],
  comercios: ReadonlyMap<number, ComercioDelTop>,
): ItemTop[] {
  return filas
    .filter((f) => f.total >= MINIMO_RESENAS && comercios.has(f.comercio_id))
    .sort(
      (a, b) =>
        b.promedio - a.promedio ||
        b.total - a.total ||
        porNombre(comercios.get(a.comercio_id)!, comercios.get(b.comercio_id)!),
    )
    .slice(0, TOPE_TOP)
    .map((f, i) => {
      const promedio = FORMATO_PROMEDIO.format(f.promedio)
      return {
        ...base(comercios.get(f.comercio_id)!, i + 1),
        dato: `★ ${promedio}`,
        datoAccesible: `${promedio} de 5 estrellas, ${pluralizar(f.total, 'reseña', 'reseñas')}`,
      }
    })
}

export function armarTopVentas(
  filas: readonly FilaVentas[],
  comercios: ReadonlyMap<number, ComercioDelTop>,
): ItemTop[] {
  return filas
    .filter((f) => f.ventas > 0 && comercios.has(f.comercio_id))
    .sort(
      (a, b) =>
        b.ventas - a.ventas ||
        porNombre(comercios.get(a.comercio_id)!, comercios.get(b.comercio_id)!),
    )
    .slice(0, TOPE_TOP)
    .map((f, i) => {
      const texto = pluralizar(f.ventas, 'venta', 'ventas')
      return {
        ...base(comercios.get(f.comercio_id)!, i + 1),
        dato: texto,
        datoAccesible: `${texto} en el último mes`,
      }
    })
}

/** ¿Merece existir el bloque? Falso si no hay datos o las dos listas están vacías. */
export function hayTop(top: TopComercios | null): top is TopComercios {
  return top !== null && (top.calificados.length > 0 || top.ventas.length > 0)
}
