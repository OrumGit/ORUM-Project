'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getPerfilActual } from '@/lib/auth/auth'
import {
  construirEnlaceActivacion,
  cuentaPendienteDeActivar,
  puedeReenviarActivacion,
  rolActivacionDe,
  urlBaseSitio,
} from '@/lib/auth/activacion'
import { enviarCorreoInvitacionConResultado } from '@/lib/correo/correo'
import { registrarActividad } from '@/lib/bitacora/bitacora'
import { mensajeDeError } from '@/lib/shared/errores'

export type ReenvioResultado = { ok: true; correo: string } | { ok: false; error: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Admin = ReturnType<typeof createAdminClient>
type Destinatario = { nombre: string; entidad: 'miembro' | 'comercio' | 'empleado'; entidadId: number }

/** A quién se escribe y bajo qué entidad queda anotado, según el rol de la cuenta. */
async function buscarDestinatario(
  admin: Admin,
  perfilId: string,
  rolCodigo: string,
): Promise<Destinatario | null> {
  if (rolCodigo === 'miembro') {
    const { data } = await admin
      .from('miembros')
      .select('id, nombres, apellidos')
      .eq('perfil_id', perfilId)
      .is('deleted_at', null)
      .maybeSingle()
    return data
      ? { nombre: `${data.nombres} ${data.apellidos}`.trim(), entidad: 'miembro', entidadId: data.id }
      : null
  }
  if (rolCodigo === 'comercio') {
    const { data } = await admin
      .from('comercios')
      .select('id, nombre')
      .eq('perfil_id', perfilId)
      .is('deleted_at', null)
      .maybeSingle()
    return data ? { nombre: data.nombre, entidad: 'comercio', entidadId: data.id } : null
  }
  const { data } = await admin
    .from('empleados')
    .select('id, nombres, apellidos')
    .eq('perfil_id', perfilId)
    .is('deleted_at', null)
    .maybeSingle()
  return data
    ? { nombre: `${data.nombres} ${data.apellidos}`.trim(), entidad: 'empleado', entidadId: data.id }
    : null
}

/**
 * Reenvía el correo de activación a una cuenta que aún no la ha activado
 * (miembro, comercio o personal del panel). Genera un enlace NUEVO y manda el
 * mismo correo de bienvenida. El enlace anterior NO se invalida (medido en
 * Supabase: invitación y recuperación guardan tokens distintos): sigue
 * sirviendo hasta que venza o se use.
 *
 * Una invitación no se puede repetir para un correo que ya existe, así que el
 * enlace es de recuperación; la página de activación lo canjea igual y, como
 * la cuenta aún no tiene contraseña, el texto sigue siendo «Activa tu cuenta».
 *
 * Dice la verdad sobre el envío: `enviarCorreoInvitacion` se traga los
 * fallos, y aquí quien pulsa necesita saber si el correo salió.
 */
export async function reenviarActivacion(perfilId: string): Promise<ReenvioResultado> {
  const actor = await getPerfilActual()
  if (!actor || !actor.activo) {
    return { ok: false, error: 'No tienes permiso para realizar esta acción.' }
  }
  if (typeof perfilId !== 'string' || !UUID.test(perfilId)) {
    return { ok: false, error: 'Falta el identificador de la cuenta.' }
  }

  const admin = createAdminClient()

  const { data: perfil } = await admin
    .from('perfiles')
    .select('activo, rol_id')
    .eq('id', perfilId)
    .maybeSingle()
  if (!perfil) return { ok: false, error: 'No se encontró la cuenta.' }

  const { data: rol } = await admin.from('roles').select('codigo').eq('id', perfil.rol_id).maybeSingle()
  const rolCodigo = rol?.codigo ?? ''
  const rolEnlace = rolActivacionDe(rolCodigo)

  // Mismo mensaje si no hay permiso y si el rol no existe: no se enseña qué hay.
  if (!rolEnlace || !puedeReenviarActivacion(actor.rolCodigo, rolCodigo)) {
    return { ok: false, error: 'No tienes permiso para realizar esta acción.' }
  }
  if (!perfil.activo) {
    return { ok: false, error: 'El acceso de esta cuenta está desactivado. Actívalo antes de reenviar el correo.' }
  }

  const { data: authUser } = await admin.auth.admin.getUserById(perfilId)
  const usuario = authUser?.user
  if (!usuario?.email) return { ok: false, error: 'La cuenta no tiene un correo registrado.' }
  if (!cuentaPendienteDeActivar(usuario)) {
    return { ok: false, error: 'Esta cuenta ya está activada.' }
  }

  const destinatario = await buscarDestinatario(admin, perfilId, rolCodigo)
  if (!destinatario) return { ok: false, error: 'No se encontraron los datos de la cuenta.' }

  const { data: enlace, error: errEnlace } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email: usuario.email,
    options: { redirectTo: urlBaseSitio() },
  })
  if (errEnlace || !enlace?.properties) {
    return { ok: false, error: mensajeDeError('No se pudo generar el enlace de activación', errEnlace) }
  }

  const salio = await enviarCorreoInvitacionConResultado({
    nombre: destinatario.nombre,
    correo: usuario.email,
    urlInvitacion: construirEnlaceActivacion(
      urlBaseSitio(),
      rolEnlace,
      enlace.properties.hashed_token,
      enlace.properties.verification_type,
    ),
  })
  if (!salio) {
    return { ok: false, error: 'No se pudo enviar el correo. Inténtalo de nuevo en un momento.' }
  }

  await registrarActividad(admin, {
    actorId: actor.userId,
    accion: 'reenvio_activacion',
    entidad: destinatario.entidad,
    entidadId: destinatario.entidadId,
    datosNuevos: { correo: usuario.email },
  })

  return { ok: true, correo: usuario.email }
}
