import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin'
import type { ImagenGaleria } from './gestor-imagenes'

export type DatosImagenesComercio = {
  id: number
  nombre: string
  logoUrl: string | null
  portadaUrl: string | null
  galeria: ImagenGaleria[]
}

/**
 * La consulta vive aquí y no en cada página porque son DOS: la pantalla
 * completa y su gemela bajo `@modal`. Si cada una la escribiera por su cuenta,
 * la interceptada acabaría enseñando un subconjunto distinto de los datos y
 * nadie lo notaría hasta abrirla por enlace directo.
 */
export async function cargarImagenesComercio(
  comercioId: number,
): Promise<DatosImagenesComercio | null> {
  if (!Number.isInteger(comercioId) || comercioId < 1) return null

  const admin = createAdminClient()

  const [{ data: comercio }, { data: galeria }] = await Promise.all([
    admin
      .from('comercios')
      .select('id, nombre, logo_url, portada_url')
      .eq('id', comercioId)
      .is('deleted_at', null)
      .maybeSingle(),
    admin
      .from('comercio_imagenes')
      .select('id, url, descripcion, orden')
      .eq('comercio_id', comercioId)
      // Mismo orden que verá el socio. `id` desempata para que dos piezas con
      // el mismo `orden` no bailen entre recargas.
      .order('orden', { ascending: true })
      .order('id', { ascending: true }),
  ])

  if (!comercio) return null

  return {
    id: comercio.id,
    nombre: comercio.nombre,
    logoUrl: comercio.logo_url,
    portadaUrl: comercio.portada_url,
    galeria: galeria ?? [],
  }
}
