// Procesa una notificación ya validada: consulta el pago real en la API de
// Mercado Pago (nunca se fía del cuerpo) y llama a la función de base de datos.
// Solo pagos únicos (Checkout Pro). El flujo de suscripción se retiró el 25/11/2026.
//
// Solo servidor: escribe con la `service_role` a través de `admin`.

import 'server-only'

import type { createAdminClient } from '@/lib/supabase/admin'
import { accionCobro } from './estados'
import { esPagoTardio, registroDelPago } from './pago-unico'
import { obtenerPago } from './cliente'
import type { NotificacionMP, PagoMP } from './notificacion'

type Admin = ReturnType<typeof createAdminClient>

/**
 * La notificación es válida pero no se puede aplicar (pago incompleto, estado
 * sin efecto, pago tardío). No se reintenta: se deja el motivo en la bitácora y
 * el webhook responde 200 para que Mercado Pago no lo repita.
 */
export class NotificacionNoAplicable extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'NotificacionNoAplicable'
  }
}

export type ResultadoProcesar = { accion: string }

export async function procesarNotificacion(
  admin: Admin,
  n: NotificacionMP,
): Promise<ResultadoProcesar> {
  switch (n.tipo) {
    case 'payment': {
      const pago = await obtenerPago(n.recursoId)
      return registrarPagoUnico(admin, pago)
    }

    default:
      return { accion: 'tipo_no_gestionado' }
  }
}

/**
 * Pago único (Checkout Pro). Solo activa si el pago está aprobado, no es tardío
 * y su monto cuadra con el plan del registro (lo exige `activar_pago_unico`).
 * Todo lo demás queda en la bitácora sin dar membresía.
 */
async function registrarPagoUnico(admin: Admin, pago: PagoMP): Promise<ResultadoProcesar> {
  const registroId = registroDelPago(pago)
  if (registroId === null) throw new NotificacionNoAplicable('pago_sin_registro')

  const decision = accionCobro(pago.status)
  if (decision.tipo === 'ignorar') throw new NotificacionNoAplicable(decision.motivo)
  if (decision.tipo === 'revisar_manual') {
    throw new NotificacionNoAplicable(`revisar_manual:${decision.motivo}`)
  }
  if (decision.tipo === 'registrar_rechazado') {
    // Rechazo: no da membresía. Queda en la bitácora; la persona puede volver a pagar.
    throw new NotificacionNoAplicable(`pago_rechazado:${pago.status_detail ?? 'sin_detalle'}`)
  }
  if (decision.tipo !== 'registrar_aprobado') {
    // Pendiente (p. ej. Efecty esperando el pago en la red): aún no decide nada.
    return { accion: `pendiente:${pago.status_detail ?? pago.status ?? 'desconocido'}` }
  }

  // Un pago en efectivo aprobado después de su fecha límite: Mercado Pago lo
  // devuelve al pagador, así que no se da membresía.
  if (esPagoTardio(pago)) throw new NotificacionNoAplicable('pago_despues_del_vencimiento')

  const monto = Number(pago.transaction_amount)
  if (!Number.isFinite(monto) || monto <= 0) throw new NotificacionNoAplicable('pago_sin_monto')

  const { data, error } = await admin.rpc('activar_pago_unico', {
    p_registro_id: registroId,
    p_payment_id: String(pago.id),
    p_monto: monto,
  })
  if (error) {
    // Errores de negocio de la función: no se reintenta. Cualquier otro es transitorio.
    if (error.code === 'P0001' || error.code === 'P0002') {
      throw new NotificacionNoAplicable(error.message)
    }
    throw error
  }
  return { accion: data ? 'pago_unico_activado' : 'pago_unico_sin_membresia' }
}
