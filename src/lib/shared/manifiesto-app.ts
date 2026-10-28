import type { MetadataRoute } from 'next'

/*
  LAS TRES APLICACIONES INSTALABLES DE ORUM  ·  29/10/2026
  ---------------------------------------------------------------------------
  Encargo del propietario: «las opciones de descargar la aplicación para
  todos los portales, excepto el portal inicial; para comercios, usuarios y
  administrador, cada uno con su logo»:

    · la del SOCIO    — abre en `/miembros`;  la «O» dorada sobre BLANCO;
    · la del COMERCIO — abre en `/comercios`; la «O» dorada sobre NEGRO;
    · la del PANEL    — abre en `/admin`;     la «O» plateada sobre NEGRO.

  Cada una tiene su manifiesto (un Route Handler: Next solo admite el
  `manifest.ts` especial en la raíz, y ese lo enlazaría también la portada
  pública, que NO se instala) y lo enlaza el layout de su portal y de su
  pantalla de acceso. Son tres aplicaciones distintas para el sistema —cada
  una con su `id`—, así que quien es socio y además trabaja en un comercio
  puede tener las dos.

  Los iconos son PNG opacos generados desde `src/components/ui/marca/`
  (`monograma.png` y `monograma-plata.png`) con el fondo de cada aplicación;
  los de iOS son los `apple-icon.png` de `app/miembros`, `app/comercios`,
  `app/admin` y `app/login`. La variante `maskable` deja el monograma dentro
  del 80 % central, que es lo que Android no recorta al aplicar su forma.
  Si cambia el monograma, se regeneran todos.

  Los colores son copias a mano de la paleta (un manifiesto no lee
  `var(--…)`): el negro es `--negro-900`, el blanco `--blanco`, y la barra
  de estado `--n-1000`. Si la paleta cambia, cambian aquí.
*/

export type AppInstalable = 'socio' | 'comercio' | 'admin'

/** `--n-1000`: la barra de estado de la aplicación instalada. */
export const COLOR_ARRANQUE = '#111114'
const NEGRO = '#0A0A0C'
const BLANCO = '#FFFFFF'

/** Dónde se sirve el manifiesto de cada aplicación. */
export const RUTA_MANIFIESTO: Record<AppInstalable, string> = {
  socio: '/manifest-miembros.webmanifest',
  comercio: '/manifest-comercios.webmanifest',
  admin: '/manifest-admin.webmanifest',
}

function iconos(app: AppInstalable): NonNullable<MetadataRoute.Manifest['icons']> {
  return [192, 512].flatMap((lado) => [
    { src: `/icons/${app}-${lado}.png`, sizes: `${lado}x${lado}`, type: 'image/png', purpose: 'any' as const },
    {
      src: `/icons/${app}-maskable-${lado}.png`,
      sizes: `${lado}x${lado}`,
      type: 'image/png',
      purpose: 'maskable' as const,
    },
  ])
}

const COMUN = {
  display: 'standalone',
  orientation: 'portrait',
  theme_color: COLOR_ARRANQUE,
  lang: 'es-CO',
  dir: 'ltr',
  categories: ['business', 'productivity'],
} satisfies MetadataRoute.Manifest

export const MANIFIESTOS: Record<AppInstalable, MetadataRoute.Manifest> = {
  /*
    La del SOCIO. `scope: '/'` y no `/miembros`: los textos legales del pie y
    la ficha pública de un comercio se abren dentro de la app sin sacarlo a
    un navegador. Su `id` es el que ya tenía cuando era `app/manifest.ts`
    (sin `id`, valía su `start_url`): las instaladas siguen siendo la misma
    aplicación y toman el icono nuevo.
  */
  socio: {
    ...COMUN,
    id: '/miembros',
    name: 'ORUM · Club de beneficios',
    short_name: 'ORUM',
    description:
      'Tus beneficios en los comercios aliados del club ORUM: el catálogo completo y tu carnet de socio, siempre a mano.',
    start_url: '/miembros',
    scope: '/',
    background_color: BLANCO,
    icons: iconos('socio'),
    // Mantener pulsado el icono: el carnet primero, que es lo que se abre
    // con prisa delante del cajero.
    shortcuts: [
      {
        name: 'Mi carnet',
        short_name: 'Carnet',
        description: 'Mostrar tu carnet de socio y su código QR',
        url: '/miembros/perfil',
      },
      {
        name: 'Comercios y beneficios',
        short_name: 'Comercios',
        description: 'Ver el catálogo de aliados del club',
        url: '/miembros',
      },
    ],
  },

  /* La del COMERCIO: solo su portal, sin sacar al cajero de su caja. */
  comercio: {
    ...COMUN,
    id: '/comercios',
    name: 'ORUM Comercios · Verificar membresías',
    short_name: 'Comercios',
    description:
      'La herramienta de caja de los comercios aliados de ORUM: verifica el carnet de cada socio y registra sus compras.',
    start_url: '/comercios',
    scope: '/comercios',
    background_color: NEGRO,
    icons: iconos('comercio'),
  },

  /*
    La del PANEL. `orientation: 'any'`: en una tableta el panel se usa
    también apaisado. Atajos a lo que se hace a diario en el mostrador.
  */
  admin: {
    ...COMUN,
    id: '/admin',
    name: 'ORUM Administración',
    short_name: 'ORUM Admin',
    description: 'El panel de administración del club ORUM: miembros, comercios, ventas y métricas.',
    start_url: '/admin',
    scope: '/admin',
    orientation: 'any',
    background_color: NEGRO,
    icons: iconos('admin'),
    shortcuts: [
      { name: 'Registrar miembro', short_name: 'Registrar', url: '/admin/miembros/nuevo' },
      { name: 'Miembros', short_name: 'Miembros', url: '/admin/miembros' },
    ],
  },
}

/** La respuesta de un Route Handler de manifiesto. */
export function respuestaManifiesto(app: AppInstalable): Response {
  return new Response(JSON.stringify(MANIFIESTOS[app]), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8' },
  })
}
