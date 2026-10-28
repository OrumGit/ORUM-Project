'use server'

import { contextoDeLaCuenta, motivoParaRechazar } from '@/lib/auth/contrasena-nueva'
import { MENSAJE_FILTRADA } from '@/lib/auth/contrasena-segura'
import { createClient } from '@/lib/supabase/server'

/*
  LA CONTRASEÑA AL ACTIVAR LA CUENTA O RESTABLECERLA  ·  27/10/2026
  ---------------------------------------------------------------------------
  Antes el navegador la guardaba directamente con `updateUser` tras canjear
  el enlace, y lo único que se miraba era que tuviera 8 caracteres. Ahora
  decide el servidor, en dos pasos:

    1. `revisarAntesDeCanjear` — ANTES de gastar el enlace (que sirve una
       vez): las reglas y las filtraciones. Así un rechazo no quema el enlace.
    2. `guardarContrasenaNueva` — con la sesión que dejó el enlace canjeado:
       revisa otra vez, ahora con el nombre, el correo y la cédula de la
       cuenta, y la guarda.
*/

/** Cuánto vale la sesión del enlace para guardar la contraseña. */
const VENTANA_TRAS_ENLACE_MS = 15 * 60 * 1000

export type ResultadoContrasena = { ok: true } | { ok: false; error: string; sinSesion?: boolean }

export async function revisarAntesDeCanjear(contrasena: string): Promise<ResultadoContrasena> {
  const motivo = await motivoParaRechazar(String(contrasena), [])
  return motivo ? { ok: false, error: motivo } : { ok: true }
}

/*
  SOLO CON LA SESIÓN QUE ACABA DE ABRIR EL ENLACE. Sin esto, esta acción sería
  una puerta para cambiar la contraseña de cualquier sesión abierta SIN la
  actual —la que sí exige «Cambiar contraseña» del panel—: quien se llevara
  una cookie podría quedarse con la cuenta. El token firmado dice CÓMO se
  entró (`amr`), y hace cuánto: tiene que haber una entrada RECIENTE (menos
  de `VENTANA_TRAS_ENLACE_MS`) que no sea entrar con contraseña, con un
  proveedor o refrescando la sesión. Se descartan esos en vez de enumerar
  los del enlace porque Supabase anota el canje del enlace como `otp`,
  `invite` o `recovery` según la versión, y equivocarse ahí dejaría a todo
  el mundo sin poder activar su cuenta.
*/
const METODOS_QUE_NO_SON_ENLACE = new Set([
  'password',
  'oauth',
  'sso/saml',
  'anonymous',
  'web3',
  'token_refresh',
  'oauth_provider/authorization_code',
])

async function vieneDeUnEnlace(supabase: Awaited<ReturnType<typeof createClient>>): Promise<boolean> {
  const { data } = await supabase.auth.getClaims()
  const amr = data?.claims.amr ?? []
  const limite = Date.now() - VENTANA_TRAS_ENLACE_MS
  return amr.some(
    (entrada) =>
      typeof entrada !== 'string' &&
      !METODOS_QUE_NO_SON_ENLACE.has(entrada.method) &&
      entrada.timestamp * 1000 >= limite,
  )
}

export async function guardarContrasenaNueva(contrasena: string): Promise<ResultadoContrasena> {
  const nueva = String(contrasena)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !(await vieneDeUnEnlace(supabase))) {
    return { ok: false, sinSesion: true, error: 'El enlace ya no es válido. Pide uno nuevo.' }
  }

  const motivo = await motivoParaRechazar(nueva, await contextoDeLaCuenta(user.id, user.email))
  if (motivo) return { ok: false, error: motivo }

  const { error } = await supabase.auth.updateUser({ password: nueva })
  if (error) {
    // Las reglas propias de Supabase (largo mínimo, filtradas) van detrás de
    // las nuestras; si alguna salta, se dice en palabras.
    if (error.code === 'weak_password') return { ok: false, error: MENSAJE_FILTRADA }
    if (error.code === 'same_password') {
      return { ok: false, error: 'Es la misma contraseña que ya tenías. Elige una nueva.' }
    }
    return { ok: false, error: 'No se pudo guardar la contraseña. Vuelve a intentarlo.' }
  }
  return { ok: true }
}
