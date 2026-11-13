import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { vigentesAhora } from './programacion'
import type { AnuncioResumen } from './tipos'

export type PortalAnuncios = 'publico' | 'miembros'

/*
  Qué columna de alcance mira cada portal. El Portal Público lee con
  `createAdminClient()` (se salta RLS) y el de Miembros con `createClient()`
  (RLS activa vía `anuncios_public_select`); en los dos casos el filtro de
  alcance es de la QUERY, no de la política — la política solo decide si la
  fila es legible en absoluto (activa y no borrada).
*/
const COLUMNA_ALCANCE = {
  publico: 'mostrar_publico',
  miembros: 'mostrar_miembros',
} as const satisfies Record<PortalAnuncios, 'mostrar_publico' | 'mostrar_miembros'>

/**
 * Las novedades visibles en un portal, la más reciente primero.
 *
 * Desde el 21/10/2026 se pueden PROGRAMAR (`publicar_desde` /
 * `publicar_hasta`): solo salen las que están en su ventana ahora
 * (`vigentesAhora`). Si la base todavía no tiene esas columnas —la
 * migración se aplica a mano y el código puede llegar antes—, se leen como
 * antes, sin fechas, en vez de dejar los portales sin novedades.
 */
export async function obtenerAnunciosVisibles(
  supabase: SupabaseClient<Database>,
  portal: PortalAnuncios,
): Promise<AnuncioResumen[]> {
  /* `*` trae las columnas que existan: las de programación y la del video
     llegan con migraciones que se aplican a mano, y sin ellas la lectura
     sigue funcionando (las que falten no vienen). */
  const respuesta = await supabase
    .from('anuncios')
    .select('*')
    .eq('activo', true)
    .eq(COLUMNA_ALCANCE[portal], true)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(50)

  type Fila = {
    id: number
    titulo: string
    cuerpo: string
    imagen_url: string | null
    created_at: string
    publicar_desde?: string | null
    publicar_hasta?: string | null
    video_url?: string | null
  }

  const filas = ((respuesta.data ?? []) as unknown as Fila[]).map((f) => ({
    ...f,
    desde: f.publicar_desde ?? null,
    hasta: f.publicar_hasta ?? null,
    creada: f.created_at,
  }))

  return vigentesAhora(filas, new Date()).map((fila) => ({
    id: fila.id,
    titulo: fila.titulo,
    cuerpo: fila.cuerpo,
    imagenUrl: fila.imagen_url,
    videoUrl: fila.video_url?.trim() || null,
    // Cuándo SALIÓ: su inicio programado, o cuándo se creó.
    createdAt: fila.desde ?? fila.created_at,
  }))
}

/** Una novedad tal como la edita el panel. */
export type AnuncioEditable = {
  id: number
  titulo: string
  cuerpo: string
  imagenUrl: string | null
  videoUrl: string | null
  mostrarPublico: boolean
  mostrarMiembros: boolean
  desde: string | null
  hasta: string | null
}

/**
 * La novedad que se va a editar, con su programación. La usan la página
 * completa y su gemela bajo `@modal`. Sin las columnas de programación (la
 * migración aún sin aplicar), se lee sin ellas.
 */
export async function leerAnuncioParaEditar(
  admin: SupabaseClient<Database>,
  id: number,
): Promise<AnuncioEditable | null> {
  // `*`: con o sin las columnas de programación y de video (migraciones a mano).
  const respuesta = await admin.from('anuncios').select('*').eq('id', id).is('deleted_at', null).maybeSingle()
  const fila = respuesta.data as unknown as {
    id: number
    titulo: string
    cuerpo: string
    imagen_url: string | null
    mostrar_publico: boolean
    mostrar_miembros: boolean
    publicar_desde?: string | null
    publicar_hasta?: string | null
    video_url?: string | null
  } | null
  if (!fila) return null
  return {
    id: fila.id,
    titulo: fila.titulo,
    cuerpo: fila.cuerpo,
    imagenUrl: fila.imagen_url,
    videoUrl: fila.video_url?.trim() || null,
    mostrarPublico: fila.mostrar_publico,
    mostrarMiembros: fila.mostrar_miembros,
    desde: fila.publicar_desde ?? null,
    hasta: fila.publicar_hasta ?? null,
  }
}
