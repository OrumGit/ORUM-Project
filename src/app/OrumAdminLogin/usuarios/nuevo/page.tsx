import { requireRol } from '@/lib/auth/auth'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { UsuarioForm } from './_components/usuario-form'

export const metadata = { title: 'Crear usuario · ORUM' }

export default async function NuevoUsuarioPage() {
  await requireRol('super_admin')

  return (
    <>
      <PageHeader
        title="Crear usuario"
        description="Empleados y administradores del panel. La contraseña se genera automáticamente."
      />
      <FormCard><UsuarioForm /></FormCard>
    </>
  )
}
