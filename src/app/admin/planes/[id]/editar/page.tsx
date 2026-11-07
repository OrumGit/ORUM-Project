import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { PlanForm } from '../../_components/plan-form'

export const metadata = { title: 'Editar descripción del plan · ORUM' }

export default async function EditarPlanPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRol('super_admin')
  const { id } = await params

  const admin = createAdminClient()
  const { data: plan } = await admin
    .from('planes_membresia')
    .select('id, nombre, descripcion, precio, duracion_meses')
    .eq('id', Number(id))
    .is('deleted_at', null)
    .maybeSingle()

  if (!plan) notFound()

  return (
    <>
      <PageHeader title="Editar descripción" description={plan.nombre} />
      <FormCard><PlanForm plan={plan} /></FormCard>
    </>
  )
}
