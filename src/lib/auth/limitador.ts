import 'server-only'

import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'
import { claveCupo, huella, ipDeCabeceras, LIMITES, type Limite } from './limite-uso'

/*
  Contacto con la base para el límite de uso. Envoltura fina, sin pruebas (igual
  que `verificarTurnstile`): la lógica comprobable vive en `limite-uso.ts` y el
  conteo atómico, en la función SQL `consumir_cupo`.
*/

/** IP del cliente de la petición en curso. Ver `ipDeCabeceras` para el porqué. */
export async function ipDelCliente(): Promise<string> {
  const h = await headers()
  return ipDeCabeceras((nombre) => h.get(nombre))
}

/**
 * Qué hacer si no se puede consultar el contador (base caída, error de red).
 *
 * - `'bloquear'`: se trata como si el cupo estuviera agotado. Para lo que envía
 *   correo, porque abrir la compuerta cuando falla el limitador es justo lo que
 *   agota la cuota de Google.
 * - `'permitir'`: se deja pasar. Para el login, para que una caída del
 *   limitador no deje fuera a socios y comercios reales; ahí además sigue
 *   mandando Turnstile.
 */
export type AlFallar = 'bloquear' | 'permitir'

/**
 * Gasta una unidad del cupo de `clave` y dice si todavía estaba permitido.
 * Nunca lanza.
 */
export async function hayCupo(clave: string, limite: Limite, alFallar: AlFallar): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc('consumir_cupo', {
      p_clave: clave,
      p_tope: limite.tope,
      p_ventana_segundos: limite.ventanaSegundos,
    })
    if (error || typeof data !== 'boolean') throw error ?? new Error('respuesta inesperada')
    return data
  } catch (err) {
    console.error('[limite-uso] no se pudo consultar el contador', clave.split(':')[0], err)
    return alFallar === 'permitir'
  }
}

export const ERROR_LIMITE_LOGIN =
  'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'

/**
 * Cupo de un intento de inicio de sesión. Tres contadores, todos gastados aunque
 * falle alguno (para que una IP que prueba muchas cuentas no recupere cupo por
 * haber topado en una):
 *
 * - cuenta + IP: el tope fino. Quien insiste desde su conexión se bloquea a sí
 *   mismo y no impide entrar al dueño de la cuenta desde la suya.
 * - IP: frena a quien prueba muchas cuentas desde un sitio.
 * - cuenta sola: techo alto contra quien rota de IP (ver `LIMITES`).
 *
 * Falla hacia «permitir»: ver `AlFallar`.
 */
export async function cupoDeLogin(cuenta: string): Promise<boolean> {
  const ip = await ipDelCliente()
  const h = huella(cuenta)
  const [porCuentaYIp, porIp, porCuenta] = await Promise.all([
    hayCupo(claveCupo('login', 'cuenta-ip', `${h}:${ip}`), LIMITES.loginPorCuentaYIp, 'permitir'),
    hayCupo(claveCupo('login', 'ip', ip), LIMITES.loginPorIp, 'permitir'),
    hayCupo(claveCupo('login', 'cuenta', h), LIMITES.loginPorCuenta, 'permitir'),
  ])
  return porCuentaYIp && porIp && porCuenta
}

/**
 * Tras un acierto la cuenta vuelve a empezar: el tope cuenta fallos seguidos.
 * Se reinician la pareja cuenta + IP y el techo de la cuenta; el de la IP no,
 * porque lo comparten otras cuentas.
 */
export async function reiniciarLogin(cuenta: string): Promise<void> {
  const ip = await ipDelCliente()
  const h = huella(cuenta)
  await Promise.all([
    reiniciarCupo(claveCupo('login', 'cuenta-ip', `${h}:${ip}`)),
    reiniciarCupo(claveCupo('login', 'cuenta', h)),
  ])
}

/**
 * Cupo para enviar un enlace de recuperación: uno por cuenta (para no inundar
 * un buzón ajeno) y otro por IP (para que nadie barra cuentas desde un sitio).
 * Recibe la IP ya leída porque se llama dentro de `after()`, donde no conviene
 * leer cabeceras. Falla hacia «bloquear»: ver `AlFallar`.
 */
export async function cupoDeRecuperacion(cuenta: string, ip: string): Promise<boolean> {
  const [porCuenta, porIp] = await Promise.all([
    hayCupo(claveCupo('recuperar', 'cuenta', huella(cuenta)), LIMITES.recuperarPorCuenta, 'bloquear'),
    hayCupo(claveCupo('recuperar', 'ip', ip), LIMITES.recuperarPorIp, 'bloquear'),
  ])
  return porCuenta && porIp
}

/**
 * Cupo para enviar una solicitud de aliado: por IP, y un techo global al día
 * que protege la cuota de correo aunque el abuso rote de IP. Falla hacia
 * «bloquear»: ver `AlFallar`.
 */
export async function cupoDeSolicitudAliado(ip: string): Promise<boolean> {
  const [porIp, global] = await Promise.all([
    hayCupo(claveCupo('aliados', 'ip', ip), LIMITES.aliadosPorIp, 'bloquear'),
    hayCupo(claveCupo('aliados', 'global', 'dia'), LIMITES.aliadosGlobalDia, 'bloquear'),
  ])
  return porIp && global
}

export const ERROR_LIMITE_REGISTRO =
  'Hemos recibido demasiados registros desde aquí. Espera un rato e inténtalo de nuevo.'

/**
 * Cupo para un registro público (cada uno crea una cuenta y manda un correo):
 * por IP, por correo y un techo global al día. Falla hacia «bloquear»: ver
 * `AlFallar`.
 */
export async function cupoDeRegistro(correo: string): Promise<boolean> {
  const ip = await ipDelCliente()
  const [porIp, porCorreo, global] = await Promise.all([
    hayCupo(claveCupo('registro', 'ip', ip), LIMITES.registroPorIp, 'bloquear'),
    hayCupo(claveCupo('registro', 'cuenta', huella(correo)), LIMITES.registroPorCorreo, 'bloquear'),
    hayCupo(claveCupo('registro', 'global', 'dia'), LIMITES.registroGlobalDia, 'bloquear'),
  ])
  return porIp && porCorreo && global
}

export const ERROR_LIMITE_CODIGO =
  'Demasiados intentos con el código. Espera unos minutos o pide uno nuevo.'

/**
 * Cupo para probar un código de confirmación: por correo (lo que impide
 * adivinarlo) y por IP. Falla hacia «bloquear»: sin contador no hay techo.
 */
export async function cupoDeCodigo(correo: string): Promise<boolean> {
  const ip = await ipDelCliente()
  const [porCorreo, porIp] = await Promise.all([
    hayCupo(claveCupo('codigo', 'cuenta', huella(correo)), LIMITES.codigoPorCorreo, 'bloquear'),
    hayCupo(claveCupo('codigo', 'ip', ip), LIMITES.codigoPorIp, 'bloquear'),
  ])
  return porCorreo && porIp
}

/** Pone a cero el contador de `clave` (el login, al acertar). Nunca lanza. */
export async function reiniciarCupo(clave: string): Promise<void> {
  try {
    await createAdminClient().rpc('reiniciar_cupo', { p_clave: clave })
  } catch (err) {
    console.error('[limite-uso] no se pudo reiniciar el contador', err)
  }
}
