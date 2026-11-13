'use client'

import { pedirSubidaVideo } from '@/app/OrumAdminLogin/videos-actions'
import type { DestinoVideo } from '@/lib/videos/video'
import { ErrorVideo } from './exportar-video'

/**
 * Sube el MP4 ya preparado con la dirección firmada que da el servidor y
 * devuelve su ruta en el bucket. Va con `XMLHttpRequest` y no con `fetch`
 * porque es lo único que dice cuánto lleva subido (la barra de progreso).
 * El cuerpo es el mismo que arma `uploadToSignedUrl` de Supabase.
 */
export async function subirVideo(
  video: Blob,
  destino: DestinoVideo,
  alProgresar: (fraccion: number) => void,
  senal?: AbortSignal,
): Promise<string> {
  const pedida = await pedirSubidaVideo(destino)
  if (!pedida.ok) throw new ErrorVideo(pedida.error)

  const cuerpo = new FormData()
  cuerpo.append('cacheControl', '31536000')
  cuerpo.append('', video, 'video.mp4')

  await new Promise<void>((resolver, rechazar) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', pedida.url)
    xhr.setRequestHeader('x-upsert', 'false')
    const clave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (clave) xhr.setRequestHeader('apikey', clave)
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) alProgresar(e.loaded / e.total)
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolver()
        : rechazar(
            new ErrorVideo(
              xhr.status === 413
                ? 'El video pesa demasiado para subirlo. Recórtalo un poco más.'
                : 'No se pudo subir el video. Revisa la conexión e inténtalo de nuevo.',
            ),
          )
    xhr.onerror = () => rechazar(new ErrorVideo('No se pudo subir el video. Revisa la conexión e inténtalo de nuevo.'))
    xhr.onabort = () => rechazar(new DOMException('Cancelado', 'AbortError'))
    senal?.addEventListener('abort', () => xhr.abort(), { once: true })
    xhr.send(cuerpo)
  })

  return pedida.ruta
}
