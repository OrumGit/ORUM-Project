'use server'

import { urlBaseSitio } from '@/lib/auth/activacion'
import { codigoCompleto } from '@/lib/auth/codigo-verificacion'
import { correoParaRegistro } from '@/lib/auth/correo-registro'
import { cupoDeCodigo, cupoDeRegistro, ERROR_LIMITE_CODIGO, ERROR_LIMITE_REGISTRO } from '@/lib/auth/limitador'
import { construirCorreoConfirmacionRegistro, enlaceConfirmacionRegistro } from '@/lib/auth/registro-correo'
import { enviarCorreoConResultado } from '@/lib/correo/correo'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

/*
  EL CÓDIGO DE 6 DÍGITOS DEL REGISTRO  ·  (23/11/2026, diseño aprobado
  «ORUM — Pago con Mercado Pago»)
  ---------------------------------------------------------------------------
  La persona confirma su correo escribiendo el código en la MISMA ventana del
  registro, sin salir a buscar un enlace. El enlace del correo sigue valiendo
  (`/registro/confirmar`): son dos caminos al mismo canje.

  - Seis cifras son un millón de opciones: el límite (`cupoDeCodigo`, cinco
    intentos por correo cada 15 minutos) es lo que impide adivinarlo.
  - Confirmar abre la sesión (las cookies las pone el cliente de servidor):
    el paso «Pago» ya va con la persona dentro.
  - Ninguna respuesta dice si la cuenta existe: el código falla igual.

  ⚠️ PENDIENTE DE PROBAR con un correo real: que `verifyOtp` con el
  `email_otp` de `generateLink({ type: 'signup' })` canjea con `type: 'email'`
  (el tipo que hoy unifica alta y enlace mágico); si no, se prueba `signup`.
*/

export type ConfirmarCodigoState = { ok: boolean; error?: string }

const ERROR_CODIGO = 'El código no es correcto o ya venció. Revísalo o pide otro.'

export async function confirmarCodigoRegistro(
  _previo: ConfirmarCodigoState,
  formData: FormData,
): Promise<ConfirmarCodigoState> {
  const leido = correoParaRegistro(String(formData.get('correo') ?? ''))
  const codigo = codigoCompleto(String(formData.get('codigo') ?? ''))
  if (!leido.ok) return { ok: false, error: 'Falta tu correo. Vuelve al paso anterior.' }
  const correo = leido.correo
  if (!codigo) return { ok: false, error: 'Escribe las seis cifras del código.' }

  if (!(await cupoDeCodigo(correo))) return { ok: false, error: ERROR_LIMITE_CODIGO }

  const supabase = await createClient()
  let { data, error } = await supabase.auth.verifyOtp({ email: correo, token: codigo, type: 'email' })
  if (error || !data.user) {
    ;({ data, error } = await supabase.auth.verifyOtp({ email: correo, token: codigo, type: 'signup' }))
  }
  if (error || !data.user) return { ok: false, error: ERROR_CODIGO }

  return { ok: true }
}

export type ReenviarCodigoState = { enviado: boolean; error?: string }

/**
 * Manda un código nuevo. Responde lo mismo exista o no un registro con ese
 * correo: solo el dueño del buzón sabe si llegó algo. Usa un enlace mágico
 * (`magiclink`): para un usuario sin confirmar, canjearlo confirma el correo,
 * y no hace falta la contraseña (que el servidor no guarda).
 */
export async function reenviarCodigoRegistro(
  _previo: ReenviarCodigoState,
  formData: FormData,
): Promise<ReenviarCodigoState> {
  const leido = correoParaRegistro(String(formData.get('correo') ?? ''))
  if (!leido.ok) return { enviado: false, error: 'Falta tu correo. Vuelve al paso anterior.' }
  const correo = leido.correo

  if (!(await cupoDeRegistro(correo))) return { enviado: false, error: ERROR_LIMITE_REGISTRO }

  const admin = createAdminClient()
  const { data: registro } = await admin
    .from('registros_pendientes')
    .select('auth_user_id, nombres')
    .eq('correo', correo)
    .eq('estado', 'pendiente')
    .maybeSingle()
  if (!registro) return { enviado: true }

  const { data: cuenta } = await admin.auth.admin.getUserById(registro.auth_user_id)
  if (!cuenta?.user || cuenta.user.email_confirmed_at) return { enviado: true }

  const { data: generado, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email: correo })
  const tokenHash = generado?.properties?.hashed_token
  if (error || !tokenHash) {
    console.error('[registro] no se pudo generar un código nuevo', error)
    return { enviado: false, error: 'No pudimos enviar el código. Inténtalo de nuevo en un momento.' }
  }

  const cuerpo = construirCorreoConfirmacionRegistro({
    nombre: registro.nombres,
    enlace: enlaceConfirmacionRegistro(urlBaseSitio(), tokenHash, 'magiclink'),
    codigo: generado?.properties?.email_otp ?? null,
  })
  const enviado = await enviarCorreoConResultado({
    para: correo,
    nombre: registro.nombres,
    asunto: cuerpo.asunto,
    html: cuerpo.html,
    texto: cuerpo.texto,
  })
  if (!enviado) return { enviado: false, error: 'No pudimos enviar el código. Inténtalo de nuevo en un momento.' }
  return { enviado: true }
}
