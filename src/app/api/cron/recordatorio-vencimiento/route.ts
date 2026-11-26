import { NextResponse } from 'next/server'
import { enviarCorreoConResultado } from '@/lib/correo/correo'
import { construirCorreoRecordatorio } from '@/lib/correo/recordatorio-vencimiento'
import { urlBaseSitio } from '@/lib/auth/activacion'
import { debeRecordarVencimiento, DIAS_ANTES_RECORDATORIO } from '@/lib/miembros/recordatorio-vencimiento'
import { createAdminClient } from '@/lib/supabase/admin'

/*
  Recordatorio de vencimiento (plan §13, fase 4). La llama Vercel Cron cada
  día con `Authorization: Bearer $CRON_SECRET`. Sin ese secreto, no hace nada.

  Envía el correo a las membresías activas que vencen dentro de los próximos
  5 días y que aún no lo recibieron. Marca `recordatorio_enviado_at` SOLO si el
  correo salió: si falla, el día siguiente lo vuelve a intentar (sigue dentro de
  la ventana). Así no hay duplicados ni avisos perdidos por un fallo puntual.
*/

export const dynamic = 'force-dynamic'

const LIMITE_POR_EJECUCION = 500

function autorizada(request: Request): boolean {
  const secreto = process.env.CRON_SECRET
  if (!secreto) return false
  return request.headers.get('authorization') === `Bearer ${secreto}`
}

/** Fecha civil de hoy en Colombia, 'YYYY-MM-DD'. */
function hoyEnBogota(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
}

/** Suma días a una fecha civil 'YYYY-MM-DD' sin pasar por la zona horaria local. */
function sumarDias(fecha: string, dias: number): string {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  const d = new Date(Date.UTC(anio, mes - 1, dia + dias))
  return d.toISOString().slice(0, 10)
}

type Fila = {
  id: number
  fecha_fin: string
  recordatorio_enviado_at: string | null
  miembros: { perfil_id: string | null; nombres: string; deleted_at: string | null } | null
}

export async function GET(request: Request) {
  if (!autorizada(request)) {
    return new NextResponse(null, { status: 401 })
  }

  const admin = createAdminClient()
  const hoy = hoyEnBogota()
  const hasta = sumarDias(hoy, DIAS_ANTES_RECORDATORIO)

  const { data, error } = await admin
    .from('membresias')
    .select('id, fecha_fin, recordatorio_enviado_at, miembros!inner(perfil_id, nombres, deleted_at)')
    .eq('estado', 'activa')
    .is('recordatorio_enviado_at', null)
    .gt('fecha_fin', hoy)
    .lte('fecha_fin', hasta)
    .order('fecha_fin')
    .limit(LIMITE_POR_EJECUCION)

  if (error) {
    return NextResponse.json({ ok: false, error: 'No se pudieron leer las membresías.' }, { status: 500 })
  }

  const portal = `${new URL(urlBaseSitio()).origin}/miembros/perfil`
  const resumen = { candidatas: 0, enviados: 0, fallidos: 0, sin_correo: 0, borrados: 0 }

  for (const fila of (data ?? []) as unknown as Fila[]) {
    // Membresía de un socio borrado: no se le escribe.
    if (!fila.miembros || fila.miembros.deleted_at) {
      resumen.borrados++
      continue
    }
    if (!debeRecordarVencimiento({ fecha_fin: fila.fecha_fin, recordatorio_enviado_at: fila.recordatorio_enviado_at }, hoy)) {
      continue
    }
    resumen.candidatas++

    const perfilId = fila.miembros.perfil_id
    if (!perfilId) {
      resumen.sin_correo++
      continue
    }
    const { data: usuario } = await admin.auth.admin.getUserById(perfilId)
    const correo = usuario.user?.email
    if (!correo) {
      resumen.sin_correo++
      continue
    }

    const cuerpo = construirCorreoRecordatorio({
      nombre: fila.miembros.nombres,
      fechaFin: fila.fecha_fin,
      dias: DIAS_ANTES_RECORDATORIO,
      urlPortal: portal,
    })
    const salio = await enviarCorreoConResultado({
      para: correo,
      nombre: fila.miembros.nombres,
      asunto: cuerpo.asunto,
      html: cuerpo.html,
      texto: cuerpo.texto,
    })
    if (!salio) {
      resumen.fallidos++
      continue
    }

    // Solo ahora se marca: si esta escritura falla, el correo podría repetirse
    // mañana, y es preferible eso a dejar al socio sin el aviso.
    const { error: errMarca } = await admin
      .from('membresias')
      .update({ recordatorio_enviado_at: new Date().toISOString() })
      .eq('id', fila.id)
      .is('recordatorio_enviado_at', null)
    if (errMarca) {
      console.error('[recordatorio] correo enviado pero no se marcó la membresía', fila.id, errMarca)
    }
    resumen.enviados++
  }

  return NextResponse.json({ ok: true, hoy, hasta, ...resumen })
}
