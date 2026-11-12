/**
 * ¿Puede esta persona abrir un pago de Mercado Pago?
 *
 * Regla del registro público (plan §11): sin correo confirmado no se crea
 * ninguna suscripción. Esta función es la barrera del servidor; la pantalla no
 * cuenta como control.
 */

export type EstadoRegistroPendiente = 'pendiente' | 'completado' | 'cancelado'

export type RegistroPendienteMinimo = {
  estado: EstadoRegistroPendiente
  miembro_id: number | null
} | null

export type MotivoNoPagar =
  | 'correo_sin_confirmar'
  | 'sin_registro'
  | 'registro_cancelado'
  | 'ya_completado'

export type ResultadoPuedePagar = { ok: true } | { ok: false; motivo: MotivoNoPagar }

/**
 * `correoConfirmadoAt` es `auth.users.email_confirmed_at` del usuario. `null`
 * o ausente = el correo no está confirmado.
 */
export function puedeAbrirPago(
  correoConfirmadoAt: string | null | undefined,
  registro: RegistroPendienteMinimo,
): ResultadoPuedePagar {
  if (!registro) return { ok: false, motivo: 'sin_registro' }
  if (registro.estado === 'completado' || registro.miembro_id !== null) {
    return { ok: false, motivo: 'ya_completado' }
  }
  if (registro.estado === 'cancelado') return { ok: false, motivo: 'registro_cancelado' }
  if (!correoConfirmadoAt) return { ok: false, motivo: 'correo_sin_confirmar' }
  return { ok: true }
}
