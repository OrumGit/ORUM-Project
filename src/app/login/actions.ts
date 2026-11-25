'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { RUTA_PANEL } from '@/lib/auth/ruta-panel'
import { COOKIE_EQUIPO, OPCIONES_COOKIE_EQUIPO, marcaDeEquipo } from '@/lib/auth/marca-equipo'
import { createClient } from '@/lib/supabase/server'
import { getPerfilActual } from '@/lib/auth/auth'
import { cupoDeLogin, ERROR_LIMITE_LOGIN, reiniciarLogin } from '@/lib/auth/limitador'
import { ERROR_TURNSTILE, verificarTurnstileDeFormulario } from '@/lib/auth/turnstile-request'

export type LoginState = { error?: string }

/**
 * Inicia sesión con correo + contraseña.
 *
 * En esta fase solo pueden entrar los roles `super_admin` y `empleado`
 * (el portal administrativo). Si el usuario existe pero no tiene acceso o su
 * perfil está inactivo, se cierra la sesión y se muestra un mensaje.
 */
export async function iniciarSesion(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Ingresa tu correo y tu contraseña.' }
  }

  const captcha = await verificarTurnstileDeFormulario(formData)
  if (!captcha.valido) {
    return { error: ERROR_TURNSTILE }
  }

  if (!(await cupoDeLogin(email))) {
    return { error: ERROR_LIMITE_LOGIN }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: 'Correo o contraseña incorrectos.' }
  }
  await reiniciarLogin(email)

  // Validar que tenga un perfil activo con rol permitido para este portal.
  const perfil = await getPerfilActual()

  if (!perfil || !perfil.activo) {
    await supabase.auth.signOut()
    return {
      error: 'Tu cuenta está inactiva o no tiene un perfil válido. Contacta al administrador.',
    }
  }

  if (perfil.rolCodigo !== 'super_admin' && perfil.rolCodigo !== 'empleado') {
    await supabase.auth.signOut()
    return { error: 'Esta cuenta no tiene acceso al portal administrativo.' }
  }

  await recordarDispositivo()

  // redirect() lanza internamente; debe ir fuera de cualquier try/catch.
  redirect(RUTA_PANEL)
}

/** Este dispositivo es del equipo: sin sesión, el panel le enseña la entrada. */
async function recordarDispositivo() {
  const almacen = await cookies()
  const marca = await marcaDeEquipo()
  if (almacen.get(COOKIE_EQUIPO)?.value !== marca) {
    almacen.set(COOKIE_EQUIPO, marca, OPCIONES_COOKIE_EQUIPO)
  }
}

/**
 * Para las sesiones que ya estaban abiertas antes de la marca
 * (`RecordarDispositivo`, en el layout del panel). Solo a cuentas del equipo.
 */
export async function recordarEsteDispositivo() {
  const perfil = await getPerfilActual()
  if (!perfil?.activo || (perfil.rolCodigo !== 'super_admin' && perfil.rolCodigo !== 'empleado')) return
  await recordarDispositivo()
}

/**
 * Cierra la sesión y vuelve al panel, que en este dispositivo (ya marcado
 * como del equipo) enseña la entrada en su misma dirección. Antes volvía a
 * la puerta secreta, que queda FUERA del ámbito de la app instalada: la app
 * la abría en una hoja del navegador (25/11/2026).
 */
export async function cerrarSesion() {
  await recordarEsteDispositivo()
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(RUTA_PANEL)
}
