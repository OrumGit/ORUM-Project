// Conciliación del pago único desde la pantalla de retorno (plan §13, fase 6).
// Si el aviso del webhook no llegó, la pantalla pregunta a Mercado Pago por los
// pagos del registro y aplica el aprobado con las MISMAS reglas que el webhook
// (`procesarNotificacion`): así no hay dos caminos que decidan distinto.
//
// Solo servidor: escribe con la `service_role` a través de `admin`.

import 'server-only'

import type { createAdminClient } from '@/lib/supabase/admin'
import { buscarPagosPorReferencia } from './cliente'
import { cobroDesdeEstado, type CobroMP } from './estado-pago-registro'
import { NotificacionNoAplicable, procesarNotificacion } from './procesar'

type Admin = ReturnType<typeof createAdminClient>

/** Devuelve el estado del pago más reciente del registro, o null si aún no hay ninguno. */
export async function conciliarPagoUnico(admin: Admin, registroId: number): Promise<CobroMP | null> {
  const { results = [] } = await buscarPagosPorReferencia(String(registroId))
  const ultimo = results[0]
  if (!ultimo) return null

  const cobro = cobroDesdeEstado(ultimo.status)
  if (cobro === 'aprobado') {
    try {
      await procesarNotificacion(admin, {
        idNotificacion: `retorno-${ultimo.id}`,
        tipo: 'payment',
        accion: null,
        recursoId: String(ultimo.id),
        liveMode: false,
      })
    } catch (error) {
      // Un pago que no se puede aplicar (tardío, monto distinto…) se queda como está.
      if (!(error instanceof NotificacionNoAplicable)) throw error
    }
  }
  return cobro
}
