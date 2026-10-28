import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import { rangoDePagina } from '@/lib/shared/paginacion'
import { esTablaAusente } from './resenas'
import { panelDeFila, type FilaPanel, type ResenaPanel } from './mapeo'
import { UMBRAL_REVISION, type FiltroResenas } from './moderacion'

/*
  LAS RESEÑAS DEL PANEL  ·  todas, con su comercio (29/10/2026)
  ---------------------------------------------------------------------------
  Cliente de administración: quien llama ya hizo `requireRol('super_admin')`.
  La columna `revisada_at` llega con una migración que se aplica a mano: si
  la base aún no la tiene (`42703`), se vuelve a leer sin ella y «por
  revisar» pasa a ser «baja y sin respuesta de ORUM» (`necesitaRevision`).
  Nunca lanza: sin tabla o con un error, la pantalla dice que no hay nada.
*/

type Admin = ReturnType<typeof createAdminClient>

const CAMPOS =
  'id, comercio_id, estrellas, mensaje, created_at, respuesta_comercio, respuesta_comercio_at, respuesta_admin, respuesta_admin_at, miembros ( nombres, apellidos ), comercios ( nombre )'

const faltaColumna = (e: { code?: string } | null | undefined) => e?.code === '42703' || e?.code === 'PGRST204'

export type ResenasDelPanel = {
  disponible: boolean
  /** ¿Existe `revisada_at`? Sin ella no se puede «marcar como revisada». */
  conRevision: boolean
  conteos: Record<FiltroResenas, number>
  resenas: ResenaPanel[]
  pagina: number
  paginas: number
  desde: number
  hasta: number
}

const VACIO: ResenasDelPanel = {
  disponible: false,
  conRevision: false,
  conteos: { todas: 0, por_revisar: 0, bajas: 0 },
  resenas: [],
  pagina: 1,
  paginas: 1,
  desde: 0,
  hasta: 0,
}

/** ¿Tiene la base la columna `revisada_at`? */
async function hayColumnaDeRevision(admin: Admin): Promise<boolean> {
  const { error } = await admin.from('resenas').select('revisada_at').limit(1)
  return !faltaColumna(error)
}

/** Aplica el filtro de la pestaña a una consulta de `resenas`. */
function filtrar<Q extends { lt: (c: string, v: number) => Q; is: (c: string, v: null) => Q }>(
  consulta: Q,
  filtro: FiltroResenas,
  conRevision: boolean,
): Q {
  if (filtro === 'todas') return consulta
  const bajas = consulta.lt('estrellas', UMBRAL_REVISION)
  if (filtro === 'bajas') return bajas
  return bajas.is(conRevision ? 'revisada_at' : 'respuesta_admin', null)
}

export async function obtenerResenasDelPanel(filtro: FiltroResenas, pagina: number): Promise<ResenasDelPanel> {
  try {
    const admin = createAdminClient()
    const conRevision = await hayColumnaDeRevision(admin)

    const contar = (f: FiltroResenas) =>
      filtrar(admin.from('resenas').select('id', { count: 'exact', head: true }), f, conRevision)
    const [todas, porRevisar, bajas] = await Promise.all([contar('todas'), contar('por_revisar'), contar('bajas')])
    const fallo = todas.error ?? porRevisar.error ?? bajas.error
    if (fallo) {
      if (!esTablaAusente(fallo)) console.error('[resenas] conteos del panel:', fallo)
      return VACIO
    }
    const conteos = { todas: todas.count ?? 0, por_revisar: porRevisar.count ?? 0, bajas: bajas.count ?? 0 }

    const rango = rangoDePagina(conteos[filtro], pagina)
    const lista =
      conteos[filtro] === 0
        ? { data: [], error: null }
        : await filtrar(
            admin.from('resenas').select(conRevision ? `${CAMPOS}, revisada_at` : CAMPOS),
            filtro,
            conRevision,
          )
            .order('created_at', { ascending: false })
            .order('id', { ascending: false })
            .range(rango.inicio, rango.fin)
    if (lista.error) {
      console.error('[resenas] lista del panel:', lista.error)
      return VACIO
    }

    return {
      disponible: true,
      conRevision,
      conteos,
      resenas: (lista.data as unknown as FilaPanel[]).map((f) => panelDeFila(f, conRevision)),
      pagina: rango.pagina,
      paginas: rango.paginas,
      desde: rango.desde,
      hasta: rango.hasta,
    }
  } catch (e) {
    console.error('[resenas] obtenerResenasDelPanel:', e)
    return VACIO
  }
}

export type AlertaResenas = { total: number; recientes: ResenaPanel[] }

/** La alerta de la portada: cuántas hay por revisar y las tres más recientes. */
export async function obtenerAlertaResenas(): Promise<AlertaResenas> {
  try {
    const admin = createAdminClient()
    const conRevision = await hayColumnaDeRevision(admin)
    const { data, count, error } = await filtrar(
      admin.from('resenas').select(conRevision ? `${CAMPOS}, revisada_at` : CAMPOS, { count: 'exact' }),
      'por_revisar',
      conRevision,
    )
      .order('created_at', { ascending: false })
      .limit(3)
    if (error) {
      if (!esTablaAusente(error)) console.error('[resenas] alerta de la portada:', error)
      return { total: 0, recientes: [] }
    }
    return {
      total: count ?? 0,
      recientes: (data as unknown as FilaPanel[]).map((f) => panelDeFila(f, conRevision)),
    }
  } catch (e) {
    console.error('[resenas] obtenerAlertaResenas:', e)
    return { total: 0, recientes: [] }
  }
}
