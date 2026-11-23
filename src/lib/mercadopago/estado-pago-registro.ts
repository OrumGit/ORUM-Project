/**
 * En qué punto está el pago de un registro público, dicho como lo ve la
 * persona al volver de Mercado Pago (diseño aprobado el 23/11/2026,
 * «ORUM — Pago con Mercado Pago»). Pura: la acción reúne los datos y esta
 * función decide qué pantalla toca.
 *
 * El primer cobro de un registro NO deja rastro en ORUM si se rechaza (la
 * suscripción de ORUM nace con el primer cobro aprobado), así que el rechazo
 * y el «pendiente» se leen del ÚLTIMO pago de la suscripción en Mercado Pago.
 */

/** Estado de un pago de Mercado Pago (`/v1/payments/{id}`), reducido a lo que importa aquí. */
export type CobroMP = 'aprobado' | 'rechazado' | 'pendiente' | 'otro'

export function cobroDesdeEstado(status: string | null | undefined): CobroMP {
  switch (status) {
    case 'approved':
      return 'aprobado'
    case 'rejected':
    case 'cancelled':
      return 'rechazado'
    case 'pending':
    case 'in_process':
    case 'authorized':
      return 'pendiente'
    default:
      return 'otro'
  }
}

export type EstadoPagoRegistro =
  /** Membresía creada: se enseña la bienvenida. */
  | 'activa'
  /** Mercado Pago aún no dice nada (o lo está procesando en este momento). */
  | 'confirmando'
  /** El último cobro se rechazó: «Intentar con otra tarjeta». */
  | 'rechazado'
  /** El cobro está en revisión en Mercado Pago: se avisará por correo. */
  | 'pendiente'
  /** No hay intento de pago: hay que abrirlo. */
  | 'sin_pago'

export type DatosEstadoPago = {
  /** `registros_pendientes.estado` del usuario de la sesión, o null si no tiene. */
  estadoRegistro: 'pendiente' | 'completado' | 'cancelado' | null
  /** Ya tiene ficha de socio (la conciliación pudo completarla ahora mismo). */
  tieneFicha: boolean
  /** Hay un intento de pago abierto en Mercado Pago. */
  tienePago: boolean
  /** El último cobro de ese intento, si Mercado Pago ya tiene alguno. */
  ultimoCobro: CobroMP | null
}

export function estadoPagoRegistro(d: DatosEstadoPago): EstadoPagoRegistro {
  if (d.tieneFicha || d.estadoRegistro === 'completado') return 'activa'
  if (!d.tienePago) return 'sin_pago'
  switch (d.ultimoCobro) {
    case 'rechazado':
      return 'rechazado'
    case 'pendiente':
      return 'pendiente'
    // Aprobado pero aún sin ficha: la conciliación está en camino.
    default:
      return 'confirmando'
  }
}

/** Cada cuánto se vuelve a preguntar, y cuántas veces, antes de ofrecer «Revisar de nuevo». */
export const SONDEO_CADA_MS = 3000
export const SONDEO_TOPE_MS = 60_000
