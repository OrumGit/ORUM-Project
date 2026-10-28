import type { Metadata } from 'next'
import { Suspense } from 'react'
import { requireRol } from '@/lib/auth/auth'
import { cerrarSesion } from '@/app/login/actions'
import { AppShell } from '@/components/shell/app-shell'
import { RouteProgress } from '@/components/shell/route-progress'
import { RUTA_MANIFIESTO } from '@/lib/shared/manifiesto-app'

/*
  El panel enlaza SU aplicación instalable (abre en `/admin`, la «O»
  plateada sobre negro; ver `lib/shared/manifiesto-app.ts`). `appleWebApp`
  va completo: los metadatos se fusionan por clave, sin mezclar por dentro.
*/
export const metadata: Metadata = {
  title: 'Panel · ORUM',
  manifest: RUTA_MANIFIESTO.admin,
  applicationName: 'ORUM Admin',
  appleWebApp: {
    capable: true,
    title: 'ORUM Admin',
    statusBarStyle: 'black-translucent',
  },
}

/**
 * La ranura `@modal` vive AQUÍ, no en cada sección.
 *
 * Una ruta interceptada solo intercepta si el layout que declara su ranura ya
 * está montado. Cuando cada sección tenía la suya, "Empezar" desde el panel de
 * inicio —o la pestaña "Vender" del móvil— navegaba a `/admin/miembros/nuevo`
 * SIN pasar por `/admin/miembros`, así que el layout de miembros no existía
 * todavía y el formulario se abría como página completa. Desde la lista sí
 * funcionaba: la misma acción se comportaba de dos formas según de dónde
 * vinieras.
 *
 * Declarada en el layout del panel, la ranura está montada en todo `/admin`,
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

  return (
    <>
      {/*
        `useSearchParams` obliga a un límite de Suspense. La barra no pinta
        nada hasta que hay navegación, así que el fallback es vacío.
      */}
      <Suspense fallback={null}>
        <RouteProgress />
      </Suspense>

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
