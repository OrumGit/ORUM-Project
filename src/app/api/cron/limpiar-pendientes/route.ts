import { NextResponse } from 'next/server'
import { cuentasParaBorrar, esCuentaVencida, type CuentaParaRevisar } from '@/lib/auth/limpieza-pendientes'
import { createAdminClient } from '@/lib/supabase/admin'

/*
  Limpieza diaria de cuentas de registro sin pago (plan §10). La llama Vercel
  Cron con `Authorization: Bearer $CRON_SECRET`. Sin ese secreto, no hace nada.
*/

export const dynamic = 'force-dynamic'

const POR_PAGINA = 1000
const MAX_PAGINAS = 50
const LOTE = 200
/** Tope de borrados por ejecución: lo que no quepa, lo hace la siguiente. */
const MAX_BORRADOS = 500

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
  const ahora = new Date()

  // 1. Todas las cuentas de autenticación que ya tienen más del plazo.
  const vencidas: { id: string; creadaAt: string }[] = []
  for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: pagina, perPage: POR_PAGINA })
    if (error || !data) {
      return NextResponse.json({ ok: false, error: 'No se pudieron listar las cuentas.' }, { status: 500 })
    }
    for (const u of data.users) {
      const creada = u.created_at ?? ''
      if (esCuentaVencida(creada, ahora)) vencidas.push({ id: u.id, creadaAt: creada })
    }
    if (data.users.length < POR_PAGINA) break
  }

  // 2. De esas, cuáles tienen ficha de socio o un pago completado. Por lotes:
  //    PostgREST corta las consultas grandes.
  const conFicha = new Set<string>()
  const conPago = new Set<string>()
  for (let i = 0; i < vencidas.length; i += LOTE) {
    const ids = vencidas.slice(i, i + LOTE).map((c) => c.id)

    const { data: miembros, error: errMiembros } = await admin
      .from('miembros')
      .select('perfil_id')
      .in('perfil_id', ids)
    if (errMiembros) {
      return NextResponse.json({ ok: false, error: 'No se pudieron leer las fichas.' }, { status: 500 })
    }
    for (const m of miembros ?? []) if (m.perfil_id) conFicha.add(m.perfil_id)

    const { data: pagos, error: errPagos } = await admin
      .from('registros_pendientes')
      .select('auth_user_id')
      .in('auth_user_id', ids)
      .eq('estado', 'completado')
    if (errPagos) {
      return NextResponse.json({ ok: false, error: 'No se pudieron leer los pagos.' }, { status: 500 })
    }
    for (const p of pagos ?? []) conPago.add(p.auth_user_id)
  }

  const candidatas: CuentaParaRevisar[] = vencidas.map((c) => ({
    id: c.id,
    creadaAt: c.creadaAt,
    tieneFicha: conFicha.has(c.id),
    tienePagoCompletado: conPago.has(c.id),
  }))
  const aBorrar = cuentasParaBorrar(candidatas, ahora).slice(0, MAX_BORRADOS)

  // 3. Borrado con la API de administración. El registro pendiente se borra en
  //    cascada con el usuario (on delete cascade).
  let borradas = 0
  const fallidas: string[] = []
  for (const id of aBorrar) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) fallidas.push(id)
    else borradas++
  }

  return NextResponse.json({
    ok: fallidas.length === 0,
    revisadas: vencidas.length,
    borradas,
    fallidas: fallidas.length,
  })
}
