import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { FotoMiembro } from '@/app/OrumAdminLogin/miembros/[id]/foto/_components/foto-miembro'
import { cargarFotoMiembro } from '@/app/OrumAdminLogin/miembros/[id]/foto/_components/datos'

/** Gemela interceptada. `medium`: cabe y conviene seguir viendo la ficha detrás. */
export default async function FotoMiembroInterceptado({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRol('super_admin', 'empleado')
  const { id } = await params

  const datos = await cargarFotoMiembro(Number(id))
  if (!datos) notFound()

  return (
    <OverlayRuta title="Foto del miembro" description={datos.nombre} width="560px" detent="medium">
      <FotoMiembro miembroId={datos.id} nombre={datos.nombre} fotoUrl={datos.fotoUrl} />
    </OverlayRuta>
  )
}
