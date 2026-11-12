'use server'

import { mensajeDeError } from '@/lib/shared/errores'
import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPerfilActual } from '@/lib/auth/auth'
import { registrarCambioImagen } from '@/lib/imagenes/auditoria'
import { BUCKET_IMAGENES_ANUNCIOS, rutaImagenAnuncio } from '@/lib/imagenes/rutas'
import { borrarPorUrlPublica, subirImagen } from '@/lib/imagenes/subir'
import { LIMITE_IMAGENES_COMERCIOS } from '@/lib/imagenes/validacion'
import {
  faltanColumnasDeProgramacion,
  instanteBogota,
  revisarProgramacion,
} from '@/lib/anuncios/programacion'

export type AnuncioState = { error?: string; ok?: boolean }

const TITULO_MAXIMO = 120
const CUERPO_MAXIMO = 600

type Admin = ReturnType<typeof createAdminClient>

/** Verifica que quien ejecuta la acción sea super_admin. Calcado de planes/actions.ts. */
async function exigirSuperAdmin(): Promise<{ actorId: string } | null> {
  const actor = await getPerfilActual()
  if (!actor || !actor.activo || actor.rolCodigo !== 'super_admin') return null
  return { actorId: actor.userId }
}

/**
 * Refresca las superficies que leen anuncios. `updateTag('publico')` además
 * suelta la caché de 60 s de la fachada (21/10/2026): sin ella, una novedad
 * editada tardaba hasta un minuto en verse en la portada y en `/novedades`.
 */
function refrescar(): void {
  revalidatePath('/admin/anuncios')
  revalidatePath('/')
  revalidatePath('/novedades')
  revalidatePath('/miembros')
  updateTag('publico')
}

/** Lee y valida los campos comunes de un anuncio desde el formulario. */
function leerCampos(formData: FormData):
  | {
      ok: true
      titulo: string
      cuerpo: string
      mostrarPublico: boolean
      mostrarMiembros: boolean
      desde: string | null
      hasta: string | null
      programada: boolean
    }
  | { ok: false; error: string } {
  const titulo = String(formData.get('titulo') ?? '').trim()
  if (!titulo) return { ok: false, error: 'El título es obligatorio.' }
  if (titulo.length > TITULO_MAXIMO) {
    return { ok: false, error: `El título no puede pasar de ${TITULO_MAXIMO} caracteres.` }
  }

  const cuerpo = String(formData.get('cuerpo') ?? '').trim()
  if (!cuerpo) return { ok: false, error: 'El texto es obligatorio.' }
  if (cuerpo.length > CUERPO_MAXIMO) {
    return { ok: false, error: `El texto no puede pasar de ${CUERPO_MAXIMO} caracteres.` }
  }

  const mostrarPublico = formData.get('mostrar_publico') === 'true'
  const mostrarMiembros = formData.get('mostrar_miembros') === 'true'
  if (!mostrarPublico && !mostrarMiembros) {
    return { ok: false, error: 'Elige al menos un portal donde mostrarla.' }
  }

  /*
    LA PROGRAMACIÓN (21/10/2026). Cada extremo se enciende con su interruptor
    y lleva fecha y hora de Colombia, que `instanteBogota` convierte a un
    instante. Apagado, el extremo queda vacío: sale al guardar / no se acaba.
  */
  const programarInicio = formData.get('programar_inicio') === 'true'
  const programarFin = formData.get('programar_fin') === 'true'
  const desde = programarInicio
    ? instanteBogota(String(formData.get('inicio_fecha') ?? ''), String(formData.get('inicio_hora') ?? ''))
    : null
  const hasta = programarFin
    ? instanteBogota(String(formData.get('fin_fecha') ?? ''), String(formData.get('fin_hora') ?? ''))
    : null
  if (programarInicio && !desde) return { ok: false, error: 'Escribe la fecha y la hora en que sale.' }
  if (programarFin && !hasta) return { ok: false, error: 'Escribe la fecha y la hora en que termina.' }
  const errorProgramacion = revisarProgramacion(desde, hasta, new Date())
  if (errorProgramacion) return { ok: false, error: errorProgramacion }

  return {
    ok: true,
    titulo,
    cuerpo,
    mostrarPublico,
    mostrarMiembros,
    desde,
    hasta,
    programada: programarInicio || programarFin,
  }
}

const SIN_MIGRACION =
  'Para programar novedades falta aplicar en la base la actualización «20261021120000_anuncios_programados.sql». Guarda sin programar, o aplícala y vuelve a intentarlo.'

/**
 * Guarda y, si la base aún no tiene las columnas de programación (la
 * migración se aplica a mano), vuelve a intentarlo sin ellas cuando no se
 * pidió programar nada: así el panel sigue funcionando mientras tanto.
 */
async function escribirConProgramacion<R extends { error: { code?: string; message?: string } | null }>(
  escribir: (conFechas: boolean) => PromiseLike<R>,
  programada: boolean,
): Promise<R | { error: { message: string; code: 'SIN_MIGRACION' } }> {
  const primero = await escribir(true)
  if (!faltanColumnasDeProgramacion(primero.error)) return primero
  if (programada) return { error: { message: SIN_MIGRACION, code: 'SIN_MIGRACION' } }
  return escribir(false)
}

/** El archivo de imagen que viene con el formulario, si viene. */
function archivoDe(formData: FormData): File | null {
  const archivo = formData.get('archivo')
  return archivo instanceof File && archivo.size > 0 ? archivo : null
}

/*
  LA IMAGEN VIAJA CON EL FORMULARIO (21/10/2026: «editar novedad está feo y
  complicado, y no me permite borrar la imagen»). Antes eran dos formularios
  —los textos y, aparte, «Subir imagen»— y no había forma de quitarla. Ahora
  un solo «Guardar» lleva los textos, la imagen nueva (ya encuadrada en el
  navegador) o la orden de quitar la que había.

  La imagen se sube DESPUÉS de guardar los textos: si Storage falla, la
  novedad queda guardada y el aviso lo dice; la imagen anterior no se toca.
*/
async function aplicarImagen(
  admin: Admin,
  actorId: string,
  anuncioId: number,
  urlAnterior: string | null,
  formData: FormData,
): Promise<string | null> {
  const archivo = archivoDe(formData)
  const quitar = formData.get('quitar_imagen') === '1'

  if (archivo) {
    const subida = await subirImagen(admin, {
      archivo,
      bucket: BUCKET_IMAGENES_ANUNCIOS,
      ruta: (ext) => rutaImagenAnuncio(anuncioId, ext),
      limite: LIMITE_IMAGENES_COMERCIOS,
    })
    if (!subida.ok) return `La novedad se guardó, pero la imagen no: ${subida.error}`

    const { error } = await admin
      .from('anuncios')
      .update({ imagen_url: subida.url, updated_by: actorId })
      .eq('id', anuncioId)
    if (error) {
      return mensajeDeError('La novedad se guardó, pero no su imagen', error)
    }
    await registrarCambioImagen(admin, {
      actorId,
      entidad: 'anuncio',
      entidadId: anuncioId,
      campo: 'imagen_url',
      urlAnterior,
      urlNueva: subida.url,
    })
    return null
  }

  if (quitar && urlAnterior) {
    const { error } = await admin
      .from('anuncios')
      .update({ imagen_url: null, updated_by: actorId })
      .eq('id', anuncioId)
    if (error) return mensajeDeError('La novedad se guardó, pero no se pudo quitar su imagen', error)
    // Best-effort: si el archivo ya no estaba, la novedad queda igual sin imagen.
    await borrarPorUrlPublica(admin, BUCKET_IMAGENES_ANUNCIOS, urlAnterior)
    await registrarCambioImagen(admin, {
      actorId,
      entidad: 'anuncio',
      entidadId: anuncioId,
      campo: 'imagen_url',
      urlAnterior,
      urlNueva: null,
    })
  }
  return null
}

export async function crearAnuncio(_prev: AnuncioState, formData: FormData): Promise<AnuncioState> {
  const actor = await exigirSuperAdmin()
  if (!actor) return { error: 'No tienes permiso para realizar esta acción.' }

  const campos = leerCampos(formData)
  if (!campos.ok) return { error: campos.error }

  const admin = createAdminClient()
  const resultado = await escribirConProgramacion(
    (conFechas) =>
      admin
        .from('anuncios')
        .insert({
          updated_by: actor.actorId,
          titulo: campos.titulo,
          cuerpo: campos.cuerpo,
          mostrar_publico: campos.mostrarPublico,
          mostrar_miembros: campos.mostrarMiembros,
          activo: true,
          creado_por: actor.actorId,
          ...(conFechas ? { publicar_desde: campos.desde, publicar_hasta: campos.hasta } : {}),
        })
        .select('id')
        .single(),
    campos.programada,
  )
  if (resultado.error?.code === 'SIN_MIGRACION') return { error: SIN_MIGRACION }
  const creado = 'data' in resultado ? resultado.data : null
  if (resultado.error || !creado) {
    return { error: mensajeDeError('No se pudo crear la novedad', resultado.error) }
  }

  const errorImagen = await aplicarImagen(admin, actor.actorId, creado.id, null, formData)
  refrescar()
  return errorImagen ? { error: errorImagen } : { ok: true }
}

export async function editarAnuncio(_prev: AnuncioState, formData: FormData): Promise<AnuncioState> {
  const actor = await exigirSuperAdmin()
  if (!actor) return { error: 'No tienes permiso para realizar esta acción.' }

  const id = Number(formData.get('id'))
  if (!Number.isInteger(id) || id < 1) return { error: 'Falta el identificador de la novedad.' }

  const campos = leerCampos(formData)
  if (!campos.ok) return { error: campos.error }

  const admin = createAdminClient()
  const { data: anterior } = await admin
    .from('anuncios')
    .select('imagen_url')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (!anterior) return { error: 'La novedad ya no existe.' }

  const { error } = await escribirConProgramacion(
    (conFechas) =>
      admin
        .from('anuncios')
        .update({
          updated_by: actor.actorId,
          titulo: campos.titulo,
          cuerpo: campos.cuerpo,
          mostrar_publico: campos.mostrarPublico,
          mostrar_miembros: campos.mostrarMiembros,
          ...(conFechas ? { publicar_desde: campos.desde, publicar_hasta: campos.hasta } : {}),
        })
        .eq('id', id),
    campos.programada,
  )
  if (error?.code === 'SIN_MIGRACION') return { error: SIN_MIGRACION }
  if (error) return { error: mensajeDeError('No se pudieron guardar los cambios', error) }

  const errorImagen = await aplicarImagen(admin, actor.actorId, id, anterior.imagen_url, formData)
  refrescar()
  return errorImagen ? { error: errorImagen } : { ok: true }
}

/** Activa o desactiva un anuncio (anuncios.activo). Calcado de cambiarEstadoPlan. */
export async function cambiarEstadoAnuncio(formData: FormData): Promise<void> {
  const actor = await exigirSuperAdmin()
  if (!actor) redirect('/')

  const id = Number(formData.get('id'))
  const activar = String(formData.get('activar') ?? '') === 'true'
  if (!Number.isInteger(id) || id < 1) redirect('/admin/anuncios')

  const admin = createAdminClient()
  await admin.from('anuncios').update({ updated_by: actor.actorId, activo: activar }).eq('id', id)

  refrescar()
  redirect('/admin/anuncios')
}
