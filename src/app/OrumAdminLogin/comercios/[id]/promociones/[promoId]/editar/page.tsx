import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { PromocionForm } from '../../_components/promocion-form'

export const metadata = { title: 'Editar promoción · ORUM' }

export default async function EditarPromocionPage({
  params,
}: {
  params: Promise<{ id: string; promoId: string }>
}) {
  await requireRol('super_admin')
  const { id, promoId } = await params
  const comercioId = Number(id)

  const admin = createAdminClient()
  const [{ data: promocion }, { data: tipos }] = await Promise.all([
    admin
      .from('promociones')
      // `*` y no la lista: así trae `franjas_horarias` cuando la migración
      // está aplicada, y no falla cuando todavía no.
      .select('*')
      .eq('id', Number(promoId))
      .eq('comercio_id', comercioId)
      .is('deleted_at', null)
      .maybeSingle(),
    admin.from('tipos_beneficio').select('id, codigo, nombre').order('id'),
  ])
  if (!promocion) notFound()

  return (
    <>
      <PageHeader title="Editar promoción" description={promocion.titulo} />
      <FormCard><PromocionForm comercioId={comercioId} tipos={tipos ?? []} promocion={promocion} /></FormCard>
    </>
  )
}
