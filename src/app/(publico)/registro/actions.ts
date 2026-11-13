'use server'

import { urlBaseSitio } from '@/lib/auth/activacion'
import { correoYaRegistrado } from '@/lib/auth/correo-registrado'
import { motivoParaRechazar } from '@/lib/auth/contrasena-nueva'
import { palabrasDeContexto } from '@/lib/auth/contrasena-segura'
import {
  validarEntradaRegistro,
  type EntradaRegistro,
  type ErroresRegistro,
} from '@/lib/auth/registro-entrada'
import {
  construirCorreoConfirmacionRegistro,
  enlaceConfirmacionRegistro,
} from '@/lib/auth/registro-correo'
import { ERROR_TURNSTILE, verificarTurnstileDeFormulario } from '@/lib/auth/turnstile-request'
import { enviarCorreoConResultado } from '@/lib/correo/correo'
import { createAdminClient } from '@/lib/supabase/admin'

export type RegistroState = {
  ok: boolean
  mensaje?: string
  errores?: ErroresRegistro
}

/**
 * Versión de los términos que la persona acepta. Debe coincidir con el
 * documento legal publicado; cámbiala cuando cambie el texto.
 */
const TERMINOS_VERSION = '2026-11'

/**
 * Mismo mensaje para un correo nuevo y para uno que ya existe (anti-
 * enumeración, plan §3.3): nunca se revela si la cuenta existía.
 */
const MENSAJE_REVISA =
  'Revisa tu correo: te enviamos un enlace para confirmarlo y continuar con el pago.'

const ERROR_GENERICO = 'No pudimos crear tu registro. Inténtalo de nuevo en un momento.'

function leerEntrada(formData: FormData): EntradaRegistro {
  const leer = (campo: string) => String(formData.get(campo) ?? '')
  return {
    nombres: leer('nombres'),
    apellidos: leer('apellidos'),
    cedula: leer('cedula'),
    correo: leer('correo'),
    telefono: leer('telefono'),
    ciudadId: leer('ciudad_id'),
    direccion: leer('direccion'),
    contrasena: leer('contrasena'),
    planId: leer('plan_id'),
    terminosAceptados: leer('terminos') === 'on',
  }
}

/**
 * Registro público de una persona que quiere pagar su membresía.
 *
 * Orden (plan §10 y §11):
 * 1. Turnstile y validación de todos los campos en el servidor.
 * 2. Contraseña contra filtraciones, plan vigente y correo/cédula sin usar.
 * 3. Usuario de autenticación SIN confirmar, con la contraseña (sin ficha ni número).
 * 4. Registro pendiente en `registros_pendientes`.
 * 5. Correo de confirmación. Si no sale, se deshace todo para poder reintentar.
 *
 * El pago no se abre aquí: lo decide `puedeAbrirPago` cuando el correo esté confirmado.
 */
export async function iniciarRegistro(
  _previo: RegistroState,
  formData: FormData,
): Promise<RegistroState> {
  const turnstile = await verificarTurnstileDeFormulario(formData)
  if (!turnstile.valido) return { ok: false, mensaje: ERROR_TURNSTILE }

  const validacion = validarEntradaRegistro(leerEntrada(formData))
  if (!validacion.ok) {
    return { ok: false, mensaje: 'Revisa los campos marcados.', errores: validacion.errores }
  }
  const datos = validacion.datos
  const admin = createAdminClient()

  // La ciudad tiene que existir: el formulario solo ofrece las de la tabla, pero
  // el servidor no se fía del cliente.
  const { data: ciudad, error: errCiudad } = await admin
    .from('ciudades')
    .select('id')
    .eq('id', datos.ciudadId)
    .maybeSingle()
  if (errCiudad) return { ok: false, mensaje: ERROR_GENERICO }
  if (!ciudad) return { ok: false, mensaje: 'Revisa los campos marcados.', errores: { ciudadId: 'Elige una ciudad de la lista.' } }

  // Contraseña: también contra las filtradas (la comprobación de forma ya está en la validación).
  const contexto = palabrasDeContexto([datos.nombres, datos.apellidos, datos.cedula, datos.correo])
  const filtrada = await motivoParaRechazar(datos.contrasena, contexto)
  if (filtrada) return { ok: false, mensaje: 'Revisa los campos marcados.', errores: { contrasena: filtrada } }

  // El plan tiene que existir y estar activo.
  const { data: plan, error: errPlan } = await admin
    .from('planes_membresia')
    .select('id')
    .eq('id', datos.planId)
    .eq('activo', true)
    .is('deleted_at', null)
    .maybeSingle()
  if (errPlan) return { ok: false, mensaje: ERROR_GENERICO }
  if (!plan) return { ok: false, mensaje: 'Revisa los campos marcados.', errores: { planId: 'Ese plan ya no está disponible.' } }

  // Correo ya usado: se responde igual, sin crear nada.
  const correoOcupado = await correoYaRegistrado(admin, datos.correo)
  if (correoOcupado === null) return { ok: false, mensaje: ERROR_GENERICO }
  if (correoOcupado) return { ok: true, mensaje: MENSAJE_REVISA }

  // Cédula de un socio ya existente: también se responde igual.
  const { data: miembro, error: errMiembro } = await admin
    .from('miembros')
    .select('id')
    .eq('cedula', datos.cedula)
    .is('deleted_at', null)
    .maybeSingle()
  if (errMiembro) return { ok: false, mensaje: ERROR_GENERICO }
  if (miembro) return { ok: true, mensaje: MENSAJE_REVISA }

  // Usuario de autenticación sin confirmar. generateLink NO envía correo.
  const { data: generado, error: errUsuario } = await admin.auth.admin.generateLink({
    type: 'signup',
    email: datos.correo,
    password: datos.contrasena,
  })
  const usuario = generado?.user
  const tokenHash = generado?.properties?.hashed_token
  if (errUsuario || !usuario || !tokenHash) {
    // Si ya existe la cuenta, se responde igual.
    if (errUsuario?.message?.toLowerCase().includes('already')) {
      return { ok: true, mensaje: MENSAJE_REVISA }
    }
    return { ok: false, mensaje: ERROR_GENERICO }
  }

  const { error: errRegistro } = await admin.from('registros_pendientes').insert({
    auth_user_id: usuario.id,
    plan_id: datos.planId,
    nombres: datos.nombres,
    apellidos: datos.apellidos,
    cedula: datos.cedula,
    correo: datos.correo,
    telefono: datos.telefono,
    ciudad_id: datos.ciudadId,
    direccion: datos.direccion,
    terminos_aceptados_at: new Date().toISOString(),
    terminos_version: TERMINOS_VERSION,
    estado: 'pendiente',
  })
  if (errRegistro) {
    // Sin registro pendiente no puede haber cuenta: se borra la del paso anterior.
    await admin.auth.admin.deleteUser(usuario.id)
    // Cédula o correo ya en otro registro pendiente: mismo mensaje neutro.
    if (errRegistro.code === '23505') return { ok: true, mensaje: MENSAJE_REVISA }
    return { ok: false, mensaje: ERROR_GENERICO }
  }

  const enlace = enlaceConfirmacionRegistro(urlBaseSitio(), tokenHash)
  const cuerpo = construirCorreoConfirmacionRegistro({ nombre: datos.nombres, enlace })
  const enviado = await enviarCorreoConResultado({
    para: datos.correo,
    nombre: datos.nombres,
    asunto: cuerpo.asunto,
    html: cuerpo.html,
    texto: cuerpo.texto,
  })
  if (!enviado) {
    // Sin correo no hay forma de confirmar: se deshace para que pueda reintentar.
    await admin.auth.admin.deleteUser(usuario.id)
    return {
      ok: false,
      mensaje: 'No pudimos enviar el correo de confirmación. Inténtalo de nuevo en un momento.',
    }
  }

  return { ok: true, mensaje: MENSAJE_REVISA }
}
