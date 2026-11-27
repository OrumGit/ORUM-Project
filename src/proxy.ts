import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import {
  RUTA_INTERNA_ACCESO,
  esAccesoInternoDirecto,
  rutaAccesoPanel,
  rutaPanelCanonica,
} from '@/lib/auth/ruta-panel'
import {
  COOKIE_EQUIPO,
  OPCIONES_COOKIE_EQUIPO,
  entrarEnElSitio,
  esMarcaValida,
  esRutaDelPanel,
  marcaDeEquipo,
} from '@/lib/auth/marca-equipo'
import { PARAMETRO_LLAVE_APP, esLlaveValida } from '@/lib/auth/app-panel'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  /*
    LA PUERTA DEL PANEL (11/11/2026, `lib/auth/ruta-panel.ts`). Su dirección
    secreta se reescribe por dentro a la página real; `/login` escrita a
    mano da «página no encontrada», como cualquier dirección inventada.
  */
  if (pathname === rutaAccesoPanel()) {
    const destino = request.nextUrl.clone()
    destino.pathname = RUTA_INTERNA_ACCESO
    const respuesta = await updateSession(request, destino)
    // Quien llega a la puerta es del equipo: este dispositivo la recuerda.
    const marca = await marcaDeEquipo()
    if (request.cookies.get(COOKIE_EQUIPO)?.value !== marca) {
      respuesta.cookies.set(COOKIE_EQUIPO, marca, OPCIONES_COOKIE_EQUIPO)
    }
    return respuesta
  }

  /*
    LA APP INSTALADA DEL PANEL SIEMPRE ABRE (25/11/2026, `lib/auth/marca-equipo.ts`).
    En el panel, sin sesión y en un dispositivo del equipo, el formulario de
    entrada se enseña EN ESA MISMA DIRECCIÓN (reescrita por dentro): la app
    no tiene barra de direcciones y la puerta secreta queda fuera de su
    ámbito. Sin la marca, 404 como siempre.
  */
  if (esRutaDelPanel(pathname)) {
    /*
      LA APP INSTALADA ABRE CON SU LLAVE (26/11/2026, `lib/auth/app-panel.ts`):
      con la llave buena, el dispositivo queda marcado; con o sin ella, se
      sigue en la misma dirección SIN el parámetro (no se distingue una llave
      mala de una buena por la respuesta).
    */
    const llave = request.nextUrl.searchParams.get(PARAMETRO_LLAVE_APP)
    if (llave !== null) {
      const limpia = request.nextUrl.clone()
      limpia.searchParams.delete(PARAMETRO_LLAVE_APP)
      const respuesta = NextResponse.redirect(limpia, 303)
      if (await esLlaveValida(llave)) {
        respuesta.cookies.set(COOKIE_EQUIPO, await marcaDeEquipo(), OPCIONES_COOKIE_EQUIPO)
      }
      return respuesta
    }

    const marcaValida = await esMarcaValida(request.cookies.get(COOKIE_EQUIPO)?.value)
    if (marcaValida) {
      const entrada = request.nextUrl.clone()
      entrada.pathname = RUTA_INTERNA_ACCESO
      return await updateSession(request, (conSesion) =>
        entrarEnElSitio({ pathname, conSesion, marcaValida }) ? entrada : undefined,
      )
    }
  }
  // `/orumadminlogin/...` escrita a mano: a la forma correcta, `/OrumAdminLogin/...`.
  const canonica = rutaPanelCanonica(pathname)
  if (canonica) {
    const destino = request.nextUrl.clone()
    destino.pathname = canonica
    return NextResponse.redirect(destino, 308)
  }
  if (esAccesoInternoDirecto(pathname)) {
    const noExiste = request.nextUrl.clone()
    noExiste.pathname = '/pagina-no-encontrada'
    noExiste.search = ''
    return NextResponse.rewrite(noExiste, { status: 404 })
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Aplica a todas las rutas excepto:
     * - _next/static, _next/image (archivos internos de Next)
     * - favicon.ico y archivos de imagen
     * - dev/** (galería del sistema de diseño: solo existe en desarrollo, no
     *   lee datos y no tiene sesión que refrescar)
     * - Artefactos de la PWA: sw.js, los tres manifiestos (socio y comercio:
     *   `manifest-*.webmanifest`; panel: `app-panel/<llave>`), offline, y los
     *   iconos generados (`apple-icon` no lleva extensión, así que la regla
     *   de imágenes de abajo no lo cubre). El navegador los pide sin sesión,
     *   y `offline` tiene que poder servirse justamente cuando no hay
     *   conexión con Supabase.
     */
    '/((?!_next/static|_next/image|favicon.ico|dev/|app-panel/|sw\\.js|manifest-[a-z]+\\.webmanifest|offline|apple-icon|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
