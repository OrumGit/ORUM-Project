'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getPerfilActual } from '@/lib/auth/auth'
import { ERROR_TURNSTILE, verificarTurnstileDeFormulario } from '@/lib/auth/turnstile-request'
import { cupoDeLogin, ERROR_LIMITE_LOGIN, reiniciarLogin } from '@/lib/auth/limitador'
import { resolverCorreoPorNumeroMembresia } from '@/lib/miembros/auth-miembro'
import { clasificarIdentificador } from '@/lib/miembros/identificador-acceso'

export type LoginMiembroState = { error?: string }

const ERROR_CREDENCIALES = 'Número de socio, correo o contraseña incorrectos.'

/**
 * Inicia sesión con número de socio o correo, más contraseña (RF-06). Un número
 * se resuelve al correo real de Auth; un correo entra directamente. Los dos
 * caminos responden lo mismo si la cuenta no existe o la contraseña no coincide.
 */
export async function iniciarSesionMiembro(
  _prevState: LoginMiembroState,
  formData: FormData,
): Promise<LoginMiembroState> {
  const password = String(formData.get('password') ?? '')
  const identificador = clasificarIdentificador(String(formData.get('identificador') ?? ''))

  if (!identificador || !password) {
    return { error: 'Ingresa tu número de socio o tu correo, y tu contraseña.' }
  }

  const captcha = await verificarTurnstileDeFormulario(formData)
  if (!captcha.valido) {
    return { error: ERROR_TURNSTILE }
  }

  // La cuenta se identifica por lo tecleado, antes de resolverlo: así el tope
  // cuenta igual exista o no, y no delata cuáles números o correos son reales.
  if (!(await cupoDeLogin(identificador.valor))) {
    return { error: ERROR_LIMITE_LOGIN }
  }

  let correo: string | null = identificador.valor
  if (identificador.tipo === 'numero') {
    correo = await resolverCorreoPorNumeroMembresia(identificador.valor)
    if (!correo) return { error: ERROR_CREDENCIALES }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email: correo, password })
  if (error) {
    return { error: ERROR_CREDENCIALES }
  }
  await reiniciarLogin(identificador.valor)

  const perfil = await getPerfilActual()
  if (!perfil || !perfil.activo) {
    await supabase.auth.signOut()
    return { error: 'Tu cuenta está inactiva. Contacta a soporte.' }
  }

  if (perfil.rolCodigo !== 'miembro') {
    await supabase.auth.signOut()
    return { error: 'Este acceso es exclusivo para miembros.' }
  }

  redirect('/miembros')
}

/** Cierra la sesión actual y vuelve al login de miembros. */
export async function cerrarSesionMiembro() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/miembros/login')
}
