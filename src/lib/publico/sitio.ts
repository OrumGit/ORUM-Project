/**
 * El origen canónico del sitio, sin barra final.
 *
 * FIJO EN CÓDIGO y no leído de `NEXT_PUBLIC_SITE_URL`, a propósito: esa
 * variable existe para los enlaces de correo, y en el entorno local llegó a
 * valer `https://www.cluborum.com/activar-cuenta` (con `www` y con una ruta).
 * Un sitemap o una canónica construidos sobre ella listan URLs que no existen,
 * y el fallo es silencioso: nadie ve el sitemap hasta que Google lo rechaza.
 *
 * El dominio final es `cluborum.com` SIN `www`; `www` redirige (308) a él en
 * Vercel. Si el dominio cambia, se cambia aquí, en un solo sitio.
 */
export const URL_SITIO = 'https://cluborum.com'

export const NOMBRE_SITIO = 'ORUM'

/**
 * INTERRUPTOR: ¿se indexan las páginas que enseñan el catálogo de comercios?
 *
 * Son la portada (`/`, «Comercios destacados») y `/explorar` (el directorio).
 * Encendido desde el 12/11/2026 (encargo del propietario: indexar la portada
 * y el directorio de una vez). Los nombres que pintan son los de los comercios
 * activos, aunque sigan siendo datos de prueba: el `indexable` por comercio
 * sigue mandando sobre cada FICHA, no sobre estas dos páginas.
 *
 * Con `true`: `index` en ambas y `/` y `/explorar` van en el sitemap, más las
 * fichas con `indexable = true`. Para volver a ocultarlas, poner `false`.
 */
export const INDEXAR_CATALOGO = true
