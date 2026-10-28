import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
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
     * - Artefactos de la PWA: sw.js, los tres manifiestos (socio, comercio y
     *   panel: `manifest-*.webmanifest`), offline, y los
     *   iconos generados (`apple-icon` no lleva extensión, así que la regla
     *   de imágenes de abajo no lo cubre). El navegador los pide sin sesión,
     *   y `offline` tiene que poder servirse justamente cuando no hay
     *   conexión con Supabase.
     */
    '/((?!_next/static|_next/image|favicon.ico|dev/|sw\\.js|manifest-[a-z]+\\.webmanifest|offline|apple-icon|icon|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
