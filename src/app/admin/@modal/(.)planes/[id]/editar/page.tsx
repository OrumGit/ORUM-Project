import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { PlanForm } from '@/app/admin/planes/_components/plan-form'

export default async function EditarPlanInterceptado({
  params,
}: {
  params: Promise<{ id: string }>
}) {
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
    <OverlayRuta title="Editar descripción" description={plan.nombre} detent="medium">
      <PlanForm plan={plan} />
    </OverlayRuta>
  )
}
