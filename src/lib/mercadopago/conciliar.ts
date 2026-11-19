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
import { resumirConciliacion, type ResultadoCuota, type ResumenConciliacion } from './resumen-conciliacion'

type Admin = ReturnType<typeof createAdminClient>

/**
 * Pagos de esta suscripción que ya tienen membresía asociada. Una cuota cuyo
 * pago está aquí ya fue aplicada: no hace falta procesarla otra vez.
 */
async function pagosYaAplicados(admin: Admin, preapprovalId: string): Promise<Set<string>> {
  const { data: sus, error: errSus } = await admin
    .from('suscripciones_mercadopago')
    .select('id')
    .eq('preapproval_id', preapprovalId)
    .maybeSingle()
  if (errSus) throw errSus
  if (!sus) return new Set()

  const { data: pagos, error: errPagos } = await admin
    .from('pagos_mercadopago')
    .select('payment_id')
    .eq('suscripcion_id', sus.id)
    .not('membresia_id', 'is', null)
  if (errPagos) throw errPagos

  return new Set((pagos ?? []).map((p) => String(p.payment_id)))
}

/**
 * Concilia las cuotas de una suscripción y devuelve qué pasó con cada una.
 * Un fallo inesperado se lanza, para que quien llama lo registre.
 */
export async function conciliarSuscripcion(
  admin: Admin,
  preapprovalId: string,
): Promise<ResumenConciliacion> {
  const { results = [] } = await listarCuotasSuscripcion(preapprovalId)
  const aplicados = await pagosYaAplicados(admin, preapprovalId)

  const resultados: ResultadoCuota[] = []
  for (const cuota of results) {
    const pagoId = cuota.payment?.id
    if (pagoId == null) {
      resultados.push('sin_pago')
      continue
    }
    if (aplicados.has(String(pagoId))) {
      resultados.push('ya_estaba')
      continue
    }

    try {
      const { accion } = await procesarNotificacion(admin, {
        idNotificacion: `conciliacion:${cuota.id}`,
        tipo: 'subscription_authorized_payment',
        accion: null,
        recursoId: String(cuota.id),
        liveMode: false,
      })
      resultados.push(accion === 'aprobado' ? 'aplicada' : accion === 'rechazado' ? 'rechazada' : 'en_espera')
    } catch (error) {
      if (!(error instanceof NotificacionNoAplicable)) throw error
      resultados.push('no_aplicable')
    }
  }
  return resumirConciliacion(resultados)
}
