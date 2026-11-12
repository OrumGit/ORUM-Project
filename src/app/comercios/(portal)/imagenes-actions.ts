'use server'

/*
  EL COMERCIO CAMBIA SUS PROPIAS IMÁGENES  ·  logotipo y fotos (04/10/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: «que pueda cambiar el logo y también las
  fotografías que se verían del negocio; máximo 8 fotografías».

  Hasta hoy solo las cambiaba un administrador (`admin/comercios/imagenes-
  actions.ts`). Estas acciones hacen lo mismo para UN comercio: el de la
  sesión.

  LA REGLA QUE SOSTIENE ESTE ARCHIVO, la misma que la foto del socio: el
  identificador del comercio NO se lee del formulario. Se deriva de la sesión
  (`miComercio`). Si viniera del cliente, cualquier comercio podría cambiarle
  el logotipo a otro enviando otro `id`, y ningún control de la interfaz lo
  impediría. Aquí se usa el cliente `service_role`, que ignora RLS: esta
  comprobación ES la política.

  Y por lo mismo, cuando llega el `id` de una foto de la galería, se busca
  SIEMPRE con `comercio_id = el mío`: un `id` ajeno no encuentra nada.

  EL TOPE DE OCHO se comprueba aquí además de en la interfaz
  (`lib/comercios/fotos-negocio.ts`): la interfaz deja de ofrecer la novena,
  y el servidor la rechaza si alguien la manda igualmente.

  Mismo orden que el resto de subidas: primero Storage, y solo si fue bien se
  toca la base. O la imagen nueva, o la anterior intacta; nunca a medias.
*/

import { mensajeDeError } from '@/lib/shared/errores'
import { revalidatePath, updateTag } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRolComercio } from '@/lib/comercios/requerir-comercio'
import { TOPE_FOTOS_NEGOCIO, fotosUsadas } from '@/lib/comercios/fotos-negocio'
import { registrarCambioImagen } from '@/lib/imagenes/auditoria'
import {
  borrarObjeto,
  borrarPorUrlPublica,
  rutaDesdeUrlPublica,
  subirImagen,
} from '@/lib/imagenes/subir'
import {
  BUCKET_IMAGENES_COMERCIOS,
  claveGaleria,
  rutaGaleriaComercio,
  rutaLogoComercio,
  rutaPortadaComercio,
} from '@/lib/imagenes/rutas'
import { LIMITE_IMAGENES_COMERCIOS } from '@/lib/imagenes/validacion'
import type { EstadoSubida } from '@/lib/imagenes/estado'

type Admin = ReturnType<typeof createAdminClient>

const SIN_COMERCIO = 'Esta cuenta no está vinculada a ningún comercio.'
const ORIGEN = { origen: 'portal_comercio' }

/** El comercio de la sesión, con lo que estas acciones necesitan de él. */
async function miComercio(admin: Admin) {
  // Redirige al acceso si no hay sesión de comercio.
  const perfil = await requireRolComercio()

  const { data } = await admin
    .from('comercios')
    .select('id, logo_url, portada_url')
    .eq('perfil_id', perfil.userId)
    .is('deleted_at', null)
    .maybeSingle()

  return data ? { actorId: perfil.userId, comercio: data } : null
}

/**
 * Lo que enseña estas imágenes, en los cuatro portales. La fachada va detrás
 * de un caché con la etiqueta `publico` (`datos-publicos.ts`): sin soltarla,
 * el comercio vería su foto nueva aquí y la vieja en su ficha durante un
 * minuto, que es justo cuando va a mirar si funcionó.
 */
function refrescar(comercioId: number): void {
  updateTag('publico')
  revalidatePath('/comercios', 'layout')
  revalidatePath('/miembros')
  revalidatePath(`/miembros/comercios/${comercioId}`)
  revalidatePath('/OrumAdminLogin/comercios')
  revalidatePath(`/OrumAdminLogin/comercios/${comercioId}`)
  revalidatePath(`/OrumAdminLogin/comercios/${comercioId}/imagenes`)
}

/* ==========================================================================
   EL LOGOTIPO
   ========================================================================== */

export async function guardarMiLogo(
  _prev: EstadoSubida,
  formData: FormData,
): Promise<EstadoSubida> {
  const admin = createAdminClient()
  const mio = await miComercio(admin)
  if (!mio) return { error: SIN_COMERCIO }
  const { actorId, comercio } = mio

  const resultado = await subirImagen(admin, {
    archivo: formData.get('archivo'),
    bucket: BUCKET_IMAGENES_COMERCIOS,
    ruta: (ext) => rutaLogoComercio(comercio.id, ext),
    limite: LIMITE_IMAGENES_COMERCIOS,
  })
  if (!resultado.ok) return { error: resultado.error }

  const { error } = await admin
    .from('comercios')
    .update({ logo_url: resultado.url, updated_by: actorId })
    .eq('id', comercio.id)

  if (error) {
    // El archivo ya está arriba, pero la columna sigue apuntando al anterior:
    // lo que se ve del comercio NO cambió. Se dice tal cual.
    return {
      error: mensajeDeError('El logotipo se subió pero no se pudo guardar', error, 'Se conserva el anterior.'),
    }
  }

  await registrarCambioImagen(admin, {
    actorId,
    entidad: 'comercio',
    entidadId: comercio.id,
    campo: 'logo_url',
    urlAnterior: comercio.logo_url,
    urlNueva: resultado.url,
    contexto: ORIGEN,
  })

  refrescar(comercio.id)
  return { ok: true, url: resultado.url }
}

/* ==========================================================================
   LAS FOTOS  ·  la portada y la galería
   ========================================================================== */

/** El `id` de una foto de la galería, o `null` si el campo no trae uno válido. */
function leerFotoId(formData: FormData): number | null {
  const crudo = formData.get('foto_id')
  if (crudo === null || crudo === '') return null
  const id = Number(crudo)
  return Number.isInteger(id) && id > 0 ? id : null
}

/**
 * Guarda una foto del negocio. `destino` dice cuál:
 *
 *   · `portada`  — pone o sustituye la portada.
 *   · `galeria`  — con `foto_id`, sustituye esa pieza; sin él, añade una.
 */
export async function guardarMiFotoNegocio(
  _prev: EstadoSubida,
  formData: FormData,
): Promise<EstadoSubida> {
  const admin = createAdminClient()
  const mio = await miComercio(admin)
  if (!mio) return { error: SIN_COMERCIO }
  const { actorId, comercio } = mio

  const destino = String(formData.get('destino') ?? '')
  if (destino !== 'portada' && destino !== 'galeria') {
    return { error: 'Destino de imagen no válido.' }
  }

  const { data: galeria } = await admin
    .from('comercio_imagenes')
    .select('id, url, orden')
    .eq('comercio_id', comercio.id)
  const piezas = galeria ?? []

  const lleno =
    fotosUsadas(comercio.portada_url, piezas.length) >= TOPE_FOTOS_NEGOCIO
  const AVISO_LLENO = `Ya tienes las ${TOPE_FOTOS_NEGOCIO} fotos. Quita una para añadir otra.`

  /* ── La portada ─────────────────────────────────────────────────────── */
  if (destino === 'portada') {
    // Sustituir la portada no gasta cupo; estrenarla, sí.
    if (!comercio.portada_url && lleno) return { error: AVISO_LLENO }

    const resultado = await subirImagen(admin, {
      archivo: formData.get('archivo'),
      bucket: BUCKET_IMAGENES_COMERCIOS,
      ruta: (ext) => rutaPortadaComercio(comercio.id, ext),
      limite: LIMITE_IMAGENES_COMERCIOS,
    })
    if (!resultado.ok) return { error: resultado.error }

    const { error } = await admin
      .from('comercios')
      .update({ portada_url: resultado.url, updated_by: actorId })
      .eq('id', comercio.id)
    if (error) {
      return {
        error: mensajeDeError('La foto se subió pero no se pudo guardar', error, 'Se conserva la anterior.'),
      }
    }

    // La portada anterior sobra si vivía en otra ruta: el panel puede haber
    // puesto de portada una foto de la galería (`usarFotoComoPortada`).
    const rutaAnterior = rutaDesdeUrlPublica(comercio.portada_url, BUCKET_IMAGENES_COMERCIOS)
    if (rutaAnterior && rutaAnterior !== resultado.ruta) {
      await borrarObjeto(admin, BUCKET_IMAGENES_COMERCIOS, rutaAnterior)
    }

    await registrarCambioImagen(admin, {
      actorId,
      entidad: 'comercio',
      entidadId: comercio.id,
      campo: 'portada_url',
      urlAnterior: comercio.portada_url,
      urlNueva: resultado.url,
      contexto: ORIGEN,
    })

    refrescar(comercio.id)
    return { ok: true, url: resultado.url }
  }

  /* ── La galería ─────────────────────────────────────────────────────── */
  const fotoId = leerFotoId(formData)
  const anterior = fotoId === null ? null : piezas.find((p) => p.id === fotoId)

  // Un `id` que no es de este comercio no está en `piezas`: no se toca nada.
  if (fotoId !== null && !anterior) return { error: 'Esa foto ya no existe.' }
  if (!anterior && lleno) return { error: AVISO_LLENO }

  // Clave opaca y nueva en cada subida, también al sustituir: la URL cambia,
  // así que ni el navegador ni la CDN pueden seguir enseñando la anterior.
  const clave = claveGaleria(Date.now(), Math.random())
  const resultado = await subirImagen(admin, {
    archivo: formData.get('archivo'),
    bucket: BUCKET_IMAGENES_COMERCIOS,
    ruta: (ext) => rutaGaleriaComercio(comercio.id, clave, ext),
    limite: LIMITE_IMAGENES_COMERCIOS,
  })
  if (!resultado.ok) return { error: resultado.error }

  const { error } = anterior
    ? await admin
        .from('comercio_imagenes')
        .update({ url: resultado.url })
        .eq('id', anterior.id)
        .eq('comercio_id', comercio.id)
    : await admin.from('comercio_imagenes').insert({
        comercio_id: comercio.id,
        url: resultado.url,
        // Al final de la galería: las nuevas no desordenan las que ya había.
        orden: piezas.reduce((max, p) => Math.max(max, p.orden), 0) + 1,
      })

  if (error) {
    // La fila no entró: el archivo recién subido no lo referencia nadie.
    await borrarObjeto(admin, BUCKET_IMAGENES_COMERCIOS, resultado.ruta)
    return { error: mensajeDeError('No se pudo guardar la foto', error) }
  }

  // Sustituida: la anterior sobra. Solo si es nuestra; una URL externa no se toca.
  if (anterior) await borrarPorUrlPublica(admin, BUCKET_IMAGENES_COMERCIOS, anterior.url)

  await registrarCambioImagen(admin, {
    actorId,
    entidad: 'comercio_imagen',
    entidadId: comercio.id,
    campo: 'galeria',
    urlAnterior: anterior?.url ?? null,
    urlNueva: resultado.url,
    contexto: ORIGEN,
  })

  refrescar(comercio.id)
  return { ok: true, url: resultado.url }
}

/**
 * Quita una foto del negocio: la portada, o una pieza de la galería
 * (`foto_id`). Se va la referencia y, si el archivo es nuestro, el archivo.
 */
export async function quitarMiFotoNegocio(
  _prev: EstadoSubida,
  formData: FormData,
): Promise<EstadoSubida> {
  const admin = createAdminClient()
  const mio = await miComercio(admin)
  if (!mio) return { error: SIN_COMERCIO }
  const { actorId, comercio } = mio

  const destino = String(formData.get('destino') ?? '')

  if (destino === 'portada') {
    if (!comercio.portada_url) return { ok: true }

    const { error } = await admin
      .from('comercios')
      .update({ portada_url: null, updated_by: actorId })
      .eq('id', comercio.id)
    if (error) return { error: mensajeDeError('No se pudo quitar la portada', error) }

    await borrarPorUrlPublica(admin, BUCKET_IMAGENES_COMERCIOS, comercio.portada_url)

    await registrarCambioImagen(admin, {
      actorId,
      entidad: 'comercio',
      entidadId: comercio.id,
      campo: 'portada_url',
      urlAnterior: comercio.portada_url,
      urlNueva: null,
      contexto: ORIGEN,
    })

    refrescar(comercio.id)
    return { ok: true }
  }

  if (destino !== 'galeria') return { error: 'Destino de imagen no válido.' }

  const fotoId = leerFotoId(formData)
  if (fotoId === null) return { error: 'Falta la foto que se quiere quitar.' }

  const { data: fila } = await admin
    .from('comercio_imagenes')
    .select('id, url')
    .eq('id', fotoId)
    .eq('comercio_id', comercio.id)
    .maybeSingle()
  // Ya no está (o no es de este comercio): para quien pulsa, quedó quitada.
  if (!fila) return { ok: true }

  const { error } = await admin
    .from('comercio_imagenes')
    .delete()
    .eq('id', fila.id)
    .eq('comercio_id', comercio.id)
  if (error) return { error: mensajeDeError('No se pudo quitar la foto', error) }

  const ruta = rutaDesdeUrlPublica(fila.url, BUCKET_IMAGENES_COMERCIOS)
  if (ruta) await borrarObjeto(admin, BUCKET_IMAGENES_COMERCIOS, ruta)

  await registrarCambioImagen(admin, {
    actorId,
    entidad: 'comercio_imagen',
    entidadId: comercio.id,
    campo: 'galeria',
    urlAnterior: fila.url,
    urlNueva: null,
    contexto: ORIGEN,
  })

  refrescar(comercio.id)
  return { ok: true }
}
