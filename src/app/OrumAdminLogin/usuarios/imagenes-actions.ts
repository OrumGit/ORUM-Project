'use server'

/*
  AVATAR DE UN USUARIO DEL CLUB  (administrador o empleado)

  Archivo aparte de `actions.ts` por la misma razón que en comercios: aquel
  está auditado y la subida de archivos es superficie nueva.

  Autorización: `super_admin` activo, el mismo criterio que usa
  `src/app/admin/usuarios/actions.ts` para todo lo demás de esta sección.
  Un empleado no cambia avatares, ni el suyo: si eso se quiere, se decide
  aparte y se escribe aquí explícitamente.
*/

import { mensajeDeError } from '@/lib/shared/errores'
import { revalidatePath } from 'next/cache'
import { getPerfilActual } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { registrarCambioImagen } from '@/lib/imagenes/auditoria'
import { subirImagen } from '@/lib/imagenes/subir'
import { BUCKET_AVATARES, rutaAvatarPerfil } from '@/lib/imagenes/rutas'
import { LIMITE_AVATARES } from '@/lib/imagenes/validacion'
import type { EstadoSubida } from '@/lib/imagenes/estado'

async function actorSuperAdmin(): Promise<string | null> {
  const actor = await getPerfilActual()
  if (!actor || !actor.activo || actor.rolCodigo !== 'super_admin') return null
  return actor.userId
}

/**
 * Sustituye `perfiles.avatar_url`.
 *
 * La ruta lleva el uuid del perfil —`perfiles/{id}/avatar.{ext}`— porque es lo
 * que permite que una política de Storage compare la carpeta contra
 * `auth.uid()`. No la cambies sin reescribir la política.
 */
export async function guardarAvatarUsuario(
  _prev: EstadoSubida,
  formData: FormData,
): Promise<EstadoSubida> {
  const actorId = await actorSuperAdmin()
  if (!actorId) return { error: 'No tienes permiso para realizar esta acción.' }

  const perfilId = String(formData.get('perfil_id') ?? '').trim()
  if (!perfilId) return { error: 'Falta el identificador del usuario.' }

  const admin = createAdminClient()

  const { data: perfil } = await admin
    .from('perfiles')
    .select('id, avatar_url')
    .eq('id', perfilId)
    .maybeSingle()
  if (!perfil) return { error: 'El usuario ya no existe.' }

  const resultado = await subirImagen(admin, {
    archivo: formData.get('archivo'),
    bucket: BUCKET_AVATARES,
    ruta: (ext) => rutaAvatarPerfil(perfilId, ext),
    limite: LIMITE_AVATARES,
  })
  if (!resultado.ok) return { error: resultado.error }

  const { error } = await admin
    .from('perfiles')
    .update({ avatar_url: resultado.url, updated_by: actorId })
    .eq('id', perfilId)

  if (error) {
    return {
      error: mensajeDeError('La imagen se subió pero no se pudo guardar en el usuario', error, 'Se conserva la anterior.'),
    }
  }

  await registrarCambioImagen(admin, {
    actorId,
    entidad: 'perfil',
    // `entidad_id` es numérico y la clave de `perfiles` es un uuid: el
    // identificador real viaja en `datos_nuevos`, no se fuerza un número.
    entidadId: null,
    campo: 'avatar_url',
    urlAnterior: perfil.avatar_url,
    urlNueva: resultado.url,
    contexto: { perfil_id: perfilId },
  })

  revalidatePath('/OrumAdminLogin/usuarios')
  revalidatePath(`/OrumAdminLogin/usuarios/${perfilId}/avatar`)
  return { ok: true, url: resultado.url }
}
