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

/**
 * Perfiles oficiales de ORUM en redes sociales (URLs completas).
 *
 * Google asocia la marca con su web cuando los perfiles enlazan al dominio y
 * el dominio enlaza a ellos (`sameAs`). Vacía hasta tener las URLs reales:
 * con la lista vacía no se escribe nada, así que no aparece ningún enlace
 * inventado en los datos estructurados.
 */
export const REDES_SOCIALES: readonly string[] = ['https://www.instagram.com/cluborum.co/']

/**
 * Datos estructurados (JSON-LD) de la fachada: la organización y el sitio.
 * Google los lee en la portada; el `WebSite` con nombre y URL canónica ayuda a
 * que la búsqueda de la marca apunte al dominio correcto.
 */
export function datosEstructuradosSitio(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${URL_SITIO}/#organizacion`,
        name: NOMBRE_SITIO,
        url: URL_SITIO,
        logo: `${URL_SITIO}/icon.png`,
        description:
          'Club de beneficios por membresía. Una red de valor que conecta personas con los mejores comercios y experiencias locales.',
        ...(REDES_SOCIALES.length > 0 ? { sameAs: [...REDES_SOCIALES] } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${URL_SITIO}/#sitio`,
        name: NOMBRE_SITIO,
        url: URL_SITIO,
        inLanguage: 'es-CO',
        publisher: { '@id': `${URL_SITIO}/#organizacion` },
      },
    ],
  }
}
