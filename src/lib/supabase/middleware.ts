import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refresca la sesión de Supabase en cada petición y sincroniza las cookies.
 * Se invoca desde src/middleware.ts. Es necesario para que la autenticación
 * funcione correctamente en Server Components (que no pueden escribir cookies).
 */
export async function updateSession(
  request: NextRequest,
  /**
   * Si llega, la respuesta REESCRIBE a esta dirección (la puerta del panel).
   * Puede ser una función: decide DESPUÉS de saber si hay sesión (la app
   * instalada del panel, `lib/auth/marca-equipo.ts`).
   */
  reescribirA?: URL | ((conSesion: boolean) => URL | undefined),
) {
  const fija = typeof reescribirA === 'function' ? undefined : reescribirA
  // La misma respuesta, sigas o reescribas: las cookies refrescadas viajan igual.
  const responder = () =>
    fija ? NextResponse.rewrite(fija, { request }) : NextResponse.next({ request })
  let supabaseResponse = responder()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = responder()
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: no ejecutes código entre createServerClient y getClaims().
  // Esta llamada refresca el token si ha expirado.
  //
  // `getClaims()` y no `getUser()` (08/11/2026): el proxy solo refresca la
  // sesión, no decide quién entra. `getUser()` es una llamada de red a Auth en
  // CADA petición —también las públicas con cookie— y Auth tiene 10
  // conexiones; `getClaims()` valida la firma del token en local (el proyecto
  // firma con ES256, clave asimétrica). El acceso lo sigue decidiendo
  // `getPerfilActual` con `getUser()`, que sí consulta a Auth: una sesión
  // revocada o un usuario bloqueado no pasa por esto.
  const { data } = await supabase.auth.getClaims()

  if (typeof reescribirA === 'function') {
    const destino = reescribirA(Boolean(data?.claims))
    if (destino) {
      // La misma respuesta, reescrita, con las cookies que ya llevaba.
      const reescrita = NextResponse.rewrite(destino, { request })
      supabaseResponse.cookies.getAll().forEach((cookie) => reescrita.cookies.set(cookie))
      return reescrita
    }
  }

  return supabaseResponse
}
