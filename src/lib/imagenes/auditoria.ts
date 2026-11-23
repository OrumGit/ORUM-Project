/*
  BITÁCORA DE LAS IMÁGENES

  Cambiar el logo de un aliado o la foto de un socio es una mutación como
  cualquier otra, y el resto de mutaciones del panel dejan rastro. Sin esto,
  el día que un comercio pregunte «¿quién cambió mi logo?» no habría respuesta.

  No reutiliza `registrarActividad` de `@/lib/bitacora/bitacora` porque aquella
  fija `entidad: 'miembro'` y `entidad_id` numérico: aquí la entidad puede ser
  un comercio, un perfil (uuid, sin id numérico) o un miembro.

  Se escribe con `accion: 'edicion'` y los campos en `datos_*` para que
  `resumirEventoBitacora` —que ya alimenta la ficha del miembro y
  `/OrumAdminLogin/bitacora`— lo resuma sin cambios: «Datos editados — logo_url».

  Best-effort, igual que el resto: la auditoría no puede tumbar la operación
  que la dispara.
*/
import 'server-only'

import type { createAdminClient } from '@/lib/supabase/admin'

type Admin = ReturnType<typeof createAdminClient>

export type EntidadImagen = 'comercio' | 'perfil' | 'miembro' | 'comercio_imagen' | 'anuncio' | 'publicidad'

export type CambioImagen = {
  actorId: string | null
  entidad: EntidadImagen
  /** Id numérico de la entidad, o `null` cuando la clave es un uuid. */
  entidadId: number | null
  /** Nombre de la columna tocada: `logo_url`, `portada_url`, `foto_url`… */
  campo: string
  urlAnterior: string | null
  urlNueva: string | null
  /** Datos extra del evento (uuid del perfil, descripción de la galería…). */
  contexto?: Record<string, unknown>
}

export async function registrarCambioImagen(
  admin: Admin,
  cambio: CambioImagen,
): Promise<void> {
  try {
    const { error } = await admin.from('bitacora_actividad').insert({
      actor_id: cambio.actorId,
      accion: 'edicion',
      entidad: cambio.entidad,
      entidad_id: cambio.entidadId,
      datos_anteriores: { [cambio.campo]: cambio.urlAnterior },
      datos_nuevos: { [cambio.campo]: cambio.urlNueva, ...cambio.contexto },
    })
    if (error) {
      console.error('No se pudo registrar el cambio de imagen en bitacora_actividad:', error.message)
    }
  } catch (err) {
    console.error('No se pudo registrar el cambio de imagen en bitacora_actividad:', err)
  }
}
