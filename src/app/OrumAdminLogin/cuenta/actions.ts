'use server'

import { contextoDeLaCuenta, motivoParaRechazar } from '@/lib/auth/contrasena-nueva'
import { MENSAJE_FILTRADA, revisarContrasena } from '@/lib/auth/contrasena-segura'
import { cupoDeLogin, ERROR_LIMITE_LOGIN, reiniciarLogin } from '@/lib/auth/limitador'
import { verificarPasswordActual } from '@/lib/auth/password-actual'
import { mensajeDeError } from '@/lib/shared/errores'
import { createClient } from '@/lib/supabase/server'

/** `campo` dice en qué campo del formulario se pinta el error. */
export type PasswordState = { error?: string; campo?: 'actual' | 'nueva'; ok?: boolean }

/**
 * Cambia la contraseña del usuario actualmente autenticado.
 * Usa la sesión (cliente servidor con cookies), no el cliente admin.
 *
 * Pide la contraseña ACTUAL: sin ella, quien se llevara una sesión abierta (un
 * equipo sin bloquear, una cookie robada) podría fijar una contraseña nueva y
 * quedarse con la cuenta aunque la sesión original caducara. La comprobación
 * comparte los contadores del login, así que adivinar la actual desde aquí gasta
 * el mismo cupo que adivinarla en la pantalla de acceso.
 */
export async function cambiarPassword(
  _prev: PasswordState,
  formData: FormData
): Promise<PasswordState> {
  const actual = String(formData.get('actual') ?? '')
  const nueva = String(formData.get('password') ?? '')
  const confirmar = String(formData.get('confirmar') ?? '')

  if (!actual) {
    return { campo: 'actual', error: 'Escribe tu contraseña actual.' }
  }
  // Las reglas que no necesitan saber de quién es (largo, series, comunes).
  const revision = revisarContrasena(nueva)
  if (!revision.ok) {
    return { campo: 'nueva', error: revision.mensaje }
  }
  if (nueva !== confirmar) {
    return { campo: 'nueva', error: 'Las contraseñas no coinciden.' }
  }
  if (nueva === actual) {
    return { campo: 'nueva', error: 'La nueva contraseña debe ser distinta de la actual.' }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user?.email) {
    return { error: 'Tu sesión expiró. Vuelve a iniciar sesión.' }
  }

  if (!(await cupoDeLogin(user.email))) {
    return { campo: 'actual', error: ERROR_LIMITE_LOGIN }
  }
  if (!(await verificarPasswordActual(user.email, actual))) {
    return { campo: 'actual', error: 'La contraseña actual no es correcta.' }
  }
  await reiniciarLogin(user.email)

  // Con la cuenta ya comprobada: que no se parezca a su nombre, correo o
  // cédula, y que no esté en filtraciones conocidas (`contrasena-nueva.ts`).
  const motivo = await motivoParaRechazar(nueva, await contextoDeLaCuenta(user.id, user.email))
  if (motivo) {
    return { campo: 'nueva', error: motivo }
  }

  const { error } = await supabase.auth.updateUser({ password: nueva })
  if (error) {
    // La protección contra contraseñas filtradas de Supabase rechaza las que
    // aparecen en brechas conocidas. Es un mensaje que el usuario necesita ver:
    // sin él no sabría por qué la suya «no vale».
    if (error.code === 'weak_password') {
      return { campo: 'nueva', error: MENSAJE_FILTRADA }
    }
    return { error: mensajeDeError('No se pudo cambiar la contraseña', error) }
  }

  return { ok: true }
}
