import { NextResponse } from 'next/server'
import { conciliarSuscripcion } from '@/lib/mercadopago/conciliar'
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

  const { data, error } = await admin
    .from('suscripciones_mercadopago')
    .select('preapproval_id')
    .eq('estado_mp', 'authorized')
    .order('updated_at', { ascending: true })
    .limit(MAX_SUSCRIPCIONES)
  if (error) {
    return NextResponse.json({ ok: false, error: 'No se pudieron leer las suscripciones.' }, { status: 500 })
  }

  let cuotasAplicadas = 0
  const fallidas: string[] = []
  for (const fila of data ?? []) {
    try {
      cuotasAplicadas += await conciliarSuscripcion(admin, fila.preapproval_id)
    } catch (err) {
      // Una suscripción que falla no detiene a las demás. Queda para la siguiente hora.
      console.error('[cron conciliar-suscripciones]', fila.preapproval_id, err)
      fallidas.push(fila.preapproval_id)
    }
  }

  return NextResponse.json({
    ok: fallidas.length === 0,
    revisadas: data?.length ?? 0,
    cuotas_aplicadas: cuotasAplicadas,
    fallidas: fallidas.length,
  })
}
