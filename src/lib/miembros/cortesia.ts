/*
  CUÁNTO DURA UNA CORTESÍA  ·  puro (12/11/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: «que el administrador pueda otorgar membresías de
  cortesía por el tiempo que él decida […] o directamente en un calendario;
  y conserva las cortesías de los planes normales, anual y mensual». Ese
  mismo día: «dejemos únicamente por días, descarta horas».

  Una cortesía dura:
    · LO DEL PLAN (como siempre: la anual, un año; la mensual, un mes);
    · N días, semanas o meses;
    · o HASTA UNA FECHA elegida en el calendario (ese día incluido).

  Todo se mide en DÍAS COMPLETOS: guarda solo `fecha_fin` (fecha civil),
  igual que una membresía pagada, y vale hasta el final de ese día. Por eso
  la vigencia no cambia en ninguna parte: sigue siendo
  `derivarEstadoMembresia`. NO hay cortesías por horas: se hicieron y el
  propietario las descartó (exigían una columna y una hora exacta en toda la
  aplicación); no las vuelvas a poner sin que las pida.

  La cuenta de días, semanas y meses es la misma que la de un plan
  (`calcularFechaFin`): un mes desde el 12 de noviembre llega al 12 de
  diciembre, igual que la membresía mensual.
*/

import { calcularFechaFin } from './membresias'
import { sumarDiasISO } from '../shared/fecha'

export const UNIDADES_CORTESIA = ['plan', 'dias', 'semanas', 'meses', 'fecha'] as const
export type UnidadCortesia = (typeof UNIDADES_CORTESIA)[number]

type PorCantidad = 'dias' | 'semanas' | 'meses'

export type DuracionCortesia =
  | { unidad: 'plan' }
  | { unidad: PorCantidad; cantidad: number }
  | { unidad: 'fecha'; hasta: string }

/** Lo que se ve en el desplegable. */
export const ETIQUETAS_UNIDAD: Record<UnidadCortesia, string> = {
  plan: 'Lo que dura el plan',
  dias: 'Días',
  semanas: 'Semanas',
  meses: 'Meses',
  fecha: 'Hasta una fecha',
}

/** Topes: una cortesía es un regalo puntual, no una membresía eterna. */
export const MAXIMOS: Record<PorCantidad, number> = {
  dias: 730,
  semanas: 104,
  meses: 24,
}
/** Una fecha del calendario no puede pasar de esto, contado desde que empieza. */
export const MAXIMO_DIAS_FECHA = 730

const SINGULAR: Record<PorCantidad, string> = { dias: 'día', semanas: 'semana', meses: 'mes' }
const PLURAL: Record<PorCantidad, string> = { dias: 'días', semanas: 'semanas', meses: 'meses' }

const FECHA_ISO = /^\d{4}-\d{2}-\d{2}$/

function fechaValida(fecha: string): boolean {
  if (!FECHA_ISO.test(fecha)) return false
  const [y, m, d] = fecha.split('-').map(Number)
  const f = new Date(Date.UTC(y, m - 1, d))
  return f.getUTCFullYear() === y && f.getUTCMonth() === m - 1 && f.getUTCDate() === d
}

function diasEntre(desde: string, hasta: string): number {
  const [ay, am, ad] = desde.split('-').map(Number)
  const [by, bm, bd] = hasta.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000)
}

/** «3 semanas», «1 mes». */
export function textoCantidad(unidad: PorCantidad, cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? SINGULAR[unidad] : PLURAL[unidad]}`
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']

/** «12 nov 2026» de una fecha civil. */
export function fechaCorta(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  return `${d} ${MESES[m - 1]} ${y}`
}

/**
 * Lee la duración de los campos del formulario: `cortesia_duracion`,
 * `cortesia_cantidad` y `cortesia_hasta`. Sin unidad (formularios viejos o
 * sin el bloque) es «lo del plan». `inicio` es el día en que empieza, para
 * comprobar la fecha del calendario.
 */
export function leerDuracionCortesia(
  campos: { duracion?: string | null; cantidad?: string | null; hasta?: string | null },
  inicio: string,
): { ok: true; duracion: DuracionCortesia } | { ok: false; error: string } {
  const unidad = (campos.duracion ?? '').trim() || 'plan'
  if (!(UNIDADES_CORTESIA as readonly string[]).includes(unidad)) {
    return { ok: false, error: 'Elige cuánto dura la cortesía.' }
  }
  if (unidad === 'plan') return { ok: true, duracion: { unidad: 'plan' } }

  if (unidad === 'fecha') {
    const hasta = (campos.hasta ?? '').trim()
    if (!fechaValida(hasta)) return { ok: false, error: 'Elige en el calendario hasta qué día vale la cortesía.' }
    const dias = diasEntre(inicio, hasta)
    if (dias < 0) {
      return { ok: false, error: `La fecha no puede ser anterior al día en que empieza (${fechaCorta(inicio)}).` }
    }
    if (dias > MAXIMO_DIAS_FECHA) return { ok: false, error: 'Una cortesía no puede pasar de dos años.' }
    return { ok: true, duracion: { unidad: 'fecha', hasta } }
  }

  const u = unidad as PorCantidad
  const texto = (campos.cantidad ?? '').trim()
  if (texto === '') return { ok: false, error: `Escribe cuántos ${PLURAL[u]} dura la cortesía.` }
  if (!/^\d+$/.test(texto)) return { ok: false, error: 'Escribe un número entero, sin puntos ni letras.' }
  const cantidad = Number(texto)
  if (cantidad < 1) return { ok: false, error: 'La cortesía tiene que durar al menos 1.' }
  if (cantidad > MAXIMOS[u]) {
    return { ok: false, error: `Como máximo ${textoCantidad(u, MAXIMOS[u])}.` }
  }
  return { ok: true, duracion: { unidad: u, cantidad } }
}

/**
 * El último día de la cortesía ('YYYY-MM-DD', ese día incluido).
 *
 * @param inicio       Día en que empieza: hoy, o el día siguiente al fin de
 *                     la membresía vigente al renovar.
 * @param mesesDelPlan La duración del plan elegido, para «lo del plan».
 */
export function calcularFinCortesia(duracion: DuracionCortesia, inicio: string, mesesDelPlan: number): string {
  switch (duracion.unidad) {
    case 'plan':
      return calcularFechaFin(inicio, mesesDelPlan)
    case 'meses':
      return calcularFechaFin(inicio, duracion.cantidad)
    case 'semanas':
      return sumarDiasISO(inicio, duracion.cantidad * 7)
    case 'dias':
      return sumarDiasISO(inicio, duracion.cantidad)
    case 'fecha':
      return duracion.hasta
  }
}

/** Lo que dice el formulario debajo de la duración. */
export function textoVencimiento(fechaFin: string): string {
  return `Vale hasta el ${fechaCorta(fechaFin)}, ese día incluido.`
}

/**
 * La duración en palabras, para la bitácora: «por 2 semanas», «hasta el 24
 * dic 2026». `null` con «lo del plan» (la bitácora ya nombra el plan).
 */
export function textoDuracionCortesia(duracion: DuracionCortesia): string | null {
  if (duracion.unidad === 'plan') return null
  if (duracion.unidad === 'fecha') return `hasta el ${fechaCorta(duracion.hasta)}`
  return `por ${textoCantidad(duracion.unidad, duracion.cantidad)}`
}
