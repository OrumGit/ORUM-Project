import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { EditarForm } from './_components/editar-usuario-form'

export const metadata = { title: 'Editar usuario · ORUM' }

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRol('super_admin')
  const { id: perfilId } = await params

  const admin = createAdminClient()

  const [{ data: empleado }, { data: authUser }] = await Promise.all([
    admin
      .from('empleados')
      .select('nombres, apellidos, cedula, telefono')
      .eq('perfil_id', perfilId)
      .maybeSingle(),
    admin.auth.admin.getUserById(perfilId),
  ])

  if (!empleado) notFound()

  const email = authUser?.user?.email ?? ''

  const nombreCompleto = `${empleado.nombres} ${empleado.apellidos}`.trim()

  return (
    <>
      <PageHeader title="Editar usuario" description={nombreCompleto} />
      <FormCard><EditarForm perfilId={perfilId} email={email} empleado={empleado} /></FormCard>
    </>
  )
}
