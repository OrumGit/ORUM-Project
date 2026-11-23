// Cortar el cobro automático de un socio en Mercado Pago.
//
// Solo servidor: usa el Access Token y escribe con la `service_role`.
//
// Lo usa REVOCAR (23/11/2026): una membresía revocada tiene que dejar de
// cobrarse. Si la suscripción siguiera viva, Mercado Pago cobraría el mes
// siguiente y ese cobro crearía una membresía nueva: la revocación se
// deshacía sola con el siguiente pago.

import 'server-only'

import type { createAdminClient } from '@/lib/supabase/admin'
import { cancelarSuscripcion, ErrorMercadoPago } from './cliente'

type Admin = ReturnType<typeof createAdminClient>

/** Estados de Mercado Pago en los que una suscripción todavía puede cobrar. */
const PUEDEN_COBRAR = ['authorized', 'pending', 'paused']

export type ResultadoCorte = { canceladas: number; fallidas: number }

/**
 * Cancela en Mercado Pago toda suscripción del socio que aún pueda cobrar, y
 * lo refleja en ORUM. Nunca lanza: devuelve cuántas no se pudieron cancelar,
 * para que quien llama lo diga.
 */
export async function cortarCobrosDelSocio(admin: Admin, miembroId: number): Promise<ResultadoCorte> {
  const { data, error } = await admin
    .from('suscripciones_mercadopago')
    .select('id, preapproval_id')
    .eq('miembro_id', miembroId)
    .in('estado_mp', PUEDEN_COBRAR)
  if (error) {
    console.error('[mercadopago] no se pudieron leer las suscripciones del socio', miembroId, error)
    return { canceladas: 0, fallidas: 1 }
  }

  let canceladas = 0
  let fallidas = 0
  for (const s of data ?? []) {
    try {
      await cancelarSuscripcion(s.preapproval_id)
    } catch (err) {
      // 404: Mercado Pago ya no la conoce; no cobrará. Cualquier otro fallo sí cuenta.
      if (!(err instanceof ErrorMercadoPago && err.status === 404)) {
        console.error('[mercadopago] no se pudo cancelar la suscripción', s.preapproval_id, err)
        fallidas++
        continue
      }
    }
    await admin
      .from('suscripciones_mercadopago')
      .update({ estado_mp: 'cancelled', renovacion_activa: false, updated_at: new Date().toISOString() })
      .eq('id', s.id)
    canceladas++
  }
  return { canceladas, fallidas }
}
