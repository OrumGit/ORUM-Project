/*
  EL CALENDARIO DEL SITIO  ·  puro (12/11/2026)
  ---------------------------------------------------------------------------
  Lo que necesita `SelectorFecha` para pintar un mes y moverse por él. Todo
  son FECHAS CIVILES 'YYYY-MM-DD' calculadas en UTC (CLAUDE.md → «Fechas»):
  un día del calendario no tiene hora, y leerlo en Bogotá lo correría uno.

  La semana empieza el LUNES, como se lee un calendario en Colombia y como
  numera los días el resto del sistema (ISO: lunes = 1 … domingo = 7).
*/

export type Mes = { anio: number; mes: number } // mes: 1–12

const NOMBRES_MES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic']
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']

/** Las iniciales de la cabecera, de lunes a domingo, con su nombre entero para el lector. */
export const CABECERA_SEMANA = DIAS.map((nombre) => ({ corto: nombre.charAt(0).toUpperCase(), nombre }))

function aISO(fecha: Date): string {
  return fecha.toISOString().slice(0, 10)
}

function deISO(fecha: string): Date {
  const [y, m, d] = fecha.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** ¿Es una fecha 'YYYY-MM-DD' que existe? */
export function esFechaValida(fecha: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false
  const [y, m, d] = fecha.split('-').map(Number)
  const f = new Date(Date.UTC(y, m - 1, d))
  return f.getUTCFullYear() === y && f.getUTCMonth() === m - 1 && f.getUTCDate() === d
}

export function mesDe(fecha: string): Mes {
  const [anio, mes] = fecha.split('-').map(Number)
  return { anio, mes }
}

export function sumarMeses({ anio, mes }: Mes, n: number): Mes {
  const total = anio * 12 + (mes - 1) + n
  return { anio: Math.floor(total / 12), mes: (total % 12) + 1 }
}

/** Negativo si `a` va antes que `b`. */
export function compararMeses(a: Mes, b: Mes): number {
  return a.anio * 12 + a.mes - (b.anio * 12 + b.mes)
}

/** «noviembre de 2026». */
export function nombreMes({ anio, mes }: Mes): string {
  return `${NOMBRES_MES[mes - 1]} de ${anio}`
}

/** Suma días a una fecha civil. */
export function moverDias(fecha: string, dias: number): string {
  const f = deISO(fecha)
  f.setUTCDate(f.getUTCDate() + dias)
  return aISO(f)
}

/**
 * Mueve una fecha N meses conservando el día; si no existe en el mes destino
 * (31 → febrero), cae en el último día de ese mes.
 */
export function moverMeses(fecha: string, n: number): string {
  const [, , dia] = fecha.split('-').map(Number)
  const destino = sumarMeses(mesDe(fecha), n)
  const ultimo = new Date(Date.UTC(destino.anio, destino.mes, 0)).getUTCDate()
  return aISO(new Date(Date.UTC(destino.anio, destino.mes - 1, Math.min(dia, ultimo))))
}

/** Día de la semana ISO: lunes = 1 … domingo = 7. */
export function diaSemana(fecha: string): number {
  const d = deISO(fecha).getUTCDay()
  return d === 0 ? 7 : d
}

/**
 * Las semanas del mes, de lunes a domingo. Los huecos antes del día 1 y
 * después del último van en `null`: el calendario no pinta días de otro mes
 * (se leían como elegibles y no lo son de este).
 */
export function semanasDelMes({ anio, mes }: Mes): (string | null)[][] {
  const primero = aISO(new Date(Date.UTC(anio, mes - 1, 1)))
  const dias = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
  const celdas: (string | null)[] = Array.from({ length: diaSemana(primero) - 1 }, () => null)
  for (let d = 0; d < dias; d++) celdas.push(moverDias(primero, d))
  while (celdas.length % 7 !== 0) celdas.push(null)
  const semanas: (string | null)[][] = []
  for (let i = 0; i < celdas.length; i += 7) semanas.push(celdas.slice(i, i + 7))
  return semanas
}

/** ¿Cabe la fecha entre los límites (incluidos)? Sin límite, cabe. */
export function dentroDeLimites(fecha: string, min?: string | null, max?: string | null): boolean {
  return (!min || fecha >= min) && (!max || fecha <= max)
}

/** La fecha llevada dentro de los límites. */
export function acotar(fecha: string, min?: string | null, max?: string | null): string {
  if (min && fecha < min) return min
  if (max && fecha > max) return max
  return fecha
}

/** «24 dic 2026», para el campo. */
export function fechaCorta(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  return `${d} ${MESES_CORTOS[m - 1]} ${y}`
}

/** «jueves, 24 de diciembre de 2026», para el lector de pantalla. */
export function fechaLarga(fecha: string): string {
  const [y, m, d] = fecha.split('-').map(Number)
  return `${DIAS[diaSemana(fecha) - 1]}, ${d} de ${NOMBRES_MES[m - 1]} de ${y}`
}

/**
 * A dónde lleva una tecla dentro de la cuadrícula (o `null` si no es suya):
 * flechas un día o una semana, Inicio/Fin al lunes/domingo, RePág/AvPág un
 * mes (con Mayús, un año). Es el teclado de la cuadrícula de fechas de las
 * pautas de ARIA (APG, «Date Picker Dialog»).
 */
export function fechaPorTecla(fecha: string, tecla: string, mayus = false): string | null {
  switch (tecla) {
    case 'ArrowLeft':
      return moverDias(fecha, -1)
    case 'ArrowRight':
      return moverDias(fecha, 1)
    case 'ArrowUp':
      return moverDias(fecha, -7)
    case 'ArrowDown':
      return moverDias(fecha, 7)
    case 'Home':
      return moverDias(fecha, 1 - diaSemana(fecha))
    case 'End':
      return moverDias(fecha, 7 - diaSemana(fecha))
    case 'PageUp':
      return moverMeses(fecha, mayus ? -12 : -1)
    case 'PageDown':
      return moverMeses(fecha, mayus ? 12 : 1)
    default:
      return null
  }
}
