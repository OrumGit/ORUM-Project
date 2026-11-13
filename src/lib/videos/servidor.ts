import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { BUCKET_VIDEOS, esRutaVideo, rutaDesdeUrlPublica, type DestinoVideo } from './video'

/*
  LO QUE HACE EL SERVIDOR CON UN VIDEO YA SUBIDO  ·  (13/11/2026)
  ---------------------------------------------------------------------------
  El navegador lo subió con una dirección firmada (`pedirSubidaVideo`) y
  manda su RUTA con el formulario. Antes de guardarla: que sea una ruta de
  ese destino (`esRutaVideo`: el formulario no puede colar otra) y que el
  archivo exista de verdad. Y al sustituir o quitar un video, el anterior se
  borra (sin fallar si ya no estaba).
*/

type Admin = SupabaseClient<Database>

/** La dirección pública del video recién subido, o el motivo por el que no vale. */
export async function confirmarVideo(
  admin: Admin,
  ruta: string,
  destino: DestinoVideo,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (!esRutaVideo(ruta, destino)) return { ok: false, error: 'El video no es válido. Súbelo otra vez.' }
  const { data: existe, error } = await admin.storage.from(BUCKET_VIDEOS).exists(ruta)
  if (error || !existe) return { ok: false, error: 'No se encontró el video subido. Súbelo otra vez.' }
  return { ok: true, url: admin.storage.from(BUCKET_VIDEOS).getPublicUrl(ruta).data.publicUrl }
}

/** Borra un video por su dirección pública. Nunca lanza: si ya no estaba, no pasa nada. */
export async function borrarVideo(admin: Admin, url: string | null | undefined): Promise<void> {
  if (!url) return
  const ruta = rutaDesdeUrlPublica(url)
  if (!ruta) return
  try {
    await admin.storage.from(BUCKET_VIDEOS).remove([ruta])
  } catch {
    // Un archivo huérfano no es motivo para fallar el guardado.
  }
}

/** ¿El error es porque la base aún no tiene la columna `video_url`? */
export function faltaColumnaVideo(error: { message?: string; code?: string } | null | undefined): boolean {
  return Boolean(error && /video_url/.test(error.message ?? ''))
}

export const MENSAJE_FALTA_MIGRACION_VIDEOS =
  'Para guardar videos falta aplicar en Supabase la migración 20261113120000_videos.sql. Mientras tanto, usa una imagen.'

/** El `video_url` de una fila leída con `select('*')` (sin la migración no viene). */
export function videoDe(fila: object | null | undefined): string | null {
  if (!fila || !('video_url' in fila)) return null
  const v = (fila as { video_url?: unknown }).video_url
  return typeof v === 'string' && v.trim() !== '' ? v.trim() : null
}
