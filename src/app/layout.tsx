import type { Metadata, Viewport } from 'next'
import { Montserrat, Playfair_Display } from 'next/font/google'
import { ThemeScript } from '@/components/theme/theme-script'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { RegistrarSW } from '@/components/pwa/registrar-sw'
import { URL_SITIO } from '@/lib/publico/sitio'
import './globals.css'

/**
 * DOS FAMILIAS — MONTSERRAT + PLAYFAIR DISPLAY (dirección de arte v6, §7).
 *
 * ⚠️ ESTO DEROGA «UNA SOLA FAMILIA» DE LA v5. La v5 fusionó `--font-display`
 * en `--font-sans` (Plus Jakarta Sans) por encargo de entonces. La v6 llega
 * con una guía de marca real del cliente que nombra las dos familias por
 * nombre: «Playfair Display (títulos) · Montserrat (textos)». No es un
 * vaivén de gusto de sesión — es una identidad de marca entregada, y
 * reemplaza formalmente la regla anterior. Ver `.claude/docs/log/v6-crema-oro.md`.
 *
 * MONTSERRAT reemplaza a Plus Jakarta Sans en TODO lo que no es titular
 * ceremonial: nav, botones, formularios, tablas, cuerpo de párrafo. Variable
 * en `wght`, se pide el rango que el sistema consume (ver `tokens.css` §7).
 *
 * PLAYFAIR DISPLAY entra por primera vez desde que la v5 retiró a Fraunces.
 * Se pide con cursiva real (`style: ['normal', 'italic']`) porque el héroe y
 * los títulos de sección usan un acento en cursiva dorada sobre el romano
 * («*tu ciudad*», «*sí se sienten*») — una cursiva sintética (oblicua) se ve
 * mal en un serif de contraste alto, así que hace falta el corte real.
 *
 * QUÉ SE PAGA: la v5 bajó el presupuesto de fuentes de dos familias a una
 * (57,6 KB). La v6 vuelve a subirlo — es un costo aceptado por mandato
 * explícito del cliente, no un descuido. Medir en el próximo `build` y
 * anotarlo en el log de la v6.
 *
 *   · `subsets: ['latin']` en las dos — sin cirílico, griego ni `latin-ext`.
 *   · `display: 'swap'` en las dos — sin esto, el h1 de la primera pantalla
 *     queda invisible hasta que llega la fuente.
 *   · Las dos se auto-hospedan en build: cero peticiones a Google en runtime.
 *   · El ajuste de métricas del fallback lo calcula `next/font` por defecto.
 *     Las pilas de reserva están en `--font-sans` / `--font-display`
 *     (`tokens.css` §7), no aquí.
 */
const montserrat = Montserrat({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-montserrat',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(URL_SITIO),
  title: { default: 'ORUM · Club de beneficios', template: '%s' },
  description: 'Plataforma del club de beneficios ORUM.',

  /*
    NOINDEX POR DEFECTO. Los tres portales con sesión, los accesos y cualquier
    ruta nueva quedan fuera de los buscadores sin que nadie tenga que
    acordarse. Solo `(publico)/layout.tsx` lo levanta.
  */
  robots: { index: false, follow: false },

  // Nombre corto que iOS usa bajo el icono en la pantalla de inicio.
  applicationName: 'ORUM',

  appleWebApp: {
    // Abre a pantalla completa, sin la barra de Safari, cuando se instala
    // desde "Añadir a pantalla de inicio".
    capable: true,
    title: 'ORUM',
    // `black-translucent` deja que el contenido llegue hasta arriba del todo;
    // el espacio de la barra de estado lo reserva `env(safe-area-inset-top)`.
    statusBarStyle: 'black-translucent',
  },

  // Evita que iOS convierta números largos (cédulas, teléfonos, números de
  // membresía) en enlaces de llamada azules dentro de las tablas.
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Necesario para que `env(safe-area-inset-*)` tenga efecto: sin esto la tab
  // bar de la Fase C quedaría bajo la barra de gestos del iPhone.
  viewportFit: 'cover',
  // Tiñe la barra de estado del móvil. Crítico en PWA instalada: sin las dos
  // variantes la app aparece con una franja del color del tema contrario.
  //
  // v6: el claro pasa de `--w-0` blanco puro (#FFFFFF, v5) al crema de la
  // nueva paleta (#FAF6EC). El oscuro no cambia: `--n-1000` (#111114) sigue
  // igual. Aquí TIENEN que ser literales, porque un `var()` no se resuelve
  // dentro de una meta etiqueta, así que este es un sitio donde la paleta
  // está copiada a mano y hay que moverla con ella.
  //
  // ⚠️ NO ES EL ÚNICO SITIO. Hay otras tres copias a mano de la paleta, y las
  // cuatro tienen que moverse JUNTAS o la aplicación instalada arranca con los
  // colores de una dirección de arte retirada — que ya pasó una vez, al
  // cambiar a la v5, y hubo que corregir después:
  //   · `src/lib/shared/manifiesto-app.ts` (los tres manifiestos) ..... colores de arranque
  //   · Los iconos (`src/app/icon.png`, `favicon.ico`, `apple-icon.png` y
  //     `public/icons/orum-*.png`) son desde el 29/09/2026 el monograma
  //     DORADO del cliente sin fondo, generados como imagen: no llevan
  //     colores de la paleta que haya que mover a mano.
  // Ninguno puede leer una variable CSS: el manifiesto y los iconos los
  // resuelve el sistema operativo antes de que exista una hoja de estilos.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF6EC' },
    { media: '(prefers-color-scheme: dark)', color: '#111114' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    /*
      suppressHydrationWarning en <html>: el script anti-flash estampa
      `data-theme` antes de que React hidrate, así que el atributo no coincide
      con lo que renderizó el servidor. Es intencionado.

      En <body>: algunas extensiones del navegador (p. ej. Bitdefender con
      `bis_register`) inyectan atributos antes de que React cargue.
    */
    <html
      lang="es"
      className={`${montserrat.variable} ${playfair.variable}`}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
        <RegistrarSW />
      </body>
    </html>
  )
}
