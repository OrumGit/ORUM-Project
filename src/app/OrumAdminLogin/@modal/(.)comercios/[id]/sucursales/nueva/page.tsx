import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { SucursalForm } from '@/app/OrumAdminLogin/comercios/[id]/sucursales/_components/sucursal-form'

export default async function NuevaSucursalInterceptada({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRol('super_admin')
  const { id } = await params
  const comercioId = Number(id)

  const admin = createAdminClient()
  const [{ data: comercio }, { data: ciudades }] = await Promise.all([
    admin.from('comercios').select('id, nombre').eq('id', comercioId).is('deleted_at', null).maybeSingle(),
    admin.from('ciudades').select('id, nombre').order('nombre'),
  ])
  if (!comercio) notFound()

  return (
    <OverlayRuta title="Nueva sucursal" description={comercio.nombre} detent="medium">
      <SucursalForm comercioId={comercioId} ciudades={ciudades ?? []} />
    </OverlayRuta>
  )
}