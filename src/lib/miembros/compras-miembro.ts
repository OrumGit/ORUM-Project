/*
  LAS COMPRAS DE UN MIEMBRO, VISTAS DESDE EL PANEL  ·  puro (11/11/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: «que el administrador pueda ver en el detalle del
  miembro cuántas compras ha realizado, en qué comercio y toda la información
  importante de la venta; cuánto se ha ahorrado en el mes, la semana, el año
  y más filtros, y cuánto se ha gastado».

  Cada compra es una fila de `ventas` normalizada con `normalizarMovimiento`
  (la misma que usa «Mis movimientos» del socio). Aquí viven el periodo que
  pide la URL, los totales y el ranking de comercios; la consulta está en
  `compras-miembro-datos.ts`.

  Las palabras, para que nadie las confunda:
    · GASTÓ   = `valor_final`, lo que el socio pagó en la caja.
    · AHORRÓ  = `valor_descuento`, lo que ORUM le descontó.
    · SIN ORUM = `valor_compra`, lo que habría pagado sin la membresía.

  TODAS las fechas son días CIVILES de Colombia ('YYYY-MM-DD'): «esta
  semana» empieza el lunes de Bogotá, no el del servidor.
*/

import type { Movimiento } from './movimientos'

export type PeriodoCompras = 'todo' | 'semana' | 'mes' | 'anio' | '30dias' | 'rango'

/** Las pestañas, en su orden. «Entre fechas» se elige con el formulario. */
export const PERIODOS: readonly { clave: Exclude<PeriodoCompras, 'rango'>; etiqueta: string }[] = [
  { clave: 'todo', etiqueta: 'Todo' },
  { clave: 'semana', etiqueta: 'Esta semana' },
  { clave: 'mes', etiqueta: 'Este mes' },
  { clave: '30dias', etiqueta: 'Últimos 30 días' },
  { clave: 'anio', etiqueta: 'Este año' },
]

export type RangoCompras = {
  periodo: PeriodoCompras
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
export function leerPeriodoCompras(
  params: { periodo?: string; desde?: string; hasta?: string },
  hoy: string,
): RangoCompras {
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

/** «Del 1 de noviembre de 2026 al 11 de noviembre de 2026», «Desde siempre». */
export function textoPeriodo(rango: RangoCompras): string {
  const { desde, hasta } = rango
  if (!desde && !hasta) return 'Desde que es miembro'
  if (desde && hasta) {
    return desde === hasta
      ? `El ${fechaLegible(desde)}`
      : `Del ${fechaLegible(desde)} al ${fechaLegible(hasta)}`
  }
  return desde ? `Desde el ${fechaLegible(desde)}` : `Hasta el ${fechaLegible(hasta!)}`
}

/** Redondeo a 2 decimales al final: la coma flotante no acaba impresa. */
const redondear = (n: number) => Math.round(n * 100) / 100

export type ResumenCompras = {
  compras: number
  /** Lo que pagó (`valor_final`). */
  gastado: number
  /** Lo que se ahorró (`valor_descuento`). */
  ahorrado: number
  /** Lo que habría pagado sin ORUM (`valor_compra`). */
  sinOrum: number
  /** Comercios distintos en los que compró. */
  comercios: number
  /** Ahorro sobre lo que habría pagado, en %, entero; `null` sin compras. */
  porcentajeAhorro: number | null
}

export function resumirCompras(
  compras: readonly Pick<Movimiento, 'valorCompra' | 'ahorro' | 'valorFinal' | 'comercioId' | 'comercio'>[],
): ResumenCompras {
  let gastado = 0
  let ahorrado = 0
  let sinOrum = 0
  const comercios = new Set<string>()
  for (const c of compras) {
    gastado += c.valorFinal
    ahorrado += c.ahorro
    sinOrum += c.valorCompra
    comercios.add(c.comercioId !== null ? `id:${c.comercioId}` : `nombre:${c.comercio}`)
  }
  return {
    compras: compras.length,
    gastado: redondear(gastado),
    ahorrado: redondear(ahorrado),
    sinOrum: redondear(sinOrum),
    comercios: comercios.size,
    porcentajeAhorro: sinOrum > 0 ? Math.round((ahorrado / sinOrum) * 100) : null,
  }
}

export type CompraPorComercio = {
  clave: string
  comercioId: number | null
  comercio: string
  logoUrl: string | null
  compras: number
  gastado: number
  ahorrado: number
  /** La compra más reciente en ese comercio (ISO). */
  ultima: string
}

/**
 * Dónde compra: un renglón por comercio, de más a menos compras (a igual
 * número, el que más gastó). Las compras llegan de la más reciente a la más
 * antigua, así que la primera que se ve de cada comercio es su última.
 */
export function comprasPorComercio(compras: readonly Movimiento[]): CompraPorComercio[] {
  const porClave = new Map<string, CompraPorComercio>()
  for (const c of compras) {
    const clave = c.comercioId !== null ? `id:${c.comercioId}` : `nombre:${c.comercio}`
    const fila = porClave.get(clave)
    if (fila) {
      fila.compras++
      fila.gastado = redondear(fila.gastado + c.valorFinal)
      fila.ahorrado = redondear(fila.ahorrado + c.ahorro)
      if (c.fechaHora > fila.ultima) fila.ultima = c.fechaHora
    } else {
      porClave.set(clave, {
        clave,
        comercioId: c.comercioId,
        comercio: c.comercio,
        logoUrl: c.logoUrl,
        compras: 1,
        gastado: redondear(c.valorFinal),
        ahorrado: redondear(c.ahorro),
        ultima: c.fechaHora,
      })
    }
  }
  return [...porClave.values()].sort(
    (a, b) => b.compras - a.compras || b.gastado - a.gastado || a.comercio.localeCompare(b.comercio, 'es'),
  )
}

/** Cómo se encontró al socio en la caja. */
export function textoMetodoRegistro(metodo: string | null | undefined): string {
  if (metodo === 'qr') return 'Escaneó el carnet'
  if (metodo === 'numero') return 'Tecleó el número'
  return 'Sin dato'
}
