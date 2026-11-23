/**
 * Correo de confirmación del registro público. Pura: solo arma el asunto, el
 * HTML y el texto. El envío lo hace la acción de registro con `enviarCorreo`.
 */

/**
 * Enlace de confirmación. Toma SOLO el origen de la base del sitio: la variable
 * `NEXT_PUBLIC_SITE_URL` puede traer una ruta (`https://…/activar-cuenta`), y
 * pegarle la nuestra daría `…/activar-cuenta/registro/confirmar`, que no existe.
 */
export function enlaceConfirmacionRegistro(
  urlBase: string,
  tokenHash: string,
  /** `magiclink` cuando el código se reenvía (ver `reenviarCodigoRegistro`). */
  tipo: 'signup' | 'magiclink' = 'signup',
): string {
  const origen = new URL(urlBase).origin
  const params = new URLSearchParams({ token_hash: tokenHash, type: tipo })
  return `${origen}/registro/confirmar?${params.toString()}`
}

export type InputCorreoConfirmacionRegistro = {
  nombre: string
  enlace: string
  /**
   * El código de 6 dígitos (`email_otp` de `generateLink`). Con él la persona
   * confirma sin salir de la ventana del registro; el enlace queda de respaldo.
   */
  codigo?: string | null
}

export type CuerpoCorreoConfirmacion = {
  asunto: string
  html: string
  texto: string
}

function escapar(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function construirCorreoConfirmacionRegistro(
  input: InputCorreoConfirmacionRegistro,
): CuerpoCorreoConfirmacion {
  const nombre = input.nombre.trim()
  const saludo = nombre ? `Hola ${nombre},` : 'Hola,'
  const codigo = input.codigo && /^\d{6}$/.test(input.codigo) ? input.codigo : null
  const asunto = codigo
    ? `${codigo} es tu código para confirmar tu correo en ORUM`
    : 'Confirma tu correo para completar tu membresía ORUM'

  const texto = [
    saludo,
    '',
    ...(codigo
      ? [
          'Tu código para confirmar tu correo en ORUM es:',
          '',
          codigo,
          '',
          'Escríbelo en la ventana del registro. También puedes confirmar abriendo este enlace:',
        ]
      : ['Recibimos tu registro en ORUM. Para continuar con el pago, confirma tu correo abriendo este enlace:']),
    '',
    input.enlace,
    '',
    'Si no fuiste tú quien se registró, ignora este mensaje.',
    '',
    'ORUM',
  ].join('\n')

  const bloqueCodigo = codigo
    ? `
    <p>Tu código para confirmar tu correo en ORUM es:</p>
    <p style="font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 16px 0;">${codigo}</p>
    <p>Escríbelo en la ventana del registro. También puedes confirmar con este botón:</p>`
    : `
    <p>Recibimos tu registro en ORUM. Para continuar con el pago, confirma tu correo:</p>`

  const html = `<!doctype html>
<html lang="es">
  <body style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
    <p>${escapar(saludo)}</p>${bloqueCodigo}
    <p><a href="${escapar(input.enlace)}">Confirmar mi correo</a></p>
    <p>Si no fuiste tú quien se registró, ignora este mensaje.</p>
    <p>ORUM</p>
  </body>
</html>`

  return { asunto, html, texto }
}

export type InputCorreoCuentaExistente = {
  /** Página de entrada del Portal de Miembros. */
  enlaceEntrar: string
  /** Página para recuperar la contraseña. */
  enlaceRecuperar: string
}

/**
 * Correo para quien se registra con un correo que YA tiene cuenta (23/11/2026).
 * La pantalla responde igual que a un correo nuevo, para no revelar qué cuentas
 * existen; antes, además, no llegaba nada y la persona esperaba un correo que
 * nunca venía. Ahora le llega este, que solo lee el dueño del buzón. No lleva el
 * nombre tecleado: puede no ser el de la cuenta.
 */
export function construirCorreoCuentaExistente(
  input: InputCorreoCuentaExistente,
): CuerpoCorreoConfirmacion {
  const asunto = 'Ya tienes una cuenta en ORUM'

  const texto = [
    'Hola,',
    '',
    'Alguien intentó registrarse en ORUM con este correo, pero ya tiene una cuenta.',
    '',
    `Entra con tu correo o tu número de socio: ${input.enlaceEntrar}`,
    `¿No recuerdas tu contraseña? Crea una nueva aquí: ${input.enlaceRecuperar}`,
    '',
    'Si no fuiste tú, ignora este mensaje: tu cuenta no ha cambiado.',
    '',
    'ORUM',
  ].join('\n')

  const html = `<!doctype html>
<html lang="es">
  <body style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
    <p>Hola,</p>
    <p>Alguien intentó registrarse en ORUM con este correo, pero ya tiene una cuenta.</p>
    <p><a href="${escapar(input.enlaceEntrar)}">Entrar a mi cuenta</a> con tu correo o tu número de socio.</p>
    <p>¿No recuerdas tu contraseña? <a href="${escapar(input.enlaceRecuperar)}">Crea una nueva</a>.</p>
    <p>Si no fuiste tú, ignora este mensaje: tu cuenta no ha cambiado.</p>
    <p>ORUM</p>
  </body>
</html>`

  return { asunto, html, texto }
}
