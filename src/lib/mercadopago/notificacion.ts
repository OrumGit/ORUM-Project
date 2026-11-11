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
}

export type CobroRecurrenteMP = {
  id: number | string
  preapproval_id?: string | null
  status?: string | null
  payment?: { id?: number | string | null } | null
}

export type SuscripcionMP = {
  id: string
  status?: string | null
}

export type ArgsRegistrarCobro = {
  p_payment_id: string
  p_preapproval_id: string
  p_monto: number
  p_moneda: string
  p_estado_mp: string
  p_status_detail: string | null
}

/**
 * Convierte un pago de la API en los argumentos de `registrar_cobro_mp`.
 * Devuelve null si al pago le falta lo mínimo para registrarlo (estado o monto
 * válido): en ese caso el webhook lo deja como error en la bitácora.
 */
export function argsRegistrarCobro(
  pago: PagoMP,
  preapprovalId: string,
): ArgsRegistrarCobro | null {
  if (!preapprovalId || !pago.status) return null
  const monto = pago.transaction_amount
  if (typeof monto !== 'number' || !Number.isFinite(monto) || monto < 0) return null

  return {
    p_payment_id: String(pago.id),
    p_preapproval_id: preapprovalId,
    p_monto: monto,
    p_moneda: pago.currency_id ?? 'COP',
    p_estado_mp: pago.status,
    p_status_detail: pago.status_detail ?? null,
  }
}

/**
 * Id de la suscripción de un pago, si Mercado Pago lo deja en los metadatos.
 * PENDIENTE DE VERIFICAR con un pago real de suscripción: no está confirmado
 * que el pago de una cuota traiga `metadata.preapproval_id`.
 */
export function preapprovalDePago(pago: PagoMP): string | null {
  const valor = pago.metadata?.preapproval_id
  return typeof valor === 'string' && valor.length > 0 ? valor : null
}
