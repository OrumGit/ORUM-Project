import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { PromocionForm } from '../_components/promocion-form'

export const metadata = { title: 'Nueva promoción · ORUM' }

export default async function NuevaPromocionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireRol('super_admin')
  const { id } = await params
  const comercioId = Number(id)

  const admin = createAdminClient()
  const [{ data: comercio }, { data: tipos }] = await Promise.all([
    admin
      .from('comercios')
      .select('id, nombre')
      .eq('id', comercioId)
      .is('deleted_at', null)
      .maybeSingle(),
    admin.from('tipos_beneficio').select('id, codigo, nombre').order('id'),
  ])
  if (!comercio) notFound()

  return (
    <>
      <PageHeader title="Nueva promoción" description={comercio.nombre} />
      <FormCard><PromocionForm comercioId={comercioId} tipos={tipos ?? []} /></FormCard>
    </>
  )
}
