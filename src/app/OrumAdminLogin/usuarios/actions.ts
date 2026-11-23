'use server'

import { mensajeDeError } from '@/lib/shared/errores'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPerfilActual } from '@/lib/auth/auth'
import { enviarCorreoInvitacion } from '@/lib/correo/correo'
import type { RolCodigo } from '@/lib/supabase/database.types'
import { construirEnlaceActivacion, urlBaseSitio } from '@/lib/auth/activacion'
import { errorDeCorreoOcupado } from '@/lib/auth/correo-registrado'
import { cambiarCorreoDeCuenta } from '@/lib/auth/cambiar-correo'

/** Tipos de usuario que el admin puede crear en esta sección. */
type TipoUsuario = 'super_admin' | 'empleado'
const TIPOS_VALIDOS: TipoUsuario[] = ['super_admin', 'empleado']

export type CrearUsuarioState = {
  error?: string
  ok?: boolean
  email?: string
}

/** Verifica que quien ejecuta la acción sea super_admin. */
async function exigirSuperAdmin(): Promise<string | null> {
  const actor = await getPerfilActual()
  if (!actor || !actor.activo || actor.rolCodigo !== 'super_admin') {
    return null
  }
  return actor.userId
}

/**
 * Crea un usuario (empleado o administrador).
 * Flujo: crear usuario en Auth → upsert de `perfiles` → insertar en `empleados`.
 * Si algo falla, se revierte para no dejar datos a medias.
 */
export async function crearUsuario(
  _prev: CrearUsuarioState,
  formData: FormData
): Promise<CrearUsuarioState> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) {
    return { error: 'No tienes permiso para realizar esta acción.' }
  }

  const tipo = String(formData.get('tipo') ?? '') as TipoUsuario
  const email = String(formData.get('email') ?? '').trim().toLowerCase()

  if (!TIPOS_VALIDOS.includes(tipo)) return { error: 'Selecciona un tipo de usuario válido.' }
  if (!email || !email.includes('@')) return { error: 'Ingresa un correo electrónico válido.' }

  const nombres = String(formData.get('nombres') ?? '').trim()
  const apellidos = String(formData.get('apellidos') ?? '').trim()
  const cedula = String(formData.get('cedula') ?? '').trim()
  if (!nombres || !apellidos) return { error: 'Nombres y apellidos son obligatorios.' }
  if (!cedula) return { error: 'La cédula es obligatoria.' }

  const admin = createAdminClient()

  // El rol y la unicidad de la cédula no dependen entre sí: se piden en paralelo.
  const [{ data: rol }, { data: yaExiste }] = await Promise.all([
    admin.from('roles').select('id').eq('codigo', tipo as RolCodigo).single(),
    // La cédula es el identificador de negocio: no se puede repetir.
    admin.from('empleados').select('id').eq('cedula', cedula).is('deleted_at', null).maybeSingle(),
  ])
  if (!rol) return { error: `No se encontró el rol "${tipo}" en la base de datos.` }
  if (yaExiste) return { error: `Ya existe un empleado registrado con la cédula ${cedula}.` }

  const datosEmpleado = {
    nombres,
    apellidos,
    cedula,
    telefono: String(formData.get('telefono') ?? '').trim() || null,
  }

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

  const { error: errEmpleado } = await admin
    .from('empleados')
    .insert({ updated_by: actorId, perfil_id: userId, ...datosEmpleado })
  if (errEmpleado) {
    await revertir()
    return { error: mensajeDeError('No se pudo registrar el empleado', errEmpleado) }
  }

  await enviarCorreoInvitacion({
    nombre: `${nombres} ${apellidos}`.trim(),
    correo: email,
    urlInvitacion: construirEnlaceActivacion(
      urlBaseSitio(),
      'staff',
      creado.properties.hashed_token,
      creado.properties.verification_type,
    ),
  })

  revalidatePath('/OrumAdminLogin/usuarios')
  return { ok: true, email }
}

export type EditarUsuarioState = { error?: string; ok?: boolean }

/**
 * Edita los datos de un empleado/administrador y, opcionalmente, su correo de
 * acceso. No cambia el rol. El identificador interno (perfil_id / UUID) nunca cambia.
 */
export async function editarUsuario(
  _prev: EditarUsuarioState,
  formData: FormData
): Promise<EditarUsuarioState> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) {
    return { error: 'No tienes permiso para realizar esta acción.' }
  }

  const perfilId = String(formData.get('perfil_id') ?? '')
  if (!perfilId) return { error: 'Falta el identificador del usuario.' }

  const admin = createAdminClient()

  const nombres = String(formData.get('nombres') ?? '').trim()
  const apellidos = String(formData.get('apellidos') ?? '').trim()
  const cedula = String(formData.get('cedula') ?? '').trim()
  if (!nombres || !apellidos) return { error: 'Nombres y apellidos son obligatorios.' }
  if (!cedula) return { error: 'La cédula es obligatoria.' }

  // Unicidad de cédula, excluyendo al propio usuario que se edita.
  const { data: yaExiste } = await admin
    .from('empleados')
    .select('id')
    .eq('cedula', cedula)
    .is('deleted_at', null)
    .neq('perfil_id', perfilId)
    .maybeSingle()
  if (yaExiste) return { error: `Ya existe otro empleado con la cédula ${cedula}.` }

  const { error } = await admin
    .from('empleados')
    .update({
      updated_by: actorId,
      nombres,
      apellidos,
      cedula,
      telefono: String(formData.get('telefono') ?? '').trim() || null,
    })
    .eq('perfil_id', perfilId)
  if (error) return { error: mensajeDeError('No se pudieron guardar los cambios', error) }

  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const emailOriginal = String(formData.get('email_original') ?? '').trim().toLowerCase()
  if (email && email !== emailOriginal) {
    if (!email.includes('@')) return { error: 'El correo electrónico no es válido.' }
    const cambio = await cambiarCorreoDeCuenta(admin, perfilId, email)
    if (!cambio.ok) return { error: cambio.error }
  }

  revalidatePath('/OrumAdminLogin/usuarios')
  return { ok: true }
}

/** Activa o desactiva el acceso de un usuario (perfiles.activo). */
export async function cambiarEstadoAcceso(formData: FormData): Promise<void> {
  const actorId = await exigirSuperAdmin()
  if (!actorId) redirect('/')

  const perfilId = String(formData.get('perfil_id') ?? '')
  const activar = String(formData.get('activar') ?? '') === 'true'
  if (!perfilId) redirect('/OrumAdminLogin/usuarios')

  const admin = createAdminClient()
  await admin.from('perfiles').update({ updated_by: actorId, activo: activar }).eq('id', perfilId)

  revalidatePath('/OrumAdminLogin/usuarios')
  redirect('/OrumAdminLogin/usuarios')
}
