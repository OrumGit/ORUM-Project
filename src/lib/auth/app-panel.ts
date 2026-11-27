import { firmarConPuerta } from './marca-equipo'
import { RUTA_PANEL, rutaAccesoPanel } from './ruta-panel'

/*
  LA APP INSTALADA DEL PANEL TRAE SU PROPIA LLAVE  ·  26/11/2026
  ---------------------------------------------------------------------------
  Reporte del propietario, con la app ya instalada: «la cerré, intenté
  volver a entrar y me volvió a aparecer el mensaje» (404). La marca del
  dispositivo (`marca-equipo.ts`) solo existía si ese MISMO almacén de
  cookies había pasado antes por la puerta. Una app instalada antes del
  25/11, o una app de iPhone —que guarda sus cookies aparte de Safari—, no
  la tenía y no podía conseguirla: abre en `/OrumAdminLogin`, sin marca eso
  es 404, y dentro de la app no hay barra de direcciones.

  Lo que se hace: la app ABRE CON SU LLAVE. Su `start_url` es
  `/OrumAdminLogin?app=<llave>`; el `proxy` comprueba la llave, deja la
  marca del dispositivo y redirige a `/OrumAdminLogin` sin ella. Desde ahí,
  lo de siempre: con sesión, el panel; sin ella, el formulario de entrada.
  Así la app funciona SIEMPRE, sin depender de lo que tenga guardado.

  La llave no se publica: va solo en el manifiesto, y el manifiesto vive en
  una dirección que también sale de la llave (`/app-panel/<llave>.webmanifest`),
  enlazada solo desde el panel (con sesión) y desde la puerta. El manifiesto
  viejo, `/manifest-admin.webmanifest`, se retiró. Es un HMAC de la puerta,
  como la marca: si la puerta cambia (`ORUM_RUTA_PANEL`), cambia sola, y las
  apps instaladas con la llave anterior hay que instalarlas de nuevo.

  ⚠️ Una app instalada ANTES de esto no se actualiza sola (su dirección de
  arranque sin sesión es un 404, donde no hay manifiesto que leer): se
  desinstala y se instala otra vez desde el panel. Una vez.

  Solo decide QUÉ SE ENSEÑA: lo que protege el panel sigue siendo la cuenta
  del equipo, Turnstile y el límite de intentos.
*/

/** El parámetro de la dirección de arranque que lleva la llave. */
export const PARAMETRO_LLAVE_APP = 'app'

const MENSAJE = 'orum-app-panel-v1'
const LARGO = 40

const calculadas = new Map<string, Promise<string>>()

/** La llave de la app del panel para ESTA puerta (hex de 40). */
export function llaveAppPanel(puerta: string = rutaAccesoPanel()): Promise<string> {
  let llave = calculadas.get(puerta)
  if (!llave) {
    llave = firmarConPuerta(puerta, MENSAJE).then((hex) => hex.slice(0, LARGO))
    calculadas.set(puerta, llave)
  }
  return llave
}

/** ¿Es la llave de esta puerta? */
export async function esLlaveValida(
  valor: string | undefined | null,
  puerta: string = rutaAccesoPanel(),
): Promise<boolean> {
  if (!valor || valor.length !== LARGO) return false
  return valor === (await llaveAppPanel(puerta))
}

/** Dónde se sirve el manifiesto de la app del panel. */
export async function rutaManifiestoPanel(puerta: string = rutaAccesoPanel()): Promise<string> {
  return `/app-panel/${await llaveAppPanel(puerta)}.webmanifest`
}

/** La dirección con la que ABRE la app instalada. */
export function arranqueAppPanel(llave: string): string {
  return `${RUTA_PANEL}?${PARAMETRO_LLAVE_APP}=${llave}`
}

/** El archivo pedido (`<llave>.webmanifest`) → la llave, o `null`. */
export function llaveDelArchivo(archivo: string): string | null {
  const m = /^([0-9a-f]+)\.webmanifest$/.exec(archivo)
  return m ? m[1] : null
}
