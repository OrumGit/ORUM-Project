/*
  LOS VIDEOS DE NOVEDADES Y DE LA PORTADA  ·  reglas puras (13/11/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: «que el administrador, en las novedades y la
  publicidad, pueda subir videos de máximo 5 minutos, con el visor para
  recortarlo y ajustar la duración, para que se vea correctamente en los
  portales».

  Cómo se hace (el detalle de cada paso en su sitio):
    · El editor (`EditorVideo`) elige el TRAMO (inicio y fin, como mucho
      `DURACION_MAXIMA` segundos) y el ENCUADRE en el marco del destino (16:9
      las novedades, 4:3 el carrusel), o el video completo sin recortar.
    · En el navegador, `exportarVideo` lo convierte a MP4 (H.264 + AAC), que
      reproduce cualquier navegador y teléfono, recortado, a 720p como mucho y
      con la tasa justa para no pasar de `PESO_MAXIMO`. Lo que se sube es
      exactamente lo que se ve: los portales solo lo reproducen.
    · Se sube DIRECTO a Storage con una dirección firmada que da el servidor
      (`pedirSubidaVideo`): un video no cabe en el cuerpo de una acción.
    · Va con su PORTADA, el primer fotograma del tramo, que se guarda como la
      imagen de siempre (`imagen_url`): lo que ya enseñaba imágenes sigue
      funcionando, y el video carga solo cuando hace falta.

  Aquí vive lo que tienen que decir igual el editor y el servidor: los
  topes, el tramo, la cuenta del recorte y del tamaño, y las rutas.
*/

/** El bucket de los videos. Sin «publicidad», «anuncio», «ads» ni «banner»: los bloqueadores lo ocultarían. */
export const BUCKET_VIDEOS = 'videos-orum'

/** Lo más que puede durar un video publicado, en segundos. */
export const DURACION_MAXIMA = 5 * 60
/** Lo menos que puede durar, en segundos (un tramo de cero no se ve). */
export const DURACION_MINIMA = 1
/** El tope del archivo que se sube (el del bucket es 50 MB; se deja margen). */
export const PESO_MAXIMO = 48 * 1024 * 1024
/** Las medidas máximas de salida: 720p se ve nítido en un teléfono y en el carrusel. */
export const ANCHO_MAXIMO = 1280
export const ALTO_MAXIMO = 720
/** Tasa del audio (AAC), en bits por segundo. */
export const TASA_AUDIO = 96_000
/** Tasas del video: el techo (de sobra para 720p) y el suelo (por debajo se ve mal). */
export const TASA_VIDEO_MAXIMA = 2_500_000
export const TASA_VIDEO_MINIMA = 600_000

/** Dónde se usa un video: decide su carpeta y su marco. */
export type DestinoVideo = 'novedades' | 'portada'

/** La proporción del marco (ancho / alto) de cada destino. */
export const PROPORCION_DESTINO: Record<DestinoVideo, number> = {
  novedades: 16 / 9,
  portada: 4 / 3,
}

/** El tramo elegido, en segundos del archivo original. */
export type Tramo = { inicio: number; fin: number }

/**
 * El encuadre dentro del marco cuando se LLENA: `x`/`y` de 0 a 1 dicen qué
 * parte del video queda en el centro (0,5 = el centro), y `zoom` (≥ 1) cuánto
 * se acerca sobre el mínimo que llena el marco.
 */
export type Encuadre = { x: number; y: number; zoom: number }

export const ENCUADRE_CENTRADO: Encuadre = { x: 0.5, y: 0.5, zoom: 1 }
export const ZOOM_MAXIMO = 3

export type Rectangulo = { left: number; top: number; width: number; height: number }

const entre = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))
/** Los codificadores piden medidas pares. */
const par = (n: number) => Math.max(2, Math.floor(n / 2) * 2)

/** «1:05», «12:40». */
export function textoTiempo(segundos: number): string {
  const s = Math.max(0, Math.round(segundos))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** «1 min 5 s», «45 s»: para leerlo en voz alta. */
export function textoTiempoLargo(segundos: number): string {
  const s = Math.max(0, Math.round(segundos))
  const m = Math.floor(s / 60)
  const r = s % 60
  if (m === 0) return `${r} s`
  return r === 0 ? `${m} min` : `${m} min ${r} s`
}

/** El tramo con el que abre el editor: desde el principio, como mucho `DURACION_MAXIMA`. */
export function tramoInicial(duracion: number): Tramo {
  return { inicio: 0, fin: Math.min(duracion, DURACION_MAXIMA) }
}

/**
 * Mueve un extremo del tramo y lo deja válido: dentro del video, con al
 * menos `DURACION_MINIMA` y como mucho `DURACION_MAXIMA`. Si el extremo que
 * se mueve empuja el otro más allá del máximo, el otro le sigue.
 */
export function moverExtremo(tramo: Tramo, extremo: 'inicio' | 'fin', valor: number, duracion: number): Tramo {
  if (extremo === 'inicio') {
    const inicio = entre(valor, 0, Math.max(0, duracion - DURACION_MINIMA))
    let fin = Math.max(tramo.fin, inicio + DURACION_MINIMA)
    if (fin - inicio > DURACION_MAXIMA) fin = inicio + DURACION_MAXIMA
    return { inicio, fin: Math.min(fin, duracion) }
  }
  const fin = entre(valor, Math.min(DURACION_MINIMA, duracion), duracion)
  let inicio = Math.min(tramo.inicio, fin - DURACION_MINIMA)
  if (fin - inicio > DURACION_MAXIMA) inicio = fin - DURACION_MAXIMA
  return { inicio: Math.max(0, inicio), fin }
}

/** ¿El tramo se puede publicar? Devuelve el motivo si no. */
export function revisarTramo(tramo: Tramo, duracion: number): string | null {
  const largo = tramo.fin - tramo.inicio
  if (!(duracion > 0)) return 'No se pudo leer cuánto dura el video.'
  if (tramo.inicio < 0 || tramo.fin > duracion + 0.01) return 'El tramo se sale del video.'
  if (largo < DURACION_MINIMA) return 'El video tiene que durar al menos un segundo.'
  if (largo > DURACION_MAXIMA + 0.01) {
    return `El video publicado puede durar como mucho ${textoTiempoLargo(DURACION_MAXIMA)}: recórtalo.`
  }
  return null
}

/**
 * El rectángulo del video original que se ve en el marco al LLENARLO, en
 * píxeles del video (ya girado como se ve). Es la cuenta de `object-fit:
 * cover` con un acercamiento y un punto de enfoque: lo que el editor enseña
 * con CSS es lo que se recorta al exportar.
 */
export function recorteParaMarco(
  video: { ancho: number; alto: number },
  proporcionMarco: number,
  encuadre: Encuadre,
): Rectangulo {
  const zoom = entre(encuadre.zoom, 1, ZOOM_MAXIMO)
  // El rectángulo más grande con la proporción del marco que cabe en el video.
  let ancho = video.ancho
  let alto = ancho / proporcionMarco
  if (alto > video.alto) {
    alto = video.alto
    ancho = alto * proporcionMarco
  }
  ancho /= zoom
  alto /= zoom
  const left = entre(encuadre.x * video.ancho - ancho / 2, 0, video.ancho - ancho)
  const top = entre(encuadre.y * video.alto - alto / 2, 0, video.alto - alto)
  return { left: Math.round(left), top: Math.round(top), width: par(ancho), height: par(alto) }
}

/**
 * Las medidas de salida: las del recorte (o del video), sin pasar de 720p y
 * pares. Horizontal, dentro de 1280 × 720; vertical, dentro de 720 × 1280.
 * Nunca se agranda.
 */
export function medidasSalida(origen: { ancho: number; alto: number }): { ancho: number; alto: number } {
  const vertical = origen.alto > origen.ancho
  const maxAncho = vertical ? ALTO_MAXIMO : ANCHO_MAXIMO
  const maxAlto = vertical ? ANCHO_MAXIMO : ALTO_MAXIMO
  const e = Math.min(1, maxAncho / origen.ancho, maxAlto / origen.alto)
  return { ancho: par(origen.ancho * e), alto: par(origen.alto * e) }
}

/**
 * La tasa del video para que el archivo no pase de `PESO_MAXIMO`: lo que
 * cabe por segundo, menos el audio y un 8 % de margen del contenedor, entre
 * el suelo y el techo.
 */
export function tasaVideo(duracion: number, conAudio: boolean): number {
  const disponible = (PESO_MAXIMO * 8 * 0.92) / Math.max(duracion, 1) - (conAudio ? TASA_AUDIO : 0)
  return Math.round(entre(disponible, TASA_VIDEO_MINIMA, TASA_VIDEO_MAXIMA))
}

/** La ruta de un video nuevo: carpeta del destino y clave única. */
export function rutaVideo(destino: DestinoVideo, clave: string): string {
  return `${destino}/${clave}.mp4`
}

/** Una clave única y legible para el archivo (tiempo + azar). */
export function claveVideo(ahora: number, azar: number): string {
  return `${ahora.toString(36)}-${Math.floor(azar * 1e9).toString(36)}`
}

/**
 * ¿Es la ruta de un video de ESE destino que pudo dar `pedirSubidaVideo`?
 * El servidor lo comprueba antes de guardar la dirección: el formulario no
 * puede colar la de otro sitio.
 */
export function esRutaVideo(ruta: string, destino: DestinoVideo): boolean {
  return new RegExp(`^${destino}/[a-z0-9]+-[a-z0-9]+\\.mp4$`).test(ruta)
}

/** La ruta dentro del bucket a partir de su dirección pública (o `null` si no es de él). */
export function rutaDesdeUrlPublica(url: string): string | null {
  const marca = `/object/public/${BUCKET_VIDEOS}/`
  const i = url.indexOf(marca)
  return i === -1 ? null : decodeURIComponent(url.slice(i + marca.length).split('?')[0])
}

/** Los tipos de archivo que el editor acepta abrir (los convierte todos a MP4). */
export const TIPOS_ACEPTADOS = 'video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv,.m4v'

/** La dirección pública de un video del bucket (para verlo nada más subirlo). */
export function urlPublicaVideo(baseSupabase: string, ruta: string): string {
  return `${baseSupabase.replace(/\/+$/, '')}/storage/v1/object/public/${BUCKET_VIDEOS}/${ruta}`
}
