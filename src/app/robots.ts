import type { MetadataRoute } from 'next'
import { URL_SITIO } from '@/lib/publico/sitio'

/*
  Solo se rastrea la fachada pública. Los tres portales con sesión, los accesos
  y las rutas de desarrollo quedan fuera. Es la primera capa: la segunda es el
  `noindex` por defecto del layout raíz, porque `Disallow` solo pide no
  rastrear y una URL enlazada desde fuera puede indexarse igual.
*/
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin',
        '/miembros',
        '/comercios',
        // Ni `/login` (ya no existe: da 404) ni la puerta secreta del panel:
        // `robots.txt` es público, y listarla aquí sería anunciarla.
        '/activar-cuenta',
        '/dev',
        '/offline',
        '/api',
      ],
    },
    sitemap: `${URL_SITIO}/sitemap.xml`,
    host: URL_SITIO,
  }
}
