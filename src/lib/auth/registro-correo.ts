/**
 * Correo de confirmación del registro público. Pura: solo arma el asunto, el
 * HTML y el texto. El envío lo hace la acción de registro con `enviarCorreo`.
 */

/**
 * Enlace de confirmación. Toma SOLO el origen de la base del sitio: la variable
 * `NEXT_PUBLIC_SITE_URL` puede traer una ruta (`https://…/activar-cuenta`), y
 * pegarle la nuestra daría `…/activar-cuenta/registro/confirmar`, que no existe.
 */
export function enlaceConfirmacionRegistro(urlBase: string, tokenHash: string): string {
  const origen = new URL(urlBase).origin
  const params = new URLSearchParams({ token_hash: tokenHash, type: 'signup' })
  return `${origen}/registro/confirmar?${params.toString()}`
}

export type InputCorreoConfirmacionRegistro = {
  nombre: string
  enlace: string
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
  const asunto = 'Confirma tu correo para completar tu membresía ORUM'

  const texto = [
    saludo,
    '',
    'Recibimos tu registro en ORUM. Para continuar con el pago, confirma tu correo abriendo este enlace:',
    '',
    input.enlace,
    '',
    'Si no fuiste tú quien se registró, ignora este mensaje.',
    '',
    'ORUM',
  ].join('\n')

  const html = `<!doctype html>
<html lang="es">
  <body style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
    <p>${escapar(saludo)}</p>
    <p>Recibimos tu registro en ORUM. Para continuar con el pago, confirma tu correo:</p>
    <p><a href="${escapar(input.enlace)}">Confirmar mi correo</a></p>
    <p>Si no fuiste tú quien se registró, ignora este mensaje.</p>
    <p>ORUM</p>
  </body>
</html>`

  return { asunto, html, texto }
}
