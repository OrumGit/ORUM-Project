import { RUTA_PANEL, rutaAccesoPanel } from './ruta-panel'

/*
  EL DISPOSITIVO DEL EQUIPO RECUERDA LA PUERTA  ·  25/11/2026
  ---------------------------------------------------------------------------
  Reporte del propietario: «la aplicación del panel ya instalada, se usa, se
  cierra y al volver a abrirla da error. En la web es lo esperado, pero
  instalada debería funcionar siempre».

  Por qué pasaba: la app abre en `/OrumAdminLogin` y, sin sesión, eso es
  «página no encontrada» a propósito (la puerta del panel no se anuncia,
  `ruta-panel.ts`). En la web se escribe la dirección secreta; dentro de la
  app no hay barra de direcciones, así que en cuanto la sesión se acababa
  (caducó, se cerró, se cerró en otro equipo) la app quedaba muerta.

  Lo que se hace: el dispositivo que YA pasó por la puerta guarda una marca
  (cookie `httpOnly`, 400 días). Con esa marca y sin sesión, `/OrumAdminLogin`
  enseña el formulario de entrada EN LA MISMA DIRECCIÓN (el `proxy` reescribe
  por dentro; la dirección secreta no aparece y la app no sale de su ámbito).
  Sin marca, todo sigue como antes: 404.

  La marca es un HMAC de la dirección de la puerta: no se adivina sin
  conocerla, y si la puerta cambia (`ORUM_RUTA_PANEL`) todas las marcas
  dejan de valer solas. Se pone al visitar la puerta, al entrar y, para las
  sesiones que ya estaban abiertas, la primera vez que el panel se pinta
  (`RecordarDispositivo`). Solo la reciben cuentas del equipo.

  ⚠️ Esto solo decide QUÉ SE ENSEÑA sin sesión. Lo que protege el panel sigue
  siendo la cuenta del equipo, Turnstile y el límite de intentos.
*/

export const COOKIE_EQUIPO = 'orum_equipo'

/** 400 días: el tope que admiten los navegadores para una cookie. */
export const OPCIONES_COOKIE_EQUIPO = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 400,
}

const MENSAJE = 'orum-equipo-v1'

/** Una por puerta y por proceso: el `proxy` la consulta en cada petición del panel. */
const calculadas = new Map<string, Promise<string>>()

/** La marca de los dispositivos del equipo para ESTA puerta (hex de 64). */
export function marcaDeEquipo(puerta: string = rutaAccesoPanel()): Promise<string> {
  let marca = calculadas.get(puerta)
  if (!marca) {
    marca = calcularMarca(puerta)
    calculadas.set(puerta, marca)
  }
  return marca
}

async function calcularMarca(puerta: string): Promise<string> {
  const codificar = new TextEncoder()
  const clave = await crypto.subtle.importKey(
    'raw',
    codificar.encode(puerta),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const firma = await crypto.subtle.sign('HMAC', clave, codificar.encode(MENSAJE))
  return Array.from(new Uint8Array(firma), (b) => b.toString(16).padStart(2, '0')).join('')
}

/** ¿Lo que trae la cookie es la marca de esta puerta? */
export async function esMarcaValida(
  valor: string | undefined | null,
  puerta: string = rutaAccesoPanel(),
): Promise<boolean> {
  if (!valor || valor.length !== 64) return false
  return valor === (await marcaDeEquipo(puerta))
}

/** ¿Es una dirección del panel (`/OrumAdminLogin` o algo debajo)? */
export function esRutaDelPanel(pathname: string): boolean {
  return pathname === RUTA_PANEL || pathname.startsWith(`${RUTA_PANEL}/`)
}

/**
 * ¿Se enseña el formulario de entrada en vez del panel? Solo en el panel,
 * sin sesión y en un dispositivo que ya pasó por la puerta.
 */
export function entrarEnElSitio({
  pathname,
  conSesion,
  marcaValida,
}: {
  pathname: string
  conSesion: boolean
  marcaValida: boolean
}): boolean {
  return esRutaDelPanel(pathname) && !conSesion && marcaValida
}
