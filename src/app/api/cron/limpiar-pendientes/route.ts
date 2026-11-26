import { NextResponse } from 'next/server'
import { DIAS_PLAZO_SIN_PAGO, sePuedeBorrar, type CuentaParaRevisar } from '@/lib/auth/limpieza-pendientes'
import { leerEnPaginas } from '@/lib/shared/leer-en-paginas'
import { createAdminClient } from '@/lib/supabase/admin'

/*
  Limpieza diaria de cuentas de registro sin pago (plan §10). La llama Vercel
  Cron con `Authorization: Bearer $CRON_SECRET`. Sin ese secreto, no hace nada.

  ⚠️ Parte de los REGISTROS DE PAGO sin completar, nunca de la lista de cuentas
  de autenticación: el personal del panel y los comercios no tienen ficha de
  socio, y la primera versión los habría borrado (ver `limpieza-pendientes.ts`).
*/

export const dynamic = 'force-dynamic'

const LOTE = 200
/** Tope de borrados por ejecución: lo que no quepa, lo hace la siguiente. */
const MAX_BORRADOS = 200

function autorizada(request: Request): boolean {
  const secreto = process.env.CRON_SECRET
  if (!secreto) return false
  return request.headers.get('authorization') === `Bearer ${secreto}`
}

type Registro = {
  id: number
  auth_user_id: string
  estado: 'pendiente' | 'completado' | 'cancelado'
  miembro_id: number | null
  mp_preapproval_id: string | null
  created_at: string
}

export async function GET(request: Request) {
  if (!autorizada(request)) {
    return new NextResponse(null, { status: 401 })
  }

  const admin = createAdminClient()
  const ahora = new Date()
  const limite = new Date(ahora.getTime() - DIAS_PLAZO_SIN_PAGO * 24 * 60 * 60 * 1000).toISOString()

  // 1. Registros de pago sin completar y con más del plazo. Solo estos son candidatos.
  let registros: Registro[]
  try {
    registros = await leerEnPaginas<Registro>((desde, hasta) =>
      admin
        .from('registros_pendientes')
        .select('id, auth_user_id, estado, miembro_id, mp_preapproval_id, created_at')
        .neq('estado', 'completado')
        .is('miembro_id', null)
        .lt('created_at', limite)
        .order('id')
        .range(desde, hasta),
    )
  } catch {
    return NextResponse.json({ ok: false, error: 'No se pudieron leer los registros.' }, { status: 500 })
  }
  registros = registros.slice(0, MAX_BORRADOS)

  // 2. Cualquier rastro de cuenta real los saca de la lista: perfil o ficha.
  const conPerfil = new Set<string>()
  const conFicha = new Set<string>()
  for (let i = 0; i < registros.length; i += LOTE) {
    const ids = registros.slice(i, i + LOTE).map((r) => r.auth_user_id)

    const { data: perfiles, error: errPerfiles } = await admin.from('perfiles').select('id').in('id', ids)
    if (errPerfiles) {
      return NextResponse.json({ ok: false, error: 'No se pudieron leer los perfiles.' }, { status: 500 })
    }
    for (const p of perfiles ?? []) conPerfil.add(p.id)

    const { data: miembros, error: errMiembros } = await admin
      .from('miembros')
      .select('perfil_id')
      .in('perfil_id', ids)
    if (errMiembros) {
      return NextResponse.json({ ok: false, error: 'No se pudieron leer las fichas.' }, { status: 500 })
    }
    for (const m of miembros ?? []) if (m.perfil_id) conFicha.add(m.perfil_id)
  }

  // 3. Antes de borrar, se cierra su enlace de pago en Mercado Pago: si siguiera
  //    abierto, alguien podría pagarlo y ese cobro no tendría a quién ir.
  let borradas = 0
  let conservadas = 0
  const fallidas: string[] = []
  for (const r of registros) {
    const candidata: CuentaParaRevisar = {
      id: r.auth_user_id,
      creadaAt: r.created_at,
      estadoRegistro: r.estado,
      registroConFicha: r.miembro_id !== null,
      tienePerfil: conPerfil.has(r.auth_user_id),
      tieneFicha: conFicha.has(r.auth_user_id),
      pagoAbierto: false,
    }
    if (!sePuedeBorrar(candidata, ahora)) {
      conservadas++
      continue
    }

    // El registro pendiente se borra en cascada con el usuario (on delete cascade).
    const { error } = await admin.auth.admin.deleteUser(r.auth_user_id)
    if (error) fallidas.push(r.auth_user_id)
    else borradas++
  }

  return NextResponse.json({
    ok: fallidas.length === 0,
    revisadas: registros.length,
    borradas,
    conservadas,
    fallidas: fallidas.length,
  })
}
