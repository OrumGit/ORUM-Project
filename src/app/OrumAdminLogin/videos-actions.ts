'use server'

import { getPerfilActual } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { BUCKET_VIDEOS, claveVideo, rutaVideo, type DestinoVideo } from '@/lib/videos/video'

/*
  LA SUBIDA DE UN VIDEO  ·  la dirección firmada (13/11/2026)
  ---------------------------------------------------------------------------
  Un video no cabe en el cuerpo de una acción del servidor (1 MB), así que el
  navegador lo sube DIRECTO a Storage con una dirección firmada de un solo
  uso (vale dos horas). Esta acción la da solo al super administrador —el
  único que gestiona novedades y la portada— y elige ELLA la ruta, con clave
  nueva: el navegador no decide dónde escribe. Después, la acción que guarda
  la novedad o la pieza comprueba que la ruta sea de su destino
  (`esRutaVideo`) y que el archivo exista.
*/

export type SubidaVideo = { ok: true; ruta: string; url: string } | { ok: false; error: string }

export async function pedirSubidaVideo(destino: DestinoVideo): Promise<SubidaVideo> {
  const actor = await getPerfilActual()
  if (!actor || !actor.activo || actor.rolCodigo !== 'super_admin') {
    return { ok: false, error: 'No tienes permiso para subir videos.' }
  }
  if (destino !== 'novedades' && destino !== 'portada') return { ok: false, error: 'Destino no válido.' }

  const ruta = rutaVideo(destino, claveVideo(Date.now(), Math.random()))
  const { data, error } = await createAdminClient().storage.from(BUCKET_VIDEOS).createSignedUploadUrl(ruta)
  if (error || !data) {
    const sinBucket = /bucket/i.test(error?.message ?? '') && /not.?found/i.test(error?.message ?? '')
    return {
      ok: false,
      error: sinBucket
        ? 'Para subir videos falta aplicar en Supabase la migración 20261113120000_videos.sql.'
        : 'No se pudo preparar la subida del video. Inténtalo de nuevo.',
    }
  }
  return { ok: true, ruta, url: data.signedUrl }
}
