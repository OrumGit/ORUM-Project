import { NextResponse } from 'next/server'
import { conciliarSuscripcion } from '@/lib/mercadopago/conciliar'
import { sumarResumenes, type ResumenConciliacion } from '@/lib/mercadopago/resumen-conciliacion'
import { createAdminClient } from '@/lib/supabase/admin'

/*
  Conciliación horaria de las suscripciones autorizadas de Mercado Pago. Es la
  red de seguridad del webhook: si un aviso de cobro no llega, la cuota se
  aplica aquí. La llama Vercel Cron con `Authorization: Bearer $CRON_SECRET`.
  Sin ese secreto, no hace nada.

  Cada cuota se procesa con el mismo camino que el webhook, que es idempotente:
  repetir la conciliación no vuelve a aplicar un cobro.
*/

export const dynamic = 'force-dynamic'

/** Tope de suscripciones por ejecución: lo que no quepa, lo toma la siguiente hora. */
const MAX_SUSCRIPCIONES = 200

function autorizada(request: Request): boolean {
  const secreto = process.env.CRON_SECRET
  if (!secreto) return false
  return request.headers.get('authorization') === `Bearer ${secreto}`
}

export async function GET(request: Request) {
  if (!autorizada(request)) {
    return new NextResponse(null, { status: 401 })
  }

  const admin = createAdminClient()

  // Por turnos (23/11/2026): primero las que nunca se conciliaron y luego las
  // que hace más tiempo. Ordenar por `updated_at` repasaba siempre las mismas
  // 200 —conciliar sin cambios no lo toca— y de la 201 en adelante nunca se
  // revisaban. Sin la migración 20261123120000 (sin `conciliada_at`) se usa el
  // orden de antes.
  let porTurnos = true
  let lectura = await admin
    .from('suscripciones_mercadopago')
    .select('id, preapproval_id')
    .eq('estado_mp', 'authorized')
    .order('conciliada_at', { ascending: true, nullsFirst: true })
    .limit(MAX_SUSCRIPCIONES)
  if (lectura.error && /conciliada_at/.test(lectura.error.message ?? '')) {
    porTurnos = false
    lectura = await admin
      .from('suscripciones_mercadopago')
      .select('id, preapproval_id')
      .eq('estado_mp', 'authorized')
      .order('updated_at', { ascending: true })
      .limit(MAX_SUSCRIPCIONES)
  }
  const { data, error } = lectura
  if (error) {
    return NextResponse.json({ ok: false, error: 'No se pudieron leer las suscripciones.' }, { status: 500 })
  }

  const resumenes: ResumenConciliacion[] = []
  const fallidas: string[] = []
  for (const fila of data ?? []) {
    try {
      resumenes.push(await conciliarSuscripcion(admin, fila.preapproval_id))
      if (porTurnos) {
        // Al final de la cola. Un fallo al anotarlo no deshace la conciliación.
        await admin
          .from('suscripciones_mercadopago')
          .update({ conciliada_at: new Date().toISOString() })
          .eq('id', fila.id)
      }
    } catch (err) {
      // Una suscripción que falla no detiene a las demás. Queda para la siguiente hora.
      console.error('[cron conciliar-suscripciones]', fila.preapproval_id, err)
      fallidas.push(fila.preapproval_id)
    }
  }

  const total = sumarResumenes(resumenes)
  return NextResponse.json({
    ok: fallidas.length === 0,
    suscripciones: data?.length ?? 0,
    suscripciones_fallidas: fallidas.length,
    cuotas: {
      revisadas: total.revisadas,
      aplicadas_ahora: total.aplicadas,
      ya_estaban: total.yaEstaban,
      en_espera: total.enEspera,
      rechazadas: total.rechazadas,
      sin_pago: total.sinPago,
      no_aplicables: total.noAplicables,
    },
  })
}
