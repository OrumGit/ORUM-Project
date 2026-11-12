import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { EditarMiembroForm } from './_components/editar-miembro-form'

export const metadata = { title: 'Editar miembro · ORUM' }

export default async function EditarMiembroPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRol('super_admin', 'empleado')
  const { id } = await params
  const miembroId = Number(id)

  const admin = createAdminClient()
  const { data: miembro } = await admin
    .from('miembros')
    .select('id, perfil_id, nombres, apellidos, cedula, telefono, direccion, ciudad_id')
    .eq('id', miembroId)
    .is('deleted_at', null)
    .maybeSingle()

  if (!miembro) notFound()

  const { data: ciudades } = await admin
    .from('ciudades')
    .select('id, nombre')
    .order('nombre')

  // Cadena vacía y no '—' cuando no hay correo: el valor va directo a un campo
  // de formulario, y un guión se enviaría como si fuera un correo real.
  let correo = ''
  if (miembro.perfil_id) {
    const { data: authUser } = await admin.auth.admin.getUserById(miembro.perfil_id)
    correo = authUser.user?.email ?? ''
  }

  const nombreCompleto = `${miembro.nombres} ${miembro.apellidos}`.trim()

  return (
    <>
      <PageHeader title="Editar miembro" description={nombreCompleto} />
      <FormCard><EditarMiembroForm miembro={{ ...miembro, correo }} ciudades={ciudades ?? []} /></FormCard>
    </>
  )
}
