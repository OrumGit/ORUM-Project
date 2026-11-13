/*
  CUÁNTO DURA UNA CORTESÍA  ·  puro (12/11/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: «que el administrador pueda otorgar membresías de
  cortesía por el tiempo que él decida, ya sea horas, semanas, meses o
  directamente en un calendario; y conserva las cortesías de los planes
  normales, anual y mensual».

  Una cortesía dura:
    · LO DEL PLAN (como siempre: la anual, un año; la mensual, un mes);
    · N horas, días, semanas o meses;
    · o HASTA UNA FECHA elegida en el calendario (ese día incluido).

  Las que se miden en días o más guardan solo `fecha_fin` (fecha civil), igual
  que una membresía pagada: vale hasta el final de ese día. La de HORAS
  necesita un instante exacto: guarda además `vence_at` (timestamptz) y su
  `fecha_fin` es el día, en Colombia, en que vence. Toda la vigencia sigue
  pasando por `derivarEstadoMembresia`, que mira `vence_at` cuando lo hay.

  La cuenta de días, semanas y meses es la misma que la de un plan
  (`calcularFechaFin`): un mes desde el 12 de noviembre llega al 12 de
  diciembre, igual que la membresía mensual.
*/

import { calcularFechaFin } from './membresias'
import { sumarDiasISO } from '../shared/fecha'

export const UNIDADES_CORTESIA = ['plan', 'horas', 'dias', 'semanas', 'meses', 'fecha'] as const
export type UnidadCortesia = (typeof UNIDADES_CORTESIA)[number]

export type DuracionCortesia =
  | { unidad: 'plan' }
  | { unidad: 'horas' | 'dias' | 'semanas' | 'meses'; cantidad: number }
  | { unidad: 'fecha'; hasta: string }

/** Lo que se ve en el desplegable. */
export const ETIQUETAS_UNIDAD: Record<UnidadCortesia, string> = {
  plan: 'Lo que dura el plan',
  horas: 'Horas',
  dias: 'Días',
  semanas: 'Semanas',
  meses: 'Meses',
  fecha: 'Hasta una fecha',
}

/** Topes: una cortesía es un regalo puntual, no una membresía eterna. */
export const MAXIMOS: Record<'horas' | 'dias' | 'semanas' | 'meses', number> = {
  horas: 720, // 30 días
  dias: 730,
  semanas: 104,
  meses: 24,
}
/** Una fecha del calendario no puede pasar de esto, contado desde que empieza. */
export const MAXIMO_DIAS_FECHA = 730

const SINGULAR: Record<'horas' | 'dias' | 'semanas' | 'meses', string> = {
  horas: 'hora',
  dias: 'día',
  semanas: 'semana',
  meses: 'mes',
}
const PLURAL: Record<'horas' | 'dias' | 'semanas' | 'meses', string> = {
  horas: 'horas',
  dias: 'días',
  semanas: 'semanas',
  meses: 'meses',
}

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

/** «3 semanas», «1 hora». */
export function textoCantidad(unidad: 'horas' | 'dias' | 'semanas' | 'meses', cantidad: number): string {
  return `${cantidad} ${cantidad === 1 ? SINGULAR[unidad] : PLURAL[unidad]}`
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

  const u = unidad as 'horas' | 'dias' | 'semanas' | 'meses'
  const texto = (campos.cantidad ?? '').trim()
  if (texto === '') return { ok: false, error: `Escribe cuántas ${PLURAL[u]} dura la cortesía.` }
  if (!/^\d+$/.test(texto)) return { ok: false, error: 'Escribe un número entero, sin puntos ni letras.' }
  const cantidad = Number(texto)
  if (cantidad < 1) return { ok: false, error: 'La cortesía tiene que durar al menos 1.' }
  if (cantidad > MAXIMOS[u]) {
    return { ok: false, error: `Como máximo ${textoCantidad(u, MAXIMOS[u])}.` }
  }
  return { ok: true, duracion: { unidad: u, cantidad } }
}

/** Partes de un instante en Colombia (UTC−5, sin horario de verano). */
function partesBogota(instante: Date): { fecha: string; hora: number; minuto: number } {
  const local = new Date(instante.getTime() - 5 * 3_600_000)
  return {
    fecha: local.toISOString().slice(0, 10),
    hora: local.getUTCHours(),
    minuto: local.getUTCMinutes(),
  }
}

/** Medianoche (en Colombia) de una fecha civil, como instante. */
function medianocheBogota(fecha: string): Date {
  return new Date(`${fecha}T00:00:00-05:00`)
}

/**
 * Cuándo termina la cortesía.
 *
 * @param inicio       Día en que empieza ('YYYY-MM-DD'): hoy, o el día
 *                     siguiente al fin de la membresía vigente al renovar.
 * @param ahora        El instante actual (las horas cuentan desde aquí si
 *                     empieza hoy; si empieza otro día, desde su medianoche).
 * @param mesesDelPlan La duración del plan elegido, para «lo del plan».
 */
export function calcularFinCortesia(
  duracion: DuracionCortesia,
  inicio: string,
  ahora: Date,
  mesesDelPlan: number,
): { fechaFin: string; venceAt: string | null } {
  switch (duracion.unidad) {
    case 'plan':
      return { fechaFin: calcularFechaFin(inicio, mesesDelPlan), venceAt: null }
    case 'meses':
      return { fechaFin: calcularFechaFin(inicio, duracion.cantidad), venceAt: null }
    case 'semanas':
      return { fechaFin: sumarDiasISO(inicio, duracion.cantidad * 7), venceAt: null }
    case 'dias':
      return { fechaFin: sumarDiasISO(inicio, duracion.cantidad), venceAt: null }
    case 'fecha':
      return { fechaFin: duracion.hasta, venceAt: null }
    case 'horas': {
      const hoy = partesBogota(ahora).fecha
      const desde = inicio <= hoy ? ahora : medianocheBogota(inicio)
      const vence = new Date(desde.getTime() + duracion.cantidad * 3_600_000)
      return { fechaFin: partesBogota(vence).fecha, venceAt: vence.toISOString() }
    }
  }
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']

/** «12 nov 2026» de una fecha civil. */
export function fechaCorta(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  return `${d} ${MESES[m - 1]} ${y}`
}

/** «6:30 p. m.» de un instante, en Colombia. */
export function horaCorta(instante: Date): string {
  const { hora, minuto } = partesBogota(instante)
  const h12 = hora % 12 === 0 ? 12 : hora % 12
  return `${h12}:${String(minuto).padStart(2, '0')} ${hora < 12 ? 'a. m.' : 'p. m.'}`
}

/**
 * Lo que dice el formulario debajo de la duración: «Vale hasta el 12 dic
 * 2026, ese día incluido.» o, con horas, «Vence el 12 nov 2026 a las 6:30
 * p. m.» (la hora ya acaba en punto: no se añade otro).
 */
export function textoVencimiento(fin: { fechaFin: string; venceAt: string | null }): string {
  if (fin.venceAt) {
    const vence = new Date(fin.venceAt)
    return `Vence el ${fechaCorta(partesBogota(vence).fecha)} a las ${horaCorta(vence)}`
  }
  return `Vale hasta el ${fechaCorta(fin.fechaFin)}, ese día incluido.`
}

/** ¿El error de Supabase es porque falta la columna `vence_at`? */
export function faltaColumnaVenceAt(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false
  return /vence_at/.test(error.message ?? '') || error.code === 'PGRST204'
}

/**
 * La duración en palabras, para la bitácora: «por 5 horas», «hasta el 24 dic
 * 2026». `null` con «lo del plan» (la bitácora ya nombra el plan).
 */
export function textoDuracionCortesia(duracion: DuracionCortesia): string | null {
  if (duracion.unidad === 'plan') return null
  if (duracion.unidad === 'fecha') return `hasta el ${fechaCorta(duracion.hasta)}`
  return `por ${textoCantidad(duracion.unidad, duracion.cantidad)}`
}

/** Lo que dice el panel si se pide una cortesía por horas sin la migración. */
export const MENSAJE_FALTA_MIGRACION_HORAS =
  'Para dar cortesías por horas falta aplicar en Supabase la migración 20261112120000_cortesia_por_horas.sql. Mientras tanto, usa días, semanas, meses o una fecha.'
