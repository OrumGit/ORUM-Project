import type { Metadata } from 'next'
import { Suspense } from 'react'
import { cookies } from 'next/headers'
import { getPerfilActual, requireRol } from '@/lib/auth/auth'
import { COOKIE_EQUIPO, esMarcaValida } from '@/lib/auth/marca-equipo'
import { cerrarSesion, recordarEsteDispositivo } from '@/app/login/actions'
import { RecordarDispositivo } from '@/components/shell/recordar-dispositivo'
import { AppShell } from '@/components/shell/app-shell'
import { RouteProgress } from '@/components/shell/route-progress'
import { rutaManifiestoPanel } from '@/lib/auth/app-panel'

/*
  El panel enlaza SU aplicación instalable (abre en `/OrumAdminLogin`, la «O»
  plateada sobre negro; ver `lib/shared/manifiesto-app.ts`). `appleWebApp`
  va completo: los metadatos se fusionan por clave, sin mezclar por dentro.
*/
export async function generateMetadata(): Promise<Metadata> {
  /*
    El manifiesto lleva la llave de la app: SOLO para el equipo con sesión.
    Los metadatos se resuelven aunque `requireRol` dé «no encontrado», y sin
    esta comprobación el 404 de `/OrumAdminLogin` enlazaba el manifiesto.
  */
  const perfil = await getPerfilActual()
  const delEquipo =
    !!perfil?.activo && (perfil.rolCodigo === 'super_admin' || perfil.rolCodigo === 'empleado')
  return {
    title: 'Panel · ORUM',
    // Su dirección sale de la llave de la app (`lib/auth/app-panel.ts`).
    manifest: delEquipo ? await rutaManifiestoPanel() : undefined,
    applicationName: 'ORUM Admin',
    appleWebApp: {
      capable: true,
      title: 'ORUM Admin',
      statusBarStyle: 'black-translucent',
    },
  }
}

/**
 * La ranura `@modal` vive AQUÍ, no en cada sección.
 *
 * Una ruta interceptada solo intercepta si el layout que declara su ranura ya
 * está montado. Cuando cada sección tenía la suya, "Empezar" desde el panel de
 * inicio —o la pestaña "Vender" del móvil— navegaba a `/OrumAdminLogin/miembros/nuevo`
 * SIN pasar por `/OrumAdminLogin/miembros`, así que el layout de miembros no existía
 * todavía y el formulario se abría como página completa. Desde la lista sí
 * funcionaba: la misma acción se comportaba de dos formas según de dónde
 * vinieras.
 *
 * Declarada en el layout del panel, la ranura está montada en todo `/OrumAdminLogin`,
 * y cualquier enlace a un formulario lo abre encima venga de donde venga.
 */
export default async function AdminLayout({
  children,
  modal,
}: {
  children: React.ReactNode
  modal: React.ReactNode
}) {
  // Solo super_admin y empleado entran al portal administrativo. El shell
  // filtra los destinos por rol, pero eso es presentación: la autorización
  // real la sigue haciendo `requireRol` aquí y en cada página y server action.
  const perfil = await requireRol('super_admin', 'empleado')
  // ¿Este dispositivo ya recuerda la entrada? (la app instalada, 25/11/2026)
  const recordado = await esMarcaValida((await cookies()).get(COOKIE_EQUIPO)?.value)

  return (
    <>
      {/*
        `useSearchParams` obliga a un límite de Suspense. La barra no pinta
        nada hasta que hay navegación, así que el fallback es vacío.
      */}
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>
      {recordado ? null : <RecordarDispositivo recordar={recordarEsteDispositivo} />}

      <AppShell
        user={{
          // Hasta que el perfil guarde nombre y apellido, el correo es lo
          // único identificable que hay para las iniciales del avatar.
          nombre: perfil.email ?? perfil.rolNombre,
          email: perfil.email,
          rolNombre: perfil.rolNombre,
          rolCodigo: perfil.rolCodigo,
        }}
        cerrarSesion={cerrarSesion}
      >
        {children}
        {modal}
      </AppShell>
    </>
  )
}
