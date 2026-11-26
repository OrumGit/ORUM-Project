/**
 * Reglas puras del pago único (Checkout Pro). Sin llamadas: el webhook las usa
 * después de leer el pago real en Mercado Pago.
 */

export type PagoUnicoMP = {
  external_reference?: string | null
  date_of_expiration?: string | null
  date_approved?: string | null
}

/**
 * Id del registro público que va en `external_reference`. Solo números: cualquier
 * otro valor no es de este flujo.
 */
export function registroDelPago(pago: PagoUnicoMP): number | null {
  const ref = pago.external_reference
  if (typeof ref !== 'string' || !/^\d+$/.test(ref)) return null
  const id = Number(ref)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

/**
 * Pago en efectivo que se aprueba DESPUÉS de su fecha límite. Mercado Pago lo
 * devuelve al pagador, así que no debe dar membresía. Sin fechas, no se juzga.
 */
export function esPagoTardio(pago: PagoUnicoMP): boolean {
  if (!pago.date_of_expiration || !pago.date_approved) return false
  const limite = Date.parse(pago.date_of_expiration)
  const aprobado = Date.parse(pago.date_approved)
  if (Number.isNaN(limite) || Number.isNaN(aprobado)) return false
  return aprobado > limite
}
