// Webhook de Mercado Pago (plan §4).
//
// Orden fijo: leer el cuerpo → validar la firma → guardar la notificación
// (idempotencia) → consultar el recurso real → aplicar. Nunca se confía en el
// cuerpo para decidir acceso: solo sirve para saber qué recurso mirar.
//
// Respuestas:
//   200  procesada, duplicada o no aplicable (se registra el motivo)
//   400  el cuerpo no es una notificación
//   401  firma inválida (se registra con firma_valida = false)
//   500  fallo transitorio: Mercado Pago lo reintenta

import { createAdminClient } from '@/lib/supabase/admin'
import { leerNotificacion, type NotificacionMP } from '@/lib/mercadopago/notificacion'
import { verificarFirma } from '@/lib/mercadopago/firma'
import {
  NotificacionNoAplicable,
  procesarNotificacion,
} from '@/lib/mercadopago/procesar'
import { ErrorMercadoPago } from '@/lib/mercadopago/cliente'

export const runtime = 'nodejs'

const CODIGO_UNICIDAD = '23505'

export async function POST(request: Request): Promise<Response> {
  let cuerpo: unknown
  try {
    cuerpo = JSON.parse(await request.text())
  } catch {
    return new Response('cuerpo_invalido', { status: 400 })
  }

  const dataIdDeQuery = new URL(request.url).searchParams.get('data.id')
  const notificacion = leerNotificacion(cuerpo, dataIdDeQuery)
  if (!notificacion) return new Response('no_es_notificacion', { status: 400 })

  const firmaValida = verificarFirma({
    cabecera: request.headers.get('x-signature'),
    dataId: notificacion.recursoId,
    requestId: request.headers.get('x-request-id'),
    secreto: process.env.MP_WEBHOOK_SECRET ?? '',
    ahoraSeg: Math.floor(Date.now() / 1000),
  })

  const admin = createAdminClient()

  if (!firmaValida) {
    // Clave en un espacio aparte: una notificación sin firma nunca puede
    // ocupar el id de una real y hacer que esta se tome por duplicada.
    await admin.from('eventos_mercadopago').insert({
      id_notificacion: `no_firmada:${request.headers.get('x-request-id') ?? 'sin-id'}:${notificacion.idNotificacion}`,
      tipo: notificacion.tipo,
      accion: notificacion.accion,
      live_mode: notificacion.liveMode,
      firma_valida: false,
      procesado_at: new Date().toISOString(),
      error: 'firma_invalida',
    })
    return new Response('firma_invalida', { status: 401 })
  }

  // Idempotencia: la notificación se guarda ANTES de procesarla. Si la clave ya
  // existe, Mercado Pago la reenvía y no hay nada que hacer.
  const { data: fila, error: errorInsercion } = await admin
    .from('eventos_mercadopago')
    .insert({
      id_notificacion: notificacion.idNotificacion,
      tipo: notificacion.tipo,
      accion: notificacion.accion,
      live_mode: notificacion.liveMode,
      firma_valida: true,
    })
    .select('id')
    .single()

  if (errorInsercion) {
    if (errorInsercion.code === CODIGO_UNICIDAD) return new Response('duplicada', { status: 200 })
    return new Response('error_bitacora', { status: 500 })
  }

  try {
    const resultado = await procesarNotificacion(admin, notificacion)
    await marcarEvento(admin, fila.id, { error: null })
    return new Response(`ok:${resultado.accion}`, { status: 200 })
  } catch (error) {
    if (error instanceof NotificacionNoAplicable) {
      await marcarEvento(admin, fila.id, { error: error.message })
      return new Response(`no_aplicable:${error.message}`, { status: 200 })
    }
    if (error instanceof ErrorMercadoPago && error.status === 404) {
      await marcarEvento(admin, fila.id, { error: 'recurso_no_encontrado' })
      return new Response('recurso_no_encontrado', { status: 200 })
    }
    // Transitorio (red, base de datos, Mercado Pago caído). Se borra la fila para
    // que el reintento de Mercado Pago no tropiece con la clave ya existente y
    // responda 200 sin haber procesado nada. Queda constancia en el log.
    await admin.from('eventos_mercadopago').delete().eq('id', fila.id)
    console.error('[mercadopago] fallo transitorio', describir(error, notificacion))
    return new Response('reintentar', { status: 500 })
  }
}

async function marcarEvento(
  admin: ReturnType<typeof createAdminClient>,
  id: number,
  { error }: { error: string | null },
) {
  await admin
    .from('eventos_mercadopago')
    .update({ procesado_at: new Date().toISOString(), error })
    .eq('id', id)
}

function describir(error: unknown, n: NotificacionMP): string {
  const motivo = error instanceof Error ? error.message : String(error)
  return `${n.tipo} ${n.recursoId}: ${motivo}`
}
