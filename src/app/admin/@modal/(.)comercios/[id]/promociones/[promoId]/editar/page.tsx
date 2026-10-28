import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { PromocionForm } from '@/app/admin/comercios/[id]/promociones/_components/promocion-form'

export default async function EditarPromocionInterceptada({
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
    <OverlayRuta title="Editar promoción" description={promocion.titulo} width="600px">
      <PromocionForm comercioId={comercioId} tipos={tipos ?? []} promocion={promocion} />
    </OverlayRuta>
  )
}