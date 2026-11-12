'use server'

import { redirect } from 'next/navigation'
import { rutaAccesoPanel } from '@/lib/auth/ruta-panel'
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

  // redirect() lanza internamente; debe ir fuera de cualquier try/catch.
  redirect('/admin')
}

/**
 * Cierra la sesión actual y vuelve a la puerta del panel, en su dirección
 * secreta (`lib/auth/ruta-panel.ts`): quien la cierra es del equipo.
 */
export async function cerrarSesion() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(rutaAccesoPanel())
}
