'use client'

import {
  TASA_AUDIO,
  tasaVideo,
  type Rectangulo,
  type Tramo,
} from '@/lib/videos/video'

/*
  PREPARAR EL VIDEO EN EL NAVEGADOR  ·  (13/11/2026)
  ---------------------------------------------------------------------------
  Con Mediabunny (WebCodecs: usa el codificador del equipo, mucho más rápido
  que reproducir el video entero). Recorta el tramo, encuadra, baja a 720p y
  lo escribe en MP4 (H.264 + AAC) con `fastStart`, para que empiece a verse
  antes de terminar de descargarse. La librería se carga SOLO al abrir el
  editor (`import()`), no en el resto del panel.

  Lo que no se puede hacer en un navegador sin WebCodecs (muy viejo) lo dice
  con palabras, en `ErrorVideo`.
*/

export class ErrorVideo extends Error {}

export type OpcionesExportar = {
  tramo: Tramo
  /** El rectángulo del video que se queda (`null` = entero). */
  recorte: Rectangulo | null
  salida: { ancho: number; alto: number }
  sinSonido: boolean
  alProgresar: (fraccion: number) => void
  senal?: AbortSignal
}

/** Sin avanzar este tiempo, el codificador del equipo se da por atascado. */
const ESPERA_ATASCO_MS = 10_000

class Atascado extends Error {}

/**
 * El video listo para subir: MP4, ya recortado y comprimido.
 *
 * Primero con el codificador que elija el navegador (casi siempre el del
 * equipo, el rápido). Si se queda QUIETO —pasa con algunas tarjetas de video
 * y con la pestaña en segundo plano—, se cancela y se repite por software,
 * más lento pero seguro, en vez de dejar la barra parada para siempre.
 */
export async function exportarVideo(archivo: File, opciones: OpcionesExportar): Promise<Blob> {
  try {
    return await convertir(archivo, opciones, 'no-preference')
  } catch (e) {
    if (!(e instanceof Atascado) || opciones.senal?.aborted) throw e
    opciones.alProgresar(0)
    return convertir(archivo, opciones, 'prefer-software')
  }
}

async function convertir(
  archivo: File,
  opciones: OpcionesExportar,
  aceleracion: 'no-preference' | 'prefer-software',
): Promise<Blob> {
  const mb = await import('mediabunny')
  const { tramo, recorte, salida, sinSonido } = opciones
  const duracion = tramo.fin - tramo.inicio

  const calidadVideo = new mb.Quality({ bitrate: tasaVideo(duracion, !sinSonido) })
  if (!(await mb.canEncodeVideo('avc', { width: salida.ancho, height: salida.alto, quality: calidadVideo }))) {
    throw new ErrorVideo(
      'Este navegador no puede preparar videos. Usa Chrome, Edge o Safari actualizados en un computador.',
    )
  }

  const input = new mb.Input({ source: new mb.BlobSource(archivo), formats: mb.ALL_FORMATS })
  let vigilante: ReturnType<typeof setInterval> | undefined
  try {
    const output = new mb.Output({
      format: new mb.Mp4OutputFormat({ fastStart: 'in-memory' }),
      target: new mb.BufferTarget(),
    })
    const conversion = await mb.Conversion.init({
      input,
      output,
      trim: { start: tramo.inicio, end: tramo.fin },
      video: {
        ...(recorte ? { crop: recorte } : {}),
        width: salida.ancho,
        height: salida.alto,
        fit: 'fill',
        codec: 'avc',
        quality: calidadVideo,
        // 30 cuadros como mucho: un video de 60 del teléfono pesaría el doble sin verse mejor aquí.
        frameRate: 30,
        forceTranscode: true,
        hardwareAcceleration: aceleracion,
      },
      audio: sinSonido
        ? { discard: true }
        : { codec: 'aac', quality: new mb.Quality({ bitrate: TASA_AUDIO }), forceTranscode: true },
      showWarnings: false,
    })
    if (!conversion.isValid) {
      throw new ErrorVideo('No se pudo leer este video. Prueba con otro archivo, mejor en MP4.')
    }

    let ultimoAvance = Date.now()
    let atascado = false
    conversion.onProgress = (p) => {
      ultimoAvance = Date.now()
      opciones.alProgresar(Math.min(1, Math.max(0, p)))
    }
    if (aceleracion !== 'prefer-software') {
      vigilante = setInterval(() => {
        if (Date.now() - ultimoAvance > ESPERA_ATASCO_MS) {
          atascado = true
          void conversion.cancel()
        }
      }, 1000)
    }
    const cancelar = () => void conversion.cancel()
    opciones.senal?.addEventListener('abort', cancelar, { once: true })
    try {
      await conversion.execute()
    } catch (e) {
      if (atascado && !opciones.senal?.aborted) throw new Atascado()
      throw e
    } finally {
      opciones.senal?.removeEventListener('abort', cancelar)
    }

    const buffer = output.target.buffer
    if (!buffer) throw new ErrorVideo('No se pudo preparar el video. Inténtalo de nuevo.')
    return new Blob([buffer], { type: 'video/mp4' })
  } finally {
    if (vigilante) clearInterval(vigilante)
    input.dispose()
  }
}

/**
 * La PORTADA del video: el fotograma que se ve en `video` ahora (el inicio
 * del tramo), con el mismo recorte y las mismas medidas, en JPEG. Es la
 * imagen de la novedad o del carrusel mientras el video no se reproduce.
 */
export async function capturarPortada(
  video: HTMLVideoElement,
  recorte: Rectangulo | null,
  salida: { ancho: number; alto: number },
): Promise<File> {
  const lienzo = document.createElement('canvas')
  lienzo.width = salida.ancho
  lienzo.height = salida.alto
  const ctx = lienzo.getContext('2d')
  if (!ctx) throw new ErrorVideo('No se pudo sacar la portada del video.')
  const r = recorte ?? { left: 0, top: 0, width: video.videoWidth, height: video.videoHeight }
  ctx.drawImage(video, r.left, r.top, r.width, r.height, 0, 0, salida.ancho, salida.alto)
  const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/jpeg', 0.82))
  if (!blob) throw new ErrorVideo('No se pudo sacar la portada del video.')
  return new File([blob], 'portada.jpg', { type: 'image/jpeg' })
}

/**
 * Miniaturas para la línea de tiempo del editor: `cantidad` fotogramas
 * repartidos por todo el video, como direcciones de imagen locales. Si algo
 * falla devuelve las que pudo: la línea de tiempo funciona sin ellas.
 */
export async function miniaturas(archivo: File, duracion: number, cantidad: number): Promise<string[]> {
  const mb = await import('mediabunny')
  const input = new mb.Input({ source: new mb.BlobSource(archivo), formats: mb.ALL_FORMATS })
  const urls: string[] = []
  try {
    const pista = await input.getPrimaryVideoTrack()
    if (!pista || !(await pista.canDecode())) return urls
    const sumidero = new mb.CanvasSink(pista, { height: 72, fit: 'contain' })
    const tiempos = Array.from({ length: cantidad }, (_, i) => ((i + 0.5) / cantidad) * duracion)
    for await (const envuelto of sumidero.canvasesAtTimestamps(tiempos)) {
      if (!envuelto) continue
      const { canvas } = envuelto
      const blob =
        'convertToBlob' in canvas
          ? await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.7 })
          : await new Promise<Blob | null>((ok) => canvas.toBlob(ok, 'image/jpeg', 0.7))
      if (blob) urls.push(URL.createObjectURL(blob))
    }
  } catch {
    // Sin miniaturas: la línea de tiempo se ve lisa.
  } finally {
    input.dispose()
  }
  return urls
}
