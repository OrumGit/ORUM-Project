'use server'

/*
  LA PUBLICIDAD DE LA PORTADA  ·  subir, ordenar, ocultar y quitar (13/10/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: las imágenes del carrusel de la portada «no las
  puede quitar ni cambiar el administrador, y están ligadas a los comercios
  cuando deberían ser publicidad que quiera poner el administrador».

  Solo el super administrador, como las novedades. Se usa el cliente
  `service_role`, que ignora RLS: la comprobación de rol de cada acción ES la
  política.

  Mismo orden que el resto de subidas: primero Storage, y solo si fue bien se
  toca la base. O la imagen nueva, o la anterior intacta; nunca a medias.
*/

import { revalidatePath, updateTag } from 'next/cache'
import { getPerfilActual } from '@/lib/auth/auth'
import { registrarCambioImagen } from '@/lib/imagenes/auditoria'
import type { EstadoSubida } from '@/lib/imagenes/estado'
import {
  BUCKET_IMAGENES_ANUNCIOS,
  claveGaleria,
  rutaPublicidad,
} from '@/lib/imagenes/rutas'
import { borrarObjeto, borrarPorUrlPublica, subirImagen } from '@/lib/imagenes/subir'
import { LIMITE_IMAGENES_COMERCIOS } from '@/lib/imagenes/validacion'
import { TOPE_PUBLICIDAD, ordenTrasMover, revisarDescripcion } from '@/lib/publicidad/publicidad'
import { mensajeDeError } from '@/lib/shared/errores'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  MENSAJE_FALTA_MIGRACION_VIDEOS,
  borrarVideo,
  confirmarVideo,
  faltaColumnaVideo,
  videoDe,
} from '@/lib/videos/servidor'

const SIN_PERMISO = 'No tienes permiso para realizar esta acción.'

/** Mismo criterio que las novedades: solo el super administrador activo. */
async function actorSuperAdmin(): Promise<string | null> {
  const actor = await getPerfilActual()
  if (!actor || !actor.activo || actor.rolCodigo !== 'super_admin') return null
  return actor.userId
}

/** La portada va detrás de la caché `publico`: sin soltarla, el cambio tarda un minuto en verse. */
function refrescar(): void {
  updateTag('publico')
  revalidatePath('/')
  revalidatePath('/OrumAdminLogin/publicidad')
}

function leerId(formData: FormData): number | null {
  const crudo = formData.get('id')
  if (crudo === null || crudo === '') return null
  const id = Number(crudo)
  return Number.isInteger(id) && id > 0 ? id : null
}

/**
 * Guarda una imagen ya encuadrada, o un VIDEO (13/11/2026). Con `id`,
 * sustituye esa pieza (y conserva su puesto); sin él, añade una al final del
 * carrusel.
 *
 * Un video llega ya subido (`video_ruta`, ver `pedirSubidaVideo`) y su
 * PORTADA viaja como la imagen de siempre (`archivo`): la pieza guarda las
 * dos, y el carrusel enseña la portada mientras el video carga. Sustituir un
 * video por una imagen (o al revés) borra lo que sobra.
 */
export async function guardarPublicidad(
  _prev: EstadoSubida,
  formData: FormData,
): Promise<EstadoSubida> {
  const actorId = await actorSuperAdmin()
  if (!actorId) return { error: SIN_PERMISO }

  const revisada = revisarDescripcion(String(formData.get('descripcion') ?? ''))
  if (!revisada.ok) return { error: revisada.error }

  const admin = createAdminClient()
  const { data: piezas, error: errorLectura } = await admin
    .from('publicidad')
    // `*`: trae `video_url` si la migración de los videos está aplicada.
    .select('*')
  if (errorLectura) return { error: mensajeDeError('No se pudo leer la publicidad', errorLectura) }

  const id = leerId(formData)
  const anterior = id === null ? null : (piezas ?? []).find((p) => p.id === id)
  if (id !== null && !anterior) return { error: 'Esa imagen ya no existe.' }
  if (!anterior && (piezas ?? []).length >= TOPE_PUBLICIDAD) {
    return { error: `Ya hay ${TOPE_PUBLICIDAD} piezas. Quita una para añadir otra.` }
  }

  // El video, si viene: ya subido; aquí solo se comprueba que sea suyo y exista.
  const rutaVideo = String(formData.get('video_ruta') ?? '').trim()
  let videoUrl: string | null = null
  if (rutaVideo) {
    const confirmado = await confirmarVideo(admin, rutaVideo, 'portada')
    if (!confirmado.ok) return { error: confirmado.error }
    videoUrl = confirmado.url
  }
  const videoAnterior = videoDe(anterior)
  // La columna solo se escribe si hay algo que decirle: sin la migración, una
  // imagen se sigue guardando como siempre.
  const conVideo = videoUrl !== null || videoAnterior !== null ? { video_url: videoUrl } : {}

  // Clave nueva en cada subida, también al sustituir: la dirección cambia y
  // ni el navegador ni la CDN pueden seguir enseñando la anterior.
  const clave = claveGaleria(Date.now(), Math.random())
  const resultado = await subirImagen(admin, {
    archivo: formData.get('archivo'),
    bucket: BUCKET_IMAGENES_ANUNCIOS,
    ruta: (ext) => rutaPublicidad(clave, ext),
    limite: LIMITE_IMAGENES_COMERCIOS,
  })
  if (!resultado.ok) return { error: resultado.error }

  const { data: fila, error } = anterior
    ? await admin
        .from('publicidad')
        .update({ imagen_url: resultado.url, descripcion: revisada.descripcion, ...conVideo })
        .eq('id', anterior.id)
        .select('id')
        .maybeSingle()
    : await admin
        .from('publicidad')
        .insert({
          imagen_url: resultado.url,
          descripcion: revisada.descripcion,
          ...conVideo,
          // Al final: las nuevas no desordenan las que ya había.
          orden: (piezas ?? []).reduce((max, p) => Math.max(max, p.orden), 0) + 1,
          creado_por: actorId,
        })
        .select('id')
        .maybeSingle()

  if (error || !fila) {
    // La fila no entró: lo recién subido no lo referencia nadie.
    await borrarObjeto(admin, BUCKET_IMAGENES_ANUNCIOS, resultado.ruta)
    await borrarVideo(admin, videoUrl)
    if (faltaColumnaVideo(error)) return { error: MENSAJE_FALTA_MIGRACION_VIDEOS }
    return {
      error: error
        ? mensajeDeError('No se pudo guardar la imagen', error)
        : 'No se pudo guardar la imagen.',
    }
  }

  // Sustituida: lo anterior sobra (la imagen o portada, y el video si lo había).
  if (anterior) {
    await borrarPorUrlPublica(admin, BUCKET_IMAGENES_ANUNCIOS, anterior.imagen_url)
    if (videoAnterior && videoAnterior !== videoUrl) await borrarVideo(admin, videoAnterior)
  }

  await registrarCambioImagen(admin, {
    actorId,
    entidad: 'publicidad',
    entidadId: fila.id,
    campo: 'imagen_url',
    urlAnterior: anterior?.imagen_url ?? null,
    urlNueva: resultado.url,
  })

  refrescar()
  return { ok: true, url: resultado.url }
}

/** Quita una imagen: se va la fila y, con ella, el archivo. */
export async function quitarPublicidad(
  _prev: EstadoSubida,
  formData: FormData,
): Promise<EstadoSubida> {
  const actorId = await actorSuperAdmin()
  if (!actorId) return { error: SIN_PERMISO }

  const id = leerId(formData)
  if (id === null) return { error: 'Falta la imagen que se quiere quitar.' }

  const admin = createAdminClient()
  const { data: fila } = await admin
    .from('publicidad')
    // `*`: trae `video_url` si la migración de los videos está aplicada.
    .select('*')
    .eq('id', id)
    .maybeSingle()
  // Ya no está: para quien pulsa, quedó quitada.
  if (!fila) {
    refrescar()
    return { ok: true }
  }

  const { error } = await admin.from('publicidad').delete().eq('id', fila.id)
  if (error) return { error: mensajeDeError('No se pudo quitar la imagen', error) }

  await borrarPorUrlPublica(admin, BUCKET_IMAGENES_ANUNCIOS, fila.imagen_url)
  await borrarVideo(admin, videoDe(fila))

  await registrarCambioImagen(admin, {
    actorId,
    entidad: 'publicidad',
    entidadId: fila.id,
    campo: 'imagen_url',
    urlAnterior: fila.imagen_url,
    urlNueva: null,
  })

  refrescar()
  return { ok: true }
}

/** Muestra u oculta una imagen en la portada, sin borrarla. */
export async function cambiarVisibilidadPublicidad(
  _prev: EstadoSubida,
  formData: FormData,
): Promise<EstadoSubida> {
  const actorId = await actorSuperAdmin()
  if (!actorId) return { error: SIN_PERMISO }

  const id = leerId(formData)
  if (id === null) return { error: 'Falta la imagen.' }
  const activo = formData.get('activo') === 'true'

  const admin = createAdminClient()
  const { error } = await admin.from('publicidad').update({ activo }).eq('id', id)
  if (error) return { error: mensajeDeError('No se pudo cambiar la imagen', error) }

  refrescar()
  return { ok: true }
}

/** Mueve una imagen un puesto en el carrusel (`sentido`: -1 antes, 1 después). */
export async function moverPublicidad(
  _prev: EstadoSubida,
  formData: FormData,
): Promise<EstadoSubida> {
  const actorId = await actorSuperAdmin()
  if (!actorId) return { error: SIN_PERMISO }

  const id = leerId(formData)
  const sentido = Number(formData.get('sentido'))
  if (id === null || (sentido !== -1 && sentido !== 1)) {
    return { error: 'No se pudo mover la imagen.' }
  }

  const admin = createAdminClient()
  const { data: piezas, error: errorLectura } = await admin
    .from('publicidad')
    .select('id')
    .order('orden', { ascending: true })
    .order('id', { ascending: true })
  if (errorLectura) return { error: mensajeDeError('No se pudo leer la publicidad', errorLectura) }

  const nuevo = ordenTrasMover(
    (piezas ?? []).map((p) => p.id),
    id,
    sentido,
  )
  // Ya estaba en ese extremo (o no está): no hay nada que hacer.
  if (!nuevo) return { ok: true }

  // Se renumeran todas: son diez como mucho, y así el orden nunca queda con
  // huecos ni con dos piezas en el mismo puesto.
  const resultados = await Promise.all(
    nuevo.map((piezaId, i) => admin.from('publicidad').update({ orden: i + 1 }).eq('id', piezaId)),
  )
  const fallo = resultados.find((r) => r.error)?.error
  if (fallo) return { error: mensajeDeError('No se pudo mover la imagen', fallo) }

  refrescar()
  return { ok: true }
}
