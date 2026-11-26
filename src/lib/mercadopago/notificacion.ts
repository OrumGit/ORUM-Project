// Lectura pura de las notificaciones de Mercado Pago y de sus recursos.
//
// Sin red ni base de datos: recibe el cuerpo ya parseado y devuelve datos
// planos. Lo que hace el servidor con ellos está en `procesar.ts`.

export type NotificacionMP = {
  /** Clave de idempotencia: una notificación no se procesa dos veces. */
  idNotificacion: string
  /** `type` del webhook: payment, subscription_preapproval, subscription_authorized_payment… */
  tipo: string
  accion: string | null
  /** Id del recurso al que apunta (cobro, pago o suscripción). */
  recursoId: string
  liveMode: boolean
}

/**
 * Extrae la notificación del cuerpo. `dataIdDeQuery` es el `data.id` de la URL,
 * que es el que viaja firmado en el manifest; si no viene, se usa el del cuerpo.
 * Devuelve null si el cuerpo no tiene tipo ni recurso (no es una notificación).
 */
export function leerNotificacion(
  cuerpo: unknown,
  dataIdDeQuery: string | null,
): NotificacionMP | null {
  if (!cuerpo || typeof cuerpo !== 'object') return null
  const c = cuerpo as Record<string, unknown>
  const data = c.data as Record<string, unknown> | null | undefined

  const tipo = typeof c.type === 'string' ? c.type : ''
  const cuerpoId = data && data.id != null ? String(data.id) : ''
  const recursoId = dataIdDeQuery ?? cuerpoId
  if (!tipo || !recursoId) return null

  const accion = typeof c.action === 'string' ? c.action : null
  const idNotificacion =
    c.id != null ? String(c.id) : `${tipo}:${recursoId}:${accion ?? ''}`

  return {
    idNotificacion,
    tipo,
    accion,
    recursoId,
    liveMode: c.live_mode === true,
  }
}

// Forma mínima de las respuestas de la API de Mercado Pago que usamos.
// Solo los campos que leemos; el resto se ignora.

export type PagoMP = {
  id: number | string
  status?: string | null
  status_detail?: string | null
  transaction_amount?: number | null
  currency_id?: string | null
  metadata?: Record<string, unknown> | null
  /** Pago único: id del registro público (`preferencia-pago.ts`). */
  external_reference?: string | null
  /** Pago único: fecha límite del pago en efectivo, con zona horaria. */
  date_of_expiration?: string | null
  /** Pago único: cuándo se aprobó. Sirve para detectar un pago tardío. */
  date_approved?: string | null
}
