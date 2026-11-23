/*
  LA PUERTA DEL PANEL NO SE ANUNCIA  ·  (11/11/2026)
  ---------------------------------------------------------------------------
  Encargo del cliente: «la gente puede ver cluborum.com/login; que la ruta
  del administrador sea algo más seguro y difícil de encontrar, y que solo
  accedan el administrador y las personas encargadas».

  La entrada del panel vive en una dirección LARGA Y ALEATORIA que solo
  conoce el equipo. El `proxy` la reescribe por dentro a la página real
  (`app/login`), y `/login` escrita a mano da «página no encontrada», como
  cualquier dirección inventada. Para que nada la delate:
    · entrar al panel (`/OrumAdminLogin`) sin sesión (o con una cuenta que no es del equipo)
      también da 404 (`requireRol`), en vez de mandar a la puerta;
    · no aparece en `robots.txt`, ni en el sitemap, ni en ningún enlace;
    · este módulo NUNCA se importa desde un componente de cliente: lo que
      llega al navegador lo puede leer cualquiera.

  ⚠️ Esto ESCONDE la puerta; no es lo que la cierra. Lo que protege de
  verdad sigue siendo lo de siempre: correo y contraseña de una cuenta del
  equipo (`super_admin` o `empleado`), Cloudflare Turnstile en el formulario
  y los límites de intentos de Supabase.

  Se cambia SIN tocar el código con la variable de entorno `ORUM_RUTA_PANEL`
  en Vercel (por ejemplo, si alguien que la conocía deja el equipo). Si falta
  o no es válida, vale la de serie.
*/

/** La de serie. Larga y aleatoria: no se adivina probando. */
export const RUTA_PANEL_POR_DEFECTO = '/equipo-uw4xrd7zpvb6f6'

/** La página real a la que se reescribe (la carpeta `app/login`). */
export const RUTA_INTERNA_ACCESO = '/login'

/**
 * Los primeros tramos que ya usa el sitio: la puerta no puede pisar uno.
 * (Una dirección nueva del sitio con el mismo nombre que la puerta la
 * taparía, o al revés.)
 */
const RESERVADAS = new Set([
  'orumadminlogin',
  'admin',
  'miembros',
  'comercios',
  'login',
  'activar-cuenta',
  'explorar',
  'aliados',
  'novedades',
  'privacidad',
  'terminos',
  'derechos-de-autor',
  'dev',
  'api',
  'offline',
  '_next',
])

/**
 * Una ruta válida para la puerta: un solo tramo, minúsculas, números y
 * guiones, de 12 a 64 caracteres, que no pise una ruta del sitio. Si no lo
 * es, la de serie.
 */
export function normalizarRutaPanel(valor: string | undefined | null): string {
  const ruta = (valor ?? '').trim().toLowerCase()
  const tramo = ruta.replace(/^\//, '')
  if (!/^[a-z0-9][a-z0-9-]{11,63}$/.test(tramo)) return RUTA_PANEL_POR_DEFECTO
  if (RESERVADAS.has(tramo.split('-')[0]) || RESERVADAS.has(tramo)) return RUTA_PANEL_POR_DEFECTO
  return `/${tramo}`
}

/** La dirección de la puerta del panel. Solo en el servidor. */
export function rutaAccesoPanel(): string {
  return normalizarRutaPanel(process.env.ORUM_RUTA_PANEL)
}

/**
 * EL PANEL VIVE EN `/OrumAdminLogin` (11/11/2026, encargo del propietario:
 * «cuando se inicie no sirva tampoco /admin sino /OrumAdminLogin»). Es la
 * carpeta `app/OrumAdminLogin`; `/admin` ya no existe. Las direcciones
 * distinguen mayúsculas, así que `/orumadminlogin/...` escrita a mano se
 * lleva a la forma correcta.
 */
export const RUTA_PANEL = '/OrumAdminLogin'

/** La misma dirección con las mayúsculas correctas, o `null` si ya lo está o no es del panel. */
export function rutaPanelCanonica(pathname: string): string | null {
  const minusculas = RUTA_PANEL.toLowerCase()
  const pedida = pathname.toLowerCase()
  const esDelPanel = pedida === minusculas || pedida.startsWith(`${minusculas}/`)
  if (!esDelPanel || pathname.startsWith(RUTA_PANEL)) return null
  return RUTA_PANEL + pathname.slice(RUTA_PANEL.length)
}

/** ¿Es una petición directa a la página interna (`/login`, `/login/…`)? */
export function esAccesoInternoDirecto(pathname: string): boolean {
  return pathname === RUTA_INTERNA_ACCESO || pathname.startsWith(`${RUTA_INTERNA_ACCESO}/`)
}
