import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { FormCard } from '@/components/ui/form-card'
import { PageHeader } from '@/components/ui/layout'
import { RenovarForm } from '../_components/renovar-form'

export const metadata = { title: 'Renovar membresía · ORUM' }

export default async function RenovarPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const perfil = await requireRol('super_admin', 'empleado')
  const { id } = await params
  const miembroId = Number(id)

  const admin = createAdminClient()
  const [{ data: miembro }, { data: planes }] = await Promise.all([
    admin
      .from('miembros')
      .select('id, nombres, apellidos')
      .eq('id', miembroId)
      .is('deleted_at', null)
      .maybeSingle(),
    admin
      .from('planes_membresia')
      .select('id, nombre, precio')
      .eq('activo', true)
      .is('deleted_at', null)
      .order('nombre'),
  ])

  if (!miembro) notFound()

  return (
    <>
      <PageHeader
        title="Renovar membresía"
        description={`${miembro.nombres} ${miembro.apellidos}`.trim()}
      />
      <FormCard>
        <RenovarForm
          miembroId={miembro.id}
          planes={planes ?? []}
          puedeCortesia={perfil.rolCodigo === 'super_admin'}
        />
      </FormCard>
    </>
  )
}
