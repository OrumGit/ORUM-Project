/**
 * Qué cuentas se borran por no haber pagado (plan §10 y §11). Pura: la ruta
 * de limpieza reúne los datos y esta función decide.
 *
 * Solo se borra una cuenta que cumple las TRES condiciones:
 * - no tiene ficha de socio (sin número de membresía);
 * - no completó ningún pago;
 * - se creó hace más de `DIAS_PLAZO_SIN_PAGO` días.
 *
 * Nunca se borra una cuenta con número, incluidas las vencidas.
 */

export const DIAS_PLAZO_SIN_PAGO = 10

const MS_POR_DIA = 24 * 60 * 60 * 1000

export type CuentaParaRevisar = {
  id: string
  creadaAt: string
  tieneFicha: boolean
  tienePagoCompletado: boolean
}

/** ¿La cuenta se creó antes del plazo? Una fecha que no se lee cuenta como no vencida. */
export function esCuentaVencida(creadaAt: string, ahora: Date): boolean {
  const creada = Date.parse(creadaAt)
  if (Number.isNaN(creada)) return false
  return creada < ahora.getTime() - DIAS_PLAZO_SIN_PAGO * MS_POR_DIA
}

/** Los ids de las cuentas que hay que borrar. */
export function cuentasParaBorrar(cuentas: readonly CuentaParaRevisar[], ahora: Date): string[] {
  return cuentas
    .filter(
      (c) =>
        !c.tieneFicha && !c.tienePagoCompletado && esCuentaVencida(c.creadaAt, ahora),
    )
    .map((c) => c.id)
}
