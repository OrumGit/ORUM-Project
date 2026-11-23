/*
  LAS VENTAS DE UN COMERCIO, VISTAS DESDE EL PANEL  ·  puro (11/11/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: «el cliente también quiere esos datos para los
  comercios: cuánto han vendido, cuánto dinero ha entrado, cuánto ha sido de
  descuento». Es la otra cara de las compras de un miembro
  (`lib/miembros/compras-miembro.ts`): las mismas filas de `ventas`, vistas
  desde la caja.

  Las palabras, para que nadie las confunda:
    · ENTRÓ      = `valor_final`, lo que los socios pagaron en la caja.
    · DESCUENTO  = `valor_descuento`, lo que el comercio les rebajó.
    · SIN DESCUENTO = `valor_compra`, lo que habrían pagado sin ORUM.
*/

export type VentaComercio = {
  id: number
  /** Instante de la base (timestamptz): se formatea en America/Bogota. */
  fechaHora: string
  miembroId: number
  miembro: string
  sede: string | null
  promocion: string | null
  valorCompra: number
  descuento: number
  valorFinal: number
  /** `qr` o `numero`: cómo encontró la caja al socio. */
  metodo: string | null
}

/** Redondeo a 2 decimales al final: la coma flotante no acaba impresa. */
const redondear = (n: number) => Math.round(n * 100) / 100

export type ResumenVentasComercio = {
  ventas: number
  /** Lo que entró a la caja (`valor_final`). */
  entro: number
  /** Lo que se rebajó (`valor_descuento`). */
  descuento: number
  /** Lo que habrían pagado sin ORUM (`valor_compra`). */
  sinDescuento: number
  /** Socios distintos que compraron. */
  socios: number
  /** El descuento sobre el valor sin descuento, en %, entero; `null` sin ventas. */
  porcentajeDescuento: number | null
  /** Lo que entró por venta, en promedio; `null` sin ventas. */
  ventaPromedio: number | null
}

export function resumirVentasComercio(
  ventas: readonly Pick<VentaComercio, 'valorCompra' | 'descuento' | 'valorFinal' | 'miembroId'>[],
): ResumenVentasComercio {
  let entro = 0
  let descuento = 0
  let sinDescuento = 0
  const socios = new Set<number>()
  for (const v of ventas) {
    entro += v.valorFinal
    descuento += v.descuento
    sinDescuento += v.valorCompra
    socios.add(v.miembroId)
  }
  return {
    ventas: ventas.length,
    entro: redondear(entro),
    descuento: redondear(descuento),
    sinDescuento: redondear(sinDescuento),
    socios: socios.size,
    porcentajeDescuento: sinDescuento > 0 ? Math.round((descuento / sinDescuento) * 100) : null,
    ventaPromedio: ventas.length > 0 ? Math.round(entro / ventas.length) : null,
  }
}

export type GrupoVentas = {
  clave: string
  nombre: string
  ventas: number
  entro: number
  descuento: number
}

export const SIN_PROMOCION = 'Sin promoción'
export const SEDE_SIN_NOMBRE = 'Sede sin nombre'

function agrupar(
  ventas: readonly VentaComercio[],
  nombreDe: (v: VentaComercio) => string,
): GrupoVentas[] {
  const grupos = new Map<string, GrupoVentas>()
  for (const v of ventas) {
    const nombre = nombreDe(v)
    const g = grupos.get(nombre) ?? { clave: nombre, nombre, ventas: 0, entro: 0, descuento: 0 }
    g.ventas++
    g.entro = redondear(g.entro + v.valorFinal)
    g.descuento = redondear(g.descuento + v.descuento)
    grupos.set(nombre, g)
  }
  return [...grupos.values()].sort(
    (a, b) => b.ventas - a.ventas || b.entro - a.entro || a.nombre.localeCompare(b.nombre, 'es'),
  )
}

/** Dónde vende: un renglón por sede, de más a menos ventas. */
export function ventasPorSede(ventas: readonly VentaComercio[]): GrupoVentas[] {
  return agrupar(ventas, (v) => v.sede?.trim() || SEDE_SIN_NOMBRE)
}

/** Qué beneficios se usan: un renglón por promoción, de más a menos usos. */
export function ventasPorPromocion(ventas: readonly VentaComercio[]): GrupoVentas[] {
  return agrupar(ventas, (v) => v.promocion?.trim() || SIN_PROMOCION)
}
