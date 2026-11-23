'use server'

/*
  FOTO DEL SOCIO, DESDE EL PANEL

  `miembros.foto_url` y no `perfiles.avatar_url`: un miembro puede existir sin
  cuenta (`perfil_id` es nullable), y la foto tiene que poder estar antes que
  el acceso.

  Autorización: `super_admin` o `empleado` activos — el mismo criterio con el
  que `src/app/admin/miembros/actions.ts` deja registrar y editar miembros. Es
  quien atiende en el mostrador, que es donde se toma la foto.
*/

import { mensajeDeError } from '@/lib/shared/errores'
import { revalidatePath } from 'next/cache'
import { getPerfilActual } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { registrarCambioImagen } from '@/lib/imagenes/auditoria'
import { borrarObjeto, borrarPorUrlPublica, rutaDesdeUrlPublica, subirImagen } from '@/lib/imagenes/subir'
import { BUCKET_AVATARES, nuevaClaveFoto, rutaFotoMiembro } from '@/lib/imagenes/rutas'
import { LIMITE_AVATARES } from '@/lib/imagenes/validacion'
import { CAMPO_DECLARACION, declaracionAceptada, esMotivoRetirada } from '@/lib/imagenes/derechos'
import type { EstadoSubida } from '@/lib/imagenes/estado'

async function actorDelPanel(): Promise<string | null> {
  const actor = await getPerfilActual()
  if (!actor || !actor.activo) return null
  if (actor.rolCodigo !== 'super_admin' && actor.rolCodigo !== 'empleado') return null
  return actor.userId
}

export async function guardarFotoMiembro(
  _prev: EstadoSubida,
  formData: FormData,
): Promise<EstadoSubida> {
  const actorId = await actorDelPanel()
  if (!actorId) return { error: 'No tienes permiso para realizar esta acción.' }

  // Antes de tocar Storage: sin declaración no se sube nada.
  if (!declaracionAceptada(formData.get(CAMPO_DECLARACION))) {
    return { error: 'Confirma que el socio te entregó esta foto y tiene derecho a usarla.' }
  }

  const miembroId = Number(formData.get('id'))
  if (!Number.isInteger(miembroId) || miembroId < 1) {
    return { error: 'Falta el identificador del miembro.' }
  }

  const admin = createAdminClient()

  const { data: miembro } = await admin
    .from('miembros')
    .select('id, foto_url')
    .eq('id', miembroId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!miembro) return { error: 'El miembro ya no existe.' }

  // La clave se genera UNA vez por subida: `ruta` se llama varias veces (la
  // extensión real y las variantes que `subirImagen` limpia) y todas deben
  // caer en la misma carpeta.
  const clave = nuevaClaveFoto()
  const resultado = await subirImagen(admin, {
    archivo: formData.get('archivo'),
    bucket: BUCKET_AVATARES,
    ruta: (ext) => rutaFotoMiembro(miembroId, ext, clave),
    limite: LIMITE_AVATARES,
  })
  if (!resultado.ok) return { error: resultado.error }

  const { error } = await admin
    .from('miembros')
    .update({ foto_url: resultado.url, foto_declaracion_at: new Date().toISOString(), updated_by: actorId })
    .eq('id', miembroId)

  if (error) {
    // La foto nueva ya está subida pero no quedó guardada: se borra para no
    // dejar un archivo huérfano (la ruta lleva una clave por subida, ya no se
    // sustituye sola).
    await borrarObjeto(admin, BUCKET_AVATARES, resultado.ruta)
    return {
      error: mensajeDeError('La foto se subió pero no se pudo guardar en el miembro', error, 'Se conserva la anterior.'),
    }
  }

  // Guardada la nueva, la anterior sobra. Se borra por la dirección que tenía.
  await borrarPorUrlPublica(admin, BUCKET_AVATARES, miembro.foto_url)

  await registrarCambioImagen(admin, {
    actorId,
    entidad: 'miembro',
    entidadId: miembroId,
    campo: 'foto_url',
    urlAnterior: miembro.foto_url,
    urlNueva: resultado.url,
  })

  revalidatePath('/OrumAdminLogin/miembros')
  revalidatePath(`/OrumAdminLogin/miembros/${miembroId}`)
  revalidatePath(`/OrumAdminLogin/miembros/${miembroId}/foto`)
  // El carnet del socio muestra esta misma foto.
  revalidatePath('/miembros/perfil')
  return { ok: true, url: resultado.url }
}

/*
  RETIRAR LA FOTO DE UN SOCIO  ·  solo super_admin

  Es la mitad operativa del procedimiento de aviso y retirada. Decisión del
  propietario (30/09/2026): por ahora SOLO el administrador retira; los
  empleados pueden cambiar la foto pero no retirarla. La autorización real es
  esta, no que el botón se oculte.
*/
export async function retirarFotoMiembro(
  _prev: EstadoSubida,
  formData: FormData,
): Promise<EstadoSubida> {
  const actor = await getPerfilActual()
  if (!actor || !actor.activo || actor.rolCodigo !== 'super_admin') {
    return { error: 'Solo el administrador puede retirar fotos.' }
  }

  const motivo = formData.get('motivo')
  if (!esMotivoRetirada(motivo)) return { error: 'Elige un motivo de la lista.' }

  const miembroId = Number(formData.get('id'))
  if (!Number.isInteger(miembroId) || miembroId < 1) {
    return { error: 'Falta el identificador del miembro.' }
  }

  const admin = createAdminClient()
  const { data: miembro } = await admin
    .from('miembros')
    .select('id, foto_url')
    .eq('id', miembroId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!miembro) return { error: 'El miembro ya no existe.' }
  if (!miembro.foto_url) return { error: 'Este miembro no tiene foto que retirar.' }

  // 1) El ARCHIVO primero, y comprobando el resultado: en un reclamo de derechos
  //    lo que hay que eliminar es precisamente el objeto que sirve el bucket
  //    público. `remove()` no lanza: devuelve `{ error }`, así que se mira. Si
  //    falla, no se toca nada más y el administrador puede reintentar. La ruta
  //    sale de la dirección GUARDADA (lleva una clave por subida, ya no se
  //    puede reconstruir desde el id). Si la dirección no es de nuestro
  //    almacenamiento no hay archivo que borrar.
  const ruta = rutaDesdeUrlPublica(miembro.foto_url, BUCKET_AVATARES)
  if (ruta) {
    const { error: errorArchivo } = await admin.storage.from(BUCKET_AVATARES).remove([ruta])
    if (errorArchivo) {
      return { error: mensajeDeError('No se pudo borrar el archivo de la foto', errorArchivo, 'Inténtalo de nuevo.') }
    }
  }

  // 2) La fila. Si esto fallara, el archivo ya no existe y el carnet enseñaría
  //    una imagen rota hasta reintentar: reintentar es seguro (borrar de nuevo
  //    lo que ya no está no da error).
  const { error } = await admin
    .from('miembros')
    .update({ foto_url: null, foto_declaracion_at: null, updated_by: actor.userId })
    .eq('id', miembroId)
  if (error) return { error: mensajeDeError('No se pudo retirar la foto', error, 'Inténtalo de nuevo.') }

  // 3) Rastro: quién, cuándo y por qué.
  await registrarCambioImagen(admin, {
    actorId: actor.userId,
    entidad: 'miembro',
    entidadId: miembroId,
    campo: 'foto_url',
    urlAnterior: miembro.foto_url,
    urlNueva: null,
    contexto: { accion: 'retirada', motivo },
  })

  revalidatePath('/OrumAdminLogin/miembros')
  revalidatePath(`/OrumAdminLogin/miembros/${miembroId}`)
  revalidatePath('/miembros/perfil')
  revalidatePath('/miembros', 'layout')
  return { ok: true, url: null }
}
