import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { SucursalForm } from '../_components/sucursal-form'

export const metadata = { title: 'Nueva sucursal · ORUM' }

export default async function NuevaSucursalPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRol('super_admin')
  const { id } = await params
  const comercioId = Number(id)

  const admin = createAdminClient()
  const [{ data: comercio }, { data: ciudades }] = await Promise.all([
    admin
      .from('comercios')
      .select('id, nombre')
      .eq('id', comercioId)
      .is('deleted_at', null)
      .maybeSingle(),
    admin.from('ciudades').select('id, nombre').order('nombre'),
  ])
  if (!comercio) notFound()

  return (
    <>
      <PageHeader title="Nueva sucursal" description={comercio.nombre} />
      <FormCard><SucursalForm comercioId={comercioId} ciudades={ciudades ?? []} /></FormCard>
    </>
  )
}
