/**
 * Qué cuentas se borran por no haber pagado (plan §10 y §11). Pura: la ruta
 * de limpieza reúne los datos y esta función decide.
 *
 * ⚠️ La primera versión (hasta el 23/11/2026) partía de TODAS las cuentas de
 * autenticación y borraba las que no tenían ficha de socio. Las cuentas del
 * personal del panel y de los comercios no tienen ficha de socio: la primera
 * ejecución en producción las habría borrado todas. Ahora se parte de los
 * REGISTROS DE PAGO sin completar, y cualquier rastro de cuenta real (perfil,
 * ficha) la deja fuera.
 *
 * Solo se borra una cuenta que cumple TODO:
 * - vino del registro público (tiene fila en `registros_pendientes`);
 * - ese registro no se completó (sin pago aprobado, sin ficha enlazada);
 * - no tiene perfil (el personal, los comercios y los socios lo tienen);
 * - no tiene ficha de socio;
 * - el registro se creó hace más de `DIAS_PLAZO_SIN_PAGO` días;
 * - su enlace de pago de Mercado Pago, si lo tenía, ya está cancelado (si no,
 *   alguien podría pagarlo después y su cobro no tendría a quién ir).
 *
 * Nunca se borra una cuenta con número, incluidas las vencidas.
 */

export const DIAS_PLAZO_SIN_PAGO = 10

const MS_POR_DIA = 24 * 60 * 60 * 1000

export type CuentaParaRevisar = {
  id: string
  /** Cuándo se creó el registro de pago (no la cuenta de autenticación). */
  creadaAt: string
  /** Estado de su fila en `registros_pendientes`. */
  estadoRegistro: 'pendiente' | 'completado' | 'cancelado'
  /** El registro ya apunta a una ficha de socio (`miembro_id`). */
  registroConFicha: boolean
  /** Tiene fila en `perfiles`: personal, comercio o socio. */
  tienePerfil: boolean
  /** Tiene fila en `miembros` con su `perfil_id`. */
  tieneFicha: boolean
  /** Su enlace de pago sigue abierto en Mercado Pago (no se pudo cancelar). */
  pagoAbierto: boolean
}

/** ¿El registro se creó antes del plazo? Una fecha que no se lee cuenta como no vencida. */
export function esCuentaVencida(creadaAt: string, ahora: Date): boolean {
  const creada = Date.parse(creadaAt)
  if (Number.isNaN(creada)) return false
  return creada < ahora.getTime() - DIAS_PLAZO_SIN_PAGO * MS_POR_DIA
}

/** ¿Esta cuenta se puede borrar? */
export function sePuedeBorrar(c: CuentaParaRevisar, ahora: Date): boolean {
  return (
    c.estadoRegistro !== 'completado' &&
    !c.registroConFicha &&
    !c.tienePerfil &&
    !c.tieneFicha &&
    !c.pagoAbierto &&
    esCuentaVencida(c.creadaAt, ahora)
  )
}

/** Los ids de las cuentas que hay que borrar. */
export function cuentasParaBorrar(cuentas: readonly CuentaParaRevisar[], ahora: Date): string[] {
  return cuentas.filter((c) => sePuedeBorrar(c, ahora)).map((c) => c.id)
}
