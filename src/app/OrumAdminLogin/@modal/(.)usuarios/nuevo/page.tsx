import { requireRol } from '@/lib/auth/auth'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { UsuarioForm } from '@/app/OrumAdminLogin/usuarios/nuevo/_components/usuario-form'

export default async function NuevoUsuarioInterceptado() {
  await requireRol('super_admin')

  return (
    <OverlayRuta
      title="Crear usuario"
      description="Empleados y administradores del panel. La contraseña se genera automáticamente."
      width="640px"
    >
      <UsuarioForm />
    </OverlayRuta>
  )
}
