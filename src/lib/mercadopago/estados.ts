// Mapeo de estados de Mercado Pago a acciones internas.
//
// Estados de la suscripción (`preapproval`): `pending`, `authorized`,
// `paused`, `canceled` (la gestión de la API usa `canceled`).
// Estados de cada cobro recurrente (`authorized_payment`): `processed`,
// `recycling` (reintento), `waiting for gateway`.
// Estados de un pago (`payment`): `approved`, `rejected`, `pending`,
// `in_process`, `cancelled`, `refunded`, `charged_back`.

export type AccionSuscripcion =
  | { tipo: 'sincronizar_renovacion'; renovacionActiva: boolean }
  | { tipo: 'ignorar'; motivo: string }

export type AccionCobro =
  | { tipo: 'registrar_aprobado' }
  | { tipo: 'registrar_rechazado' }
  | { tipo: 'consultar_pago' }
  | { tipo: 'esperar' }
  | { tipo: 'revisar_manual'; motivo: string }
  | { tipo: 'ignorar'; motivo: string }

export function accionSuscripcion(status: string | null | undefined): AccionSuscripcion {
  switch (status) {
    case 'authorized':
      return { tipo: 'sincronizar_renovacion', renovacionActiva: true }
    case 'paused':
      return { tipo: 'sincronizar_renovacion', renovacionActiva: false }
    case 'canceled':
    case 'cancelled':
      return { tipo: 'sincronizar_renovacion', renovacionActiva: false }
    case 'pending':
      // Aún no hay medio de pago: no cambia nada en ORUM.
      return { tipo: 'ignorar', motivo: 'pendiente_de_pago' }
    default:
      return { tipo: 'ignorar', motivo: `estado_desconocido:${status ?? 'vacio'}` }
  }
}

/**
 * Estado de un cobro. Dos fuentes con vocabularios distintos:
 *
 * - `payment` (recurso de pago, `/v1/payments/{id}`): `approved` o `rejected`
 *   deciden. Es la única fuente que puede aprobar o rechazar.
 * - `authorized_payment` (cuota de la suscripción): `processed` NO significa
 *   cobro aprobado. Tras agotar reintentos, la cuota queda `processed` asociada
 *   a un pago rechazado (documentación de Mercado Pago, cuotas sin plan).
 *   Por eso una cuota nunca aprueba ni rechaza por sí sola: se consulta su pago.
 */
export function accionCobro(status: string | null | undefined): AccionCobro {
  switch (status) {
    case 'approved':
      return { tipo: 'registrar_aprobado' }
    case 'rejected':
      return { tipo: 'registrar_rechazado' }
    case 'processed':
    case 'recycling':
    case 'waiting for gateway':
      return { tipo: 'consultar_pago' }
    case 'pending':
    case 'in_process':
      return { tipo: 'esperar' }
    case 'refunded':
    case 'charged_back':
      return { tipo: 'revisar_manual', motivo: status }
    case 'cancelled':
      return { tipo: 'ignorar', motivo: 'cobro_cancelado' }
    default:
      return { tipo: 'ignorar', motivo: `estado_desconocido:${status ?? 'vacio'}` }
  }
}
