import type { MetadataRoute } from 'next'
import { obtenerComerciosIndexables } from '@/lib/publico/datos-publicos'
import { INDEXAR_CATALOGO, URL_SITIO } from '@/lib/publico/sitio'

/* Se lee en cada petición: un comercio que un administrador enciende o apaga
   tiene que aparecer o salir sin redesplegar. */
export const dynamic = 'force-dynamic'

const PAGINAS_FIJAS: { ruta: string; prioridad: number }[] = [
  /* Portada y directorio enseñan el catálogo: ver `INDEXAR_CATALOGO`. */
  ...(INDEXAR_CATALOGO
    ? [
        { ruta: '', prioridad: 1 },
        { ruta: '/explorar', prioridad: 0.9 },
      ]
    : []),
  { ruta: '/aliados', prioridad: 0.7 },
  { ruta: '/novedades', prioridad: 0.6 },
  { ruta: '/terminos', prioridad: 0.2 },
  { ruta: '/privacidad', prioridad: 0.2 },
  { ruta: '/reembolsos', prioridad: 0.2 },
  { ruta: '/pqrs', prioridad: 0.2 },
  /* `/derechos-de-autor` se añade aquí cuando el abogado dé el visto bueno al
     texto (hoy es un borrador con `noindex`). */
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  /* Un fallo de la base no debe tumbar el sitemap: las páginas fijas siguen
     siendo válidas y Google reintenta. */
  const comercios = INDEXAR_CATALOGO ? await obtenerComerciosIndexables().catch(() => []) : []

  return [
    ...PAGINAS_FIJAS.map((p) => ({
      url: `${URL_SITIO}${p.ruta}`,
      priority: p.prioridad,
    })),
    ...comercios.map((c) => ({
      url: `${URL_SITIO}/explorar/${c.id}`,
      lastModified: c.actualizado,
      priority: 0.6,
    })),
  ]
}
