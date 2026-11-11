/*
  EL PERIODO DE UNA CONSULTA DEL PANEL  ·  puro (11/11/2026)
  ---------------------------------------------------------------------------
  Lo comparten las compras de un miembro y las ventas de un comercio: las
  mismas pestañas (Todo · Esta semana · Este mes · Últimos 30 días · Este
  año) y el mismo «entre fechas» (`?desde=&hasta=`).

  TODAS las fechas son días CIVILES de Colombia ('YYYY-MM-DD'): «esta
  semana» empieza el lunes de Bogotá, no el del servidor.
*/

export type Periodo = 'todo' | 'semana' | 'mes' | 'anio' | '30dias' | 'rango'

/** Las pestañas, en su orden. «Entre fechas» se elige con el formulario. */
export const PERIODOS: readonly { clave: Exclude<Periodo, 'rango'>; etiqueta: string }[] = [
  { clave: 'todo', etiqueta: 'Todo' },
  { clave: 'semana', etiqueta: 'Esta semana' },
  { clave: 'mes', etiqueta: 'Este mes' },
  { clave: '30dias', etiqueta: 'Últimos 30 días' },
  { clave: 'anio', etiqueta: 'Este año' },
]

export type RangoPeriodo = {
  periodo: Periodo
  /** Primer día incluido, o `null` = desde el principio. */
  desde: string | null
  /** Último día incluido, o `null` = hasta hoy. */
  hasta: string | null
}

const FECHA = /^\d{4}-\d{2}-\d{2}$/

/** Un 'YYYY-MM-DD' que existe de verdad (no «2026-02-31»). */
export function esFechaCivil(valor: unknown): valor is string {
  if (typeof valor !== 'string' || !FECHA.test(valor)) return false
  const [a, m, d] = valor.split('-').map(Number)
  const f = new Date(Date.UTC(a, m - 1, d))
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d
}

function sumarDias(iso: string, dias: number): string {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10)
}

/** El lunes de la semana de `hoy` (la semana colombiana empieza el lunes). */
function lunesDe(hoy: string): string {
  const [a, m, d] = hoy.split('-').map(Number)
  const diaSemana = new Date(Date.UTC(a, m - 1, d)).getUTCDay() // 0 = domingo
  return sumarDias(hoy, -((diaSemana + 6) % 7))
}

/**
 * El periodo que pide la URL (`?periodo=mes`, o `?desde=&hasta=` para un
 * rango). Es entrada del usuario: lo que no se entienda vuelve a «Todo».
 */
export function leerPeriodo(
  params: { periodo?: string; desde?: string; hasta?: string },
  hoy: string,
): RangoPeriodo {
  const desde = esFechaCivil(params.desde) ? params.desde : null
  const hasta = esFechaCivil(params.hasta) ? params.hasta : null
  if (desde || hasta) {
    // Al revés se entiende igual: se ordenan.
    if (desde && hasta && desde > hasta) return { periodo: 'rango', desde: hasta, hasta: desde }
    return { periodo: 'rango', desde, hasta }
  }

  switch (params.periodo) {
    case 'semana':
      return { periodo: 'semana', desde: lunesDe(hoy), hasta: hoy }
    case 'mes':
      return { periodo: 'mes', desde: `${hoy.slice(0, 8)}01`, hasta: hoy }
    case '30dias':
      return { periodo: '30dias', desde: sumarDias(hoy, -29), hasta: hoy }
    case 'anio':
      return { periodo: 'anio', desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy }
    default:
      return { periodo: 'todo', desde: null, hasta: null }
  }
}

const FECHA_LARGA = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

function fechaLegible(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number)
  return FECHA_LARGA.format(new Date(Date.UTC(a, m - 1, d)))
}

/**
 * «Del 1 de noviembre de 2026 al 11 de noviembre de 2026». Sin límites, lo
 * que diga `sinLimites` («Desde que es miembro», «Desde que es aliado»).
 */
export function textoPeriodo(rango: RangoPeriodo, sinLimites = 'Desde el principio'): string {
  const { desde, hasta } = rango
  if (!desde && !hasta) return sinLimites
  if (desde && hasta) {
    return desde === hasta
      ? `El ${fechaLegible(desde)}`
      : `Del ${fechaLegible(desde)} al ${fechaLegible(hasta)}`
  }
  return desde ? `Desde el ${fechaLegible(desde)}` : `Hasta el ${fechaLegible(hasta!)}`
}

/** Los parámetros de la URL que dicen este periodo (para enlaces de página). */
export function parametrosPeriodo(rango: RangoPeriodo): Record<string, string> {
  if (rango.periodo === 'rango') {
    const p: Record<string, string> = {}
    if (rango.desde) p.desde = rango.desde
    if (rango.hasta) p.hasta = rango.hasta
    return p
  }
  return rango.periodo === 'todo' ? {} : { periodo: rango.periodo }
}
