// Igual que hoyISO() en @/lib/shared/fecha: el servidor corre en
// UTC pero el negocio opera en America/Bogota, así que las fechas de los
// rangos deben formatearse en la zona horaria del negocio, no la del servidor.
function formatearFechaBogota(fecha: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(fecha)
}

/** Rango [hoy - dias, hoy] en formato 'YYYY-MM-DD' (zona horaria America/Bogota), para el filtro por defecto del dashboard. */
export function rangoUltimosDias(dias: number, hoy: Date = new Date()): { desde: string; hasta: string } {
  const hasta = formatearFechaBogota(hoy)
  const desdeDate = new Date(hoy)
  desdeDate.setUTCDate(desdeDate.getUTCDate() - dias)
  const desde = formatearFechaBogota(desdeDate)
  return { desde, hasta }
}

export type MembresiaVenta = {
  vendido_por: number | null
  precio_pagado: number
  /** Una cortesía no es una venta: no cuenta ni en cantidad ni en monto. */
  es_cortesia?: boolean
}
export type EmpleadoInfo = { id: number; nombres: string; apellidos: string }
export type ResumenEmpleado = {
  empleadoId: number | null
  nombre: string
  cantidad: number
  monto: number
}

/**
 * Agrupa membresías vendidas por empleado (`vendido_por = null` → "Super admin").
 * Las cortesías se dejan fuera: no se cobraron.
 */
export function agruparMembresiasPorEmpleado(
  membresias: MembresiaVenta[],
  empleados: EmpleadoInfo[],
): ResumenEmpleado[] {
  const nombreEmpleado = new Map(empleados.map((e) => [e.id, `${e.nombres} ${e.apellidos}`.trim()]))
  const acumulado = new Map<number | null, { cantidad: number; monto: number }>()

  for (const m of membresias) {
    if (m.es_cortesia) continue
    const clave = m.vendido_por
    const actual = acumulado.get(clave) ?? { cantidad: 0, monto: 0 }
    actual.cantidad += 1
    actual.monto += m.precio_pagado
    acumulado.set(clave, actual)
  }

  return Array.from(acumulado.entries())
    .map(([empleadoId, { cantidad, monto }]) => ({
      empleadoId,
      nombre: empleadoId === null ? 'Super admin' : (nombreEmpleado.get(empleadoId) ?? `Empleado #${empleadoId}`),
      cantidad,
      monto,
    }))
    .sort((a, b) => b.cantidad - a.cantidad)
}

export type VentaRegistro = {
  sucursal_id: number
  miembro_id: number
  valor_final: number
  valor_descuento: number
}
export type SucursalInfo = { id: number; comercio_id: number }
export type ComercioInfo = { id: number; nombre: string }
export type MiembroInfo = { id: number; nombres: string; apellidos: string }

export type ResumenComercio = {
  comercioId: number
  nombre: string
  cantidad: number
  montoTotal: number
  descuentoTotal: number
}

/** Agrupa ventas por comercio (vía `sucursal_id → comercio_id`). */
export function agruparVentasPorComercio(
  ventas: VentaRegistro[],
  sucursales: SucursalInfo[],
  comercios: ComercioInfo[],
): ResumenComercio[] {
  const comercioDeSucursal = new Map(sucursales.map((s) => [s.id, s.comercio_id]))
  const nombreComercio = new Map(comercios.map((c) => [c.id, c.nombre]))
  const acumulado = new Map<number, { cantidad: number; montoTotal: number; descuentoTotal: number }>()

  for (const v of ventas) {
    const comercioId = comercioDeSucursal.get(v.sucursal_id)
    if (comercioId === undefined) continue
    const actual = acumulado.get(comercioId) ?? { cantidad: 0, montoTotal: 0, descuentoTotal: 0 }
    actual.cantidad += 1
    actual.montoTotal += v.valor_final
    actual.descuentoTotal += v.valor_descuento
    acumulado.set(comercioId, actual)
  }

  return Array.from(acumulado.entries())
    .map(([comercioId, { cantidad, montoTotal, descuentoTotal }]) => ({
      comercioId,
      nombre: nombreComercio.get(comercioId) ?? `Comercio #${comercioId}`,
      cantidad,
      montoTotal,
      descuentoTotal,
    }))
    .sort((a, b) => b.cantidad - a.cantidad)
}

export type ResumenUsoMiembro = {
  miembroId: number
  miembroNombre: string
  comercioId: number
  comercioNombre: string
  veces: number
}

/**
 * Agrupa ventas por par miembro+comercio ("cuántas veces usó su membresía ahí"),
 * de más a menos veces. TODOS los pares: la página los muestra de a 10
 * (11/11/2026; antes se cortaba en 20 y el resto no se podía ver).
 */
export function agruparVentasPorMiembroYComercio(
  ventas: VentaRegistro[],
  sucursales: SucursalInfo[],
  comercios: ComercioInfo[],
  miembros: MiembroInfo[],
): ResumenUsoMiembro[] {
  const comercioDeSucursal = new Map(sucursales.map((s) => [s.id, s.comercio_id]))
  const nombreComercio = new Map(comercios.map((c) => [c.id, c.nombre]))
  const nombreMiembro = new Map(miembros.map((m) => [m.id, `${m.nombres} ${m.apellidos}`.trim()]))
  const acumulado = new Map<string, { miembroId: number; comercioId: number; veces: number }>()

  for (const v of ventas) {
    const comercioId = comercioDeSucursal.get(v.sucursal_id)
    if (comercioId === undefined) continue
    const clave = `${v.miembro_id}:${comercioId}`
    const actual = acumulado.get(clave) ?? { miembroId: v.miembro_id, comercioId, veces: 0 }
    actual.veces += 1
    acumulado.set(clave, actual)
  }

  return Array.from(acumulado.values())
    .map(({ miembroId, comercioId, veces }) => ({
      miembroId,
      miembroNombre: nombreMiembro.get(miembroId) ?? `Miembro #${miembroId}`,
      comercioId,
      comercioNombre: nombreComercio.get(comercioId) ?? `Comercio #${comercioId}`,
      veces,
    }))
    .sort((a, b) => b.veces - a.veces)
}

/**
 * Filas por página en las tablas de Métricas y en el detalle de un comercio
 * (11/11/2026: «agrupar de a 10 y tenerlo paginado para evitar fallas de
 * rendimiento»). Las listas del panel siguen en 25 (`FILAS_POR_PAGINA`):
 * aquí van varias tablas una debajo de otra, y de a 10 la página se lee.
 */
export const POR_PAGINA_METRICAS = 10

export type VentaDetalleRegistro = {
  id: number
  miembro_id: number
  sucursal_id: number
  promocion_id: number | null
  valor_compra: number
  valor_descuento: number
  valor_final: number
  fecha_hora: string
}
export type SucursalNombre = { id: number; nombre: string | null }
export type PromocionInfo = { id: number; titulo: string }

export type DetalleVenta = {
  id: number
  /** Instante tal como llega de la base (timestamptz): formatear en America/Bogota. */
  fechaHora: string
  miembroNombre: string
  sucursalNombre: string
  promocionTitulo: string | null
  valorCompra: number
  valorDescuento: number
  valorFinal: number
}

/** Resuelve los nombres de cada venta. Conserva el orden recibido. */
export function detallarVentas(
  ventas: VentaDetalleRegistro[],
  sucursales: SucursalNombre[],
  miembros: MiembroInfo[],
  promociones: PromocionInfo[],
): DetalleVenta[] {
  const nombreSucursal = new Map(sucursales.map((s) => [s.id, s.nombre ?? 'Sin nombre']))
  const nombreMiembro = new Map(miembros.map((m) => [m.id, `${m.nombres} ${m.apellidos}`.trim()]))
  const tituloPromocion = new Map(promociones.map((p) => [p.id, p.titulo]))

  return ventas.map((v) => ({
    id: v.id,
    fechaHora: v.fecha_hora,
    miembroNombre: nombreMiembro.get(v.miembro_id) ?? `Miembro #${v.miembro_id}`,
    sucursalNombre: nombreSucursal.get(v.sucursal_id) ?? `Sucursal #${v.sucursal_id}`,
    promocionTitulo: v.promocion_id === null ? null : (tituloPromocion.get(v.promocion_id) ?? null),
    valorCompra: v.valor_compra,
    valorDescuento: v.valor_descuento,
    valorFinal: v.valor_final,
  }))
}

/** Cantidad, monto final y descuento total de un conjunto de ventas. */
export function totalesVentas(ventas: Pick<VentaRegistro, 'valor_final' | 'valor_descuento'>[]): {
  cantidad: number
  monto: number
  descuento: number
} {
  return ventas.reduce(
    (t, v) => ({
      cantidad: t.cantidad + 1,
      monto: t.monto + v.valor_final,
      descuento: t.descuento + v.valor_descuento,
    }),
    { cantidad: 0, monto: 0, descuento: 0 },
  )
}

function esFechaISO(valor: string | undefined): valor is string {
  if (!valor || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false
  const [a, m, d] = valor.split('-').map(Number)
  const fecha = new Date(Date.UTC(a, m - 1, d))
  return fecha.getUTCFullYear() === a && fecha.getUTCMonth() === m - 1 && fecha.getUTCDate() === d
}

/**
 * Rango que llega por la URL. Si falta, no es una fecha real o está invertido,
 * cae a los últimos 30 días: una URL manipulada no debe romper la consulta.
 */
export function normalizarRango(
  desde: string | undefined,
  hasta: string | undefined,
  hoy: Date = new Date(),
): { desde: string; hasta: string } {
  if (esFechaISO(desde) && esFechaISO(hasta) && desde <= hasta) return { desde, hasta }
  return rangoUltimosDias(30, hoy)
}
