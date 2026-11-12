'use server'

import { createClient } from '@/lib/supabase/server'

export type EstadoConfirmacion =
  | { estado: 'pendiente' }
  | { estado: 'confirmado' }
  | { estado: 'invalido'; mensaje: string }
  | { estado: 'error'; mensaje: string }

const MENSAJE_INVALIDO =
  'El enlace venció o ya se usó. Entra con tu correo y tu contraseña para continuar.'

/** Forma de un token de Supabase: caracteres seguros para URL, sin espacios. */
const FORMA_TOKEN = /^[A-Za-z0-9_-]{16,256}$/

/**
 * Canjea el enlace de confirmación del registro. Solo se llama desde el botón
 * de la página: abrir el enlace no gasta el token, así un escáner de correo no
 * lo consume antes que la persona (ver `construirEnlaceActivacion`).
 */
export async function confirmarCorreoRegistro(
  _previo: EstadoConfirmacion,
  formData: FormData,
): Promise<EstadoConfirmacion> {
  const tokenHash = String(formData.get('token_hash') ?? '')
  if (!FORMA_TOKEN.test(tokenHash)) return { estado: 'invalido', mensaje: MENSAJE_INVALIDO }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({
    type: 'signup',
    token_hash: tokenHash,
  })

  if (error || !data.user) {
    return { estado: 'invalido', mensaje: MENSAJE_INVALIDO }
  }
  return { estado: 'confirmado' }
}
