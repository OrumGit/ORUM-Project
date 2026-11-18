// Conciliación de una suscripción: aplica las cuotas que Mercado Pago ya cobró
// pero cuyo aviso no llegó al webhook. Lee la lista de cuotas en la API (no se
// fía de nada que venga de la página) y usa el mismo procesado que el webhook,
// que es idempotente: una cuota ya aplicada no hace nada.
//
// Solo servidor: escribe con la `service_role` a través de `admin`.

import 'server-only'

import type { createAdminClient } from '@/lib/supabase/admin'
import { listarCuotasSuscripcion } from './cliente'
import { NotificacionNoAplicable, procesarNotificacion } from './procesar'

type Admin = ReturnType<typeof createAdminClient>

/**
 * Devuelve cuántas cuotas se pasaron por el procesado. Las que no se pueden
 * aplicar todavía (pendientes, ya registradas) se omiten sin error. Cualquier
 * otro fallo sí se lanza, para que quien llama lo registre.
 */
export async function conciliarSuscripcion(admin: Admin, preapprovalId: string): Promise<number> {
  const { results = [] } = await listarCuotasSuscripcion(preapprovalId)
  let procesadas = 0
  for (const cuota of results) {
    try {
      await procesarNotificacion(admin, {
        idNotificacion: `conciliacion:${cuota.id}`,
        tipo: 'subscription_authorized_payment',
        accion: null,
        recursoId: String(cuota.id),
        liveMode: false,
      })
      procesadas++
    } catch (error) {
      if (!(error instanceof NotificacionNoAplicable)) throw error
    }
  }
  return procesadas
}
