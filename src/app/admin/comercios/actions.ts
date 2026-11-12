'use server'

import { mensajeDeError } from '@/lib/shared/errores'
import { revalidatePath, updateTag } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPerfilActual } from '@/lib/auth/auth'
import { enviarCorreoInvitacion } from '@/lib/correo/correo'
import { construirEnlaceActivacion, urlBaseSitio } from '@/lib/auth/activacion'
import { errorDeCorreoOcupado } from '@/lib/auth/correo-registrado'
import { cambiarCorreoDeCuenta } from '@/lib/auth/cambiar-correo'
import {
  leerFilasCategoria,
  revisarFilasCategoria,
  type FilaCategoriaComercio,
} from '@/lib/comercios/categorias-comercio'
import { faltaColumnaVisibilidad, type Portal } from '@/lib/comercios/visibilidad'

/** Verifica que quien ejecuta la acción sea super_admin. */
async function exigirSuperAdmin(): Promise<string | null> {
  const actor = await getPerfilActual()
  return actor && actor.activo && actor.rolCodigo === 'super_admin' ? actor.userId : null
}

export type CrearComercioState = {
  error?: string
  ok?: boolean
  email?: string
  /** Se creó, pero algo no quedó como se pidió (la visibilidad sin su migración). */
  aviso?: string
}

const AVISO_SIN_MIGRACION =
  'Falta aplicar en Supabase la migración 20261107120000_comercios_visibilidad.sql: hasta entonces el comercio se ve en los dos portales.'

/**
 * Lee y valida los campos comunes de un comercio desde el formulario.
 *
 * `marca_id` NO se lee ni se escribe: el selector de marca se retiró del
 * formulario (era confuso para el admin y `marcas` no tiene pantalla propia).
 * Las columnas y los datos siguen en la base. Por eso `editarComercio` tampoco
 * lo incluye en su `update`: mandarlo vacío borraría la marca de los comercios
 * que ya la tienen.
 */
function leerCamposComercio(formData: FormData) {
  const nombre = String(formData.get('nombre') ?? '').trim()
  const descripcion = String(formData.get('descripcion') ?? '').trim() || null
  // Un interruptor apagado no envía nada: la ausencia ES el `false`.
  const indexable = formData.get('indexable') === 'on'
  // De 1 a 3 categorías, cada una con su subcategoría opcional: una pareja
  // `categoria_id` / `subcategoria_id` por fila del formulario.
  const categorias = leerFilasCategoria(
    formData.getAll('categoria_id').map(String),
    formData.getAll('subcategoria_id').map(String),
  )
  // Dónde se ve (07/11/2026): un interruptor por portal, como `indexable`.
  const visible = {
    publico: formData.get('visible_publico') === 'on',
    miembros: formData.get('visible_miembros') === 'on',
  }
  return { nombre, descripcion, categorias, indexable, visible }
}

/**
 * Las categorías tienen que ser de 1 a 3, sin repetir, y cada subcategoría de
 * SU categoría: el formulario ya lo garantiza, pero el servidor es quien
 * decide. Devuelve el aviso, o `null` si valen.
 */
async function categoriasInvalidas(
  admin: ReturnType<typeof createAdminClient>,
  filas: readonly FilaCategoriaComercio[],
): Promise<string | null> {
  const subcategoriaIds = filas.flatMap((f) =>
    f.subcategoriaId !== null && Number.isInteger(f.subcategoriaId) ? [f.subcategoriaId] : [],
  )
  const categoriaDe = new Map<number, number>()
  if (subcategoriaIds.length > 0) {
    const { data } = await admin
      .from('subcategorias')
      .select('id, categoria_id')
      .in('id', subcategoriaIds)
    for (const s of data ?? []) categoriaDe.set(s.id, s.categoria_id)
  }
  return revisarFilasCategoria(filas, categoriaDe)
}

/** Guarda las categorías del comercio en una transacción (y copia la primera a las columnas viejas). */
async function guardarCategorias(
  admin: ReturnType<typeof createAdminClient>,
  comercioId: number,
  filas: readonly FilaCategoriaComercio[],
  actorId: string,
) {
  return admin.rpc('reemplazar_categorias_comercio', {
    p_comercio_id: comercioId,
    p_filas: filas.map((f) => ({ categoria_id: f.categoriaId, subcategoria_id: f.subcategoriaId })),
    p_actor: actorId,
  })
}

/**
 * Crea un comercio: invitación de Auth (enlace de un solo uso, sin contraseña
 * que emailar ni mostrar) → upsert de `perfiles` (rol comercio) → insert en
 * `comercios`. Si algo falla, se revierte lo anterior.
 */
export async function crearComercio(
  _prev: CrearComercioState,
  formData: FormData,
): Promise<CrearComercioState> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) return { error: 'No tienes permiso para realizar esta acción.' }

  const email = String(formData.get('correo') ?? '').trim().toLowerCase()
  if (!email || !email.includes('@')) return { error: 'Ingresa un correo electrónico válido.' }

  const campos = leerCamposComercio(formData)
  if (!campos.nombre) return { error: 'El nombre del comercio es obligatorio.' }

  const admin = createAdminClient()

  const errCategorias = await categoriasInvalidas(admin, campos.categorias)
  if (errCategorias) return { error: errCategorias }

  const { data: rol } = await admin.from('roles').select('id').eq('codigo', 'comercio').single()
  if (!rol) return { error: 'No se encontró el rol "comercio" en la base de datos.' }

  const errCorreo = await errorDeCorreoOcupado(admin, email)
  if (errCorreo) return { error: errCorreo }

  const { data: creado, error: errAuth } = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: urlBaseSitio() },
  })
  if (errAuth || !creado?.user) {
    const msg = /already been registered|already registered|exists/i.test(errAuth?.message ?? '')
      ? 'Ya existe un usuario con ese correo.'
      : mensajeDeError('No se pudo crear el usuario', errAuth)
    return { error: msg }
  }
  const userId = creado.user.id

  const revertir = async () => {
    await admin.from('perfiles').delete().eq('id', userId)
    await admin.auth.admin.deleteUser(userId)
  }

  const { error: errPerfil } = await admin
    .from('perfiles')
    .upsert({ updated_by: actorId, id: userId, rol_id: rol.id, activo: true }, { onConflict: 'id' })
  if (errPerfil) {
    await revertir()
    return { error: mensajeDeError('No se pudo crear el perfil', errPerfil) }
  }

  const fila = {
    perfil_id: userId,
    nombre: campos.nombre,
    descripcion: campos.descripcion,
    indexable: campos.indexable,
    activo: true,
  }
  let { data: comercioNuevo, error: errComercio } = await admin
    .from('comercios')
    .insert({
      updated_by: actorId,
      ...fila,
      visible_publico: campos.visible.publico,
      visible_miembros: campos.visible.miembros,
    })
    .select('id')
    .single()
  // Sin la migración de visibilidad: se crea igual, y se avisa si pedía ocultarlo.
  let aviso: string | undefined
  if (faltaColumnaVisibilidad(errComercio)) {
    ;({ data: comercioNuevo, error: errComercio } = await admin
      .from('comercios')
      .insert({ updated_by: actorId, ...fila })
      .select('id')
      .single())
    if (!campos.visible.publico || !campos.visible.miembros) aviso = AVISO_SIN_MIGRACION
  }
  if (errComercio || !comercioNuevo) {
    await revertir()
    return { error: mensajeDeError('No se pudo registrar el comercio', errComercio) }
  }

  const { error: errGuardado } = await guardarCategorias(
    admin,
    comercioNuevo.id,
    campos.categorias,
    actorId,
  )
  if (errGuardado) {
    await admin.from('comercios').delete().eq('id', comercioNuevo.id)
    await revertir()
    return { error: mensajeDeError('No se pudieron guardar las categorías', errGuardado) }
  }

  await enviarCorreoInvitacion({
    nombre: campos.nombre,
    correo: email,
    urlInvitacion: construirEnlaceActivacion(
      urlBaseSitio(),
      'comercio',
      creado.properties.hashed_token,
      creado.properties.verification_type,
    ),
  })

  revalidatePath('/admin/comercios')
  updateTag('publico')
  return { ok: true, email, aviso }
}

export type EditarComercioState = { error?: string; ok?: boolean }

/**
 * Edita nombre, descripción, categorías (con sus subcategorías), indexable y (si cambió) el correo.
 * El logo ya no se toca aquí: se sube como archivo desde la pestaña de imágenes.
 */
export async function editarComercio(
  _prev: EditarComercioState,
  formData: FormData,
): Promise<EditarComercioState> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) return { error: 'No tienes permiso para realizar esta acción.' }

  const id = Number(formData.get('id'))
  const perfilId = String(formData.get('perfil_id') ?? '')
  if (!Number.isInteger(id) || id < 1) return { error: 'Falta el identificador del comercio.' }

  const campos = leerCamposComercio(formData)
  if (!campos.nombre) return { error: 'El nombre del comercio es obligatorio.' }

  const admin = createAdminClient()

  const errCategorias = await categoriasInvalidas(admin, campos.categorias)
  if (errCategorias) return { error: errCategorias }

  const { error } = await admin
    .from('comercios')
    .update({
      updated_by: actorId,
      nombre: campos.nombre,
      descripcion: campos.descripcion,
      indexable: campos.indexable,
    })
    .eq('id', id)
  if (error) return { error: mensajeDeError('No se pudieron guardar los cambios', error) }

  const { error: errGuardado } = await guardarCategorias(admin, id, campos.categorias, actorId)
  if (errGuardado) {
    return { error: mensajeDeError('No se pudieron guardar las categorías', errGuardado) }
  }

  const correo = String(formData.get('correo') ?? '').trim().toLowerCase()
  const correoOriginal = String(formData.get('correo_original') ?? '').trim().toLowerCase()
  if (perfilId && correo && correo !== correoOriginal) {
    if (!correo.includes('@')) return { error: 'El correo electrónico no es válido.' }
    const cambio = await cambiarCorreoDeCuenta(admin, perfilId, correo)
    if (!cambio.ok) return { error: cambio.error }
  }

  revalidatePath('/admin/comercios')
  revalidatePath(`/admin/comercios/${id}`)
  updateTag('publico')
  revalidatePath('/sitemap.xml')
  return { ok: true }
}

/** Activa o desactiva el comercio como aliado (`comercios.activo`, D2). */
export async function cambiarEstadoComercio(formData: FormData): Promise<void> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) redirect('/')

  const id = Number(formData.get('id'))
  const activar = String(formData.get('activar') ?? '') === 'true'
  if (!Number.isInteger(id) || id < 1) redirect('/admin/comercios')

  const admin = createAdminClient()
  await admin.from('comercios').update({ updated_by: actorId, activo: activar }).eq('id', id)

  revalidatePath('/admin/comercios')
  revalidatePath(`/admin/comercios/${id}`)
  updateTag('publico')
  redirect(`/admin/comercios/${id}`)
}

export type VisibilidadState = { error?: string }

/**
 * Muestra u oculta el comercio en UN portal (07/11/2026): `visible_publico`
 * o `visible_miembros`. No toca `activo` ni la caja. Suelta la caché de la
 * fachada para que se note al momento, y el sitemap (una ficha oculta del
 * Portal Público no se anuncia a los buscadores).
 */
export async function cambiarVisibilidadComercio(
  _prev: VisibilidadState,
  formData: FormData,
): Promise<VisibilidadState> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) return { error: 'No tienes permiso para realizar esta acción.' }

  const id = Number(formData.get('id'))
  const portal = String(formData.get('portal') ?? '') as Portal
  const visible = String(formData.get('visible') ?? '') === 'true'
  if (!Number.isInteger(id) || id < 1) return { error: 'Falta el identificador del comercio.' }
  if (portal !== 'publico' && portal !== 'miembros') return { error: 'No sabemos en qué portal cambiarlo.' }

  const admin = createAdminClient()
  const cambio = portal === 'publico' ? { visible_publico: visible } : { visible_miembros: visible }
  const { error } = await admin
    .from('comercios')
    .update({ updated_by: actorId, ...cambio })
    .eq('id', id)
    .is('deleted_at', null)
  if (faltaColumnaVisibilidad(error)) {
    return { error: 'Falta aplicar en Supabase la migración 20261107120000_comercios_visibilidad.sql.' }
  }
  if (error) return { error: mensajeDeError('No se pudo cambiar dónde se ve', error) }

  revalidatePath('/admin/comercios')
  revalidatePath(`/admin/comercios/${id}`)
  revalidatePath('/sitemap.xml')
  updateTag('publico')
  return {}
}

/** Activa o desactiva el acceso a la cuenta del comercio (`perfiles.activo`, D2). */
export async function cambiarEstadoAccesoComercio(formData: FormData): Promise<void> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) redirect('/')

  const id = Number(formData.get('id'))
  const perfilId = String(formData.get('perfil_id') ?? '')
  const activar = String(formData.get('activar') ?? '') === 'true'
  if (!Number.isInteger(id) || id < 1 || !perfilId) redirect('/admin/comercios')

  const admin = createAdminClient()
  await admin.from('perfiles').update({ updated_by: actorId, activo: activar }).eq('id', perfilId)

  revalidatePath('/admin/comercios')
  revalidatePath(`/admin/comercios/${id}`)
  updateTag('publico')
  redirect(`/admin/comercios/${id}`)
}
