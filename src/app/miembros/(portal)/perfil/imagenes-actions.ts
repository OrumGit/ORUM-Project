'use server'

/*
  EL SOCIO CAMBIA SU PROPIA FOTO

  La regla que sostiene esta acción: el identificador del miembro NO se lee
  del formulario. Se deriva de la sesión. Si viniera del cliente, cualquiera
  podría cambiar la foto del carnet de otro socio enviando otro `id`, y ningún
  control de la interfaz lo impediría.

  La política de la base ya restringe la escritura a la carpeta propia; esto
  es la misma verdad expresada del lado de la aplicación, no un duplicado
  ocioso: aquí se usa el cliente `service_role`, que ignora RLS.

  UNA VEZ AL MES (29/10/2026, encargo del cliente): el socio sube o cambia su
  foto una vez por mes del calendario y la quita cuando quiera; quitarla no
  devuelve el cambio (`fotoDelMes`, `lib/miembros/foto-mensual.ts`). La
  interfaz lo dice y esconde el botón, pero quien decide es esta acción.
*/

import { mensajeDeError } from '@/lib/shared/errores'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireRolMiembro } from '@/lib/miembros/requerir-miembro'
import { registrarCambioImagen } from '@/lib/imagenes/auditoria'
import { borrarObjeto, borrarPorUrlPublica, rutaDesdeUrlPublica, subirImagen } from '@/lib/imagenes/subir'
import { BUCKET_AVATARES, nuevaClaveFoto, rutaFotoMiembro } from '@/lib/imagenes/rutas'
import { LIMITE_AVATARES } from '@/lib/imagenes/validacion'
import { CAMPO_DECLARACION, declaracionAceptada } from '@/lib/imagenes/derechos'
import type { EstadoSubida } from '@/lib/imagenes/estado'
import { fotoDelMes, ORIGEN_PORTAL_SOCIO } from '@/lib/miembros/foto-socio'

export async function guardarMiFoto(
  _prev: EstadoSubida,
  formData: FormData,
): Promise<EstadoSubida> {
  // Redirige al acceso si no hay sesión de miembro. No hace falta comprobar
  // que la membresía esté vigente: cambiar la foto no es un beneficio.
  const perfil = await requireRolMiembro()

  // Antes de leer el archivo y de tocar Storage: sin declaración no se sube nada.
  if (!declaracionAceptada(formData.get(CAMPO_DECLARACION))) {
    return { error: 'Confirma que eres tú quien aparece en la foto y que tienes derecho a usarla.' }
  }

  const admin = createAdminClient()

  const { data: miembro } = await admin
    .from('miembros')
    .select('id, foto_url')
    .eq('perfil_id', perfil.userId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!miembro) return { error: 'No encontramos tu ficha de socio.' }

  // Antes de tocar Storage: el cambio de este mes, ¿ya se usó?
  const mes = await fotoDelMes(admin, miembro.id)
  if (!mes.puedeCambiar) {
    return { error: `Ya cambiaste tu foto este mes. Podrás cambiarla de nuevo ${mes.proximoCambio}.` }
  }

  // Una clave por subida: la ruta no se puede adivinar (ver `rutaFotoMiembro`).
  const clave = nuevaClaveFoto()
  const resultado = await subirImagen(admin, {
    archivo: formData.get('archivo'),
    bucket: BUCKET_AVATARES,
    ruta: (ext) => rutaFotoMiembro(miembro.id, ext, clave),
    limite: LIMITE_AVATARES,
  })
  if (!resultado.ok) return { error: resultado.error }

  const { error } = await admin
    .from('miembros')
    .update({ foto_url: resultado.url, foto_declaracion_at: new Date().toISOString(), updated_by: perfil.userId })
    .eq('id', miembro.id)

  if (error) {
    // La foto anterior sigue en el carnet: no hay estado a medias. La nueva,
    // ya subida, se borra para no dejar un archivo huérfano.
    await borrarObjeto(admin, BUCKET_AVATARES, resultado.ruta)
    return {
      error: mensajeDeError('Subimos la foto pero no pudimos guardarla en tu carnet', error, 'Se conserva la anterior.'),
    }
  }

  // Guardada la nueva, la anterior sobra. Se borra por la dirección que tenía.
  await borrarPorUrlPublica(admin, BUCKET_AVATARES, miembro.foto_url)

  await registrarCambioImagen(admin, {
    actorId: perfil.userId,
    entidad: 'miembro',
    entidadId: miembro.id,
    campo: 'foto_url',
    urlAnterior: miembro.foto_url,
    urlNueva: resultado.url,
    contexto: { origen: ORIGEN_PORTAL_SOCIO },
  })

  revalidatePath('/miembros/perfil')
  // El carnet vive en el layout del portal: sin esto, al cerrar la ventana
  // seguiría enseñando la foto anterior hasta recargar.
  revalidatePath('/miembros', 'layout')
  revalidatePath(`/admin/miembros/${miembro.id}`)
  return { ok: true, url: resultado.url }
}

/**
 * El socio quita su foto del carnet. Puede hacerlo cuando quiera; no le
 * devuelve el cambio del mes (lo que cuenta es haberla SUBIDO).
 */
export async function quitarMiFoto(): Promise<EstadoSubida> {
  const perfil = await requireRolMiembro()
  const admin = createAdminClient()

  const { data: miembro } = await admin
    .from('miembros')
    .select('id, foto_url')
    .eq('perfil_id', perfil.userId)
    .is('deleted_at', null)
    .maybeSingle()
  if (!miembro) return { error: 'No encontramos tu ficha de socio.' }
  if (!miembro.foto_url) return { ok: true, url: null }

  // El archivo primero, comprobando el resultado: si falla, no se toca nada
  // y se puede reintentar. Si la dirección no es de nuestro almacenamiento,
  // no hay archivo que borrar.
  const ruta = rutaDesdeUrlPublica(miembro.foto_url, BUCKET_AVATARES)
  if (ruta) {
    const { error: errorArchivo } = await admin.storage.from(BUCKET_AVATARES).remove([ruta])
    if (errorArchivo) {
      return { error: mensajeDeError('No pudimos quitar tu foto', errorArchivo, 'Inténtalo de nuevo.') }
    }
  }

  const { error } = await admin
    .from('miembros')
    .update({ foto_url: null, foto_declaracion_at: null, updated_by: perfil.userId })
    .eq('id', miembro.id)
  if (error) return { error: mensajeDeError('No pudimos quitar tu foto', error, 'Inténtalo de nuevo.') }

  await registrarCambioImagen(admin, {
    actorId: perfil.userId,
    entidad: 'miembro',
    entidadId: miembro.id,
    campo: 'foto_url',
    urlAnterior: miembro.foto_url,
    urlNueva: null,
    contexto: { origen: ORIGEN_PORTAL_SOCIO, accion: 'quitada' },
  })

  revalidatePath('/miembros/perfil')
  revalidatePath('/miembros', 'layout')
  revalidatePath(`/admin/miembros/${miembro.id}`)
  return { ok: true, url: null }
}
