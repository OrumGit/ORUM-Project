/*
  ¿PUEDE EL SOCIO CAMBIAR SU FOTO ESTE MES?

  La fuente es la bitácora: cada foto que sube el socio desde su portal ya
  deja ahí su rastro (`registrarCambioImagen`, `origen: 'portal_miembro'`),
  así que la regla no necesita una columna nueva y cuenta también las fotos
  subidas antes de existir. Solo cuentan las SUBIDAS (`foto_url` no nulo):
  quitarla deja un rastro con `foto_url` nulo, que no gasta el cambio del mes
  ni lo devuelve. Las del panel llevan otro origen y no cuentan.

  Si la bitácora no se puede leer, no se bloquea a nadie: el carnet necesita
  la foto más de lo que la regla necesita cumplirse al milímetro.
*/
import 'server-only'

import type { createAdminClient } from '@/lib/supabase/admin'
import { inicioMesBogota, puedeCambiarFoto, textoProximoCambio } from './foto-mensual'

type Admin = ReturnType<typeof createAdminClient>

/** El `origen` con el que el portal del socio anota sus cambios de foto. */
export const ORIGEN_PORTAL_SOCIO = 'portal_miembro'

export type FotoDelMes = {
  puedeCambiar: boolean
  /** «el 1 de noviembre». */
  proximoCambio: string
}

export async function fotoDelMes(admin: Admin, miembroId: number, ahora = new Date()): Promise<FotoDelMes> {
  const proximoCambio = textoProximoCambio(ahora)
  const { data, error } = await admin
    .from('bitacora_actividad')
    .select('fecha_hora')
    .eq('entidad', 'miembro')
    .eq('entidad_id', miembroId)
    .eq('datos_nuevos->>origen', ORIGEN_PORTAL_SOCIO)
    .not('datos_nuevos->>foto_url', 'is', null)
    .gte('fecha_hora', inicioMesBogota(ahora).toISOString())
    .order('fecha_hora', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('No se pudo leer el último cambio de foto del socio:', error.message)
    return { puedeCambiar: true, proximoCambio }
  }
  return { puedeCambiar: puedeCambiarFoto(data?.fecha_hora ?? null, ahora), proximoCambio }
}
