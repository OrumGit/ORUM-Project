import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { rutaManifiestoPanel } from '@/lib/auth/app-panel'
import { getPerfilActual } from '@/lib/auth/auth'
import { PantallaAcceso } from '@/components/ui/pantalla-acceso'
import { LoginForm } from './login-form'

// La puerta del panel instala la aplicación del panel, como el panel mismo.
export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Iniciar sesión · ORUM',
    // Su dirección sale de la llave de la app (`lib/auth/app-panel.ts`).
    manifest: await rutaManifiestoPanel(),
    applicationName: 'ORUM Admin',
    appleWebApp: {
      capable: true,
      title: 'ORUM Admin',
      statusBarStyle: 'black-translucent',
    },
  }
}

const MENSAJES: Record<string, string> = {
  sin_permiso: 'Tu cuenta no tiene permiso para acceder a esa sección.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  // Si ya inició sesión y tiene acceso, no mostramos el login.
  const perfil = await getPerfilActual()
  if (
    perfil &&
    perfil.activo &&
    (perfil.rolCodigo === 'super_admin' || perfil.rolCodigo === 'empleado')
  ) {
    redirect('/OrumAdminLogin')
  }

  const { error } = await searchParams
  const mensajeInicial = error ? MENSAJES[error] : undefined

  return (
    <PantallaAcceso
      puerta="admin"
      titular="Administración"
      apoyo="Entra con tu correo y tu contraseña."
      pie="¿Problemas para entrar? Contacta al administrador del club."
    >
      <LoginForm mensajeInicial={mensajeInicial} />
    </PantallaAcceso>
  )
}
