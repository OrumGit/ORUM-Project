import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Fecha de gracia abierta de cada membresía (cobro rechazado de Mercado Pago).
 * Solo lectura, y solo para los ids que quien llama ya leyó con su propio
 * permiso: la tabla de suscripciones no es legible desde la sesión del socio,
 * así que la consulta va con la `service_role`.
 *
 * Si una membresía tiene más de una suscripción con gracia, gana la fecha más
 * tardía.
 */
export async function graciaPorMembresia(membresiaIds: number[]): Promise<Map<number, string>> {
  const mapa = new Map<number, string>()
  if (membresiaIds.length === 0) return mapa

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('suscripciones_mercadopago')
    .select('membresia_id, gracia_hasta')
    .in('membresia_id', membresiaIds)
    .not('gracia_hasta', 'is', null)
  if (error) throw error

  for (const fila of data ?? []) {
    if (fila.membresia_id == null || !fila.gracia_hasta) continue
    const previa = mapa.get(fila.membresia_id)
    if (!previa || fila.gracia_hasta > previa) mapa.set(fila.membresia_id, fila.gracia_hasta)
  }
  return mapa
}

/**
 * Todas las gracias abiertas a `hoy` (cobros rechazados que aún dan acceso).
 * Para listados grandes: es mucho más barato que pedir ids uno a uno.
 */
export async function graciasVigentes(hoy: string): Promise<Map<number, string>> {
  const mapa = new Map<number, string>()
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('suscripciones_mercadopago')
    .select('membresia_id, gracia_hasta')
    .gte('gracia_hasta', hoy)
    .not('membresia_id', 'is', null)
  if (error) throw error

  for (const fila of data ?? []) {
    if (fila.membresia_id == null || !fila.gracia_hasta) continue
    const previa = mapa.get(fila.membresia_id)
    if (!previa || fila.gracia_hasta > previa) mapa.set(fila.membresia_id, fila.gracia_hasta)
  }
  return mapa
}
