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

/*
  El periodo vive en `lib/shared/periodo.ts` desde el 11/11/2026: lo
  comparten las ventas de un comercio. Aquí se re-exporta con los nombres de
  siempre.
*/
import { textoPeriodo as textoPeriodoBase, type RangoPeriodo } from '../shared/periodo'

export {
  PERIODOS,
  esFechaCivil,
  leerPeriodo as leerPeriodoCompras,
  type Periodo as PeriodoCompras,
  type RangoPeriodo as RangoCompras,
} from '../shared/periodo'

/** «Del 1 de … al …», o «Desde que es miembro» sin límites. */
export function textoPeriodo(rango: RangoPeriodo): string {
  return textoPeriodoBase(rango, 'Desde que es miembro')
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
