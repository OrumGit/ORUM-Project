import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { PromocionForm } from '@/app/OrumAdminLogin/comercios/[id]/promociones/_components/promocion-form'

export default async function NuevaPromocionInterceptada({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRol('super_admin')
  const { id } = await params
  const comercioId = Number(id)

  const admin = createAdminClient()
  const [{ data: comercio }, { data: tipos }] = await Promise.all([
    admin.from('comercios').select('id, nombre').eq('id', comercioId).is('deleted_at', null).maybeSingle(),
    admin.from('tipos_beneficio').select('id, codigo, nombre').order('id'),
  ])
  if (!comercio) notFound()

  return (
    <OverlayRuta title="Nueva promoción" description={comercio.nombre} width="600px">
      <PromocionForm comercioId={comercioId} tipos={tipos ?? []} />
    </OverlayRuta>
  )
}