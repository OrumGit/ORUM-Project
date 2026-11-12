import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { cargarFotoMiembro } from '@/app/OrumAdminLogin/miembros/[id]/foto/_components/datos'
import { RetirarFotoForm } from '@/app/OrumAdminLogin/miembros/[id]/foto/retirar/_components/retirar-foto-form'

/** Gemela interceptada de la pantalla de retirada. */
export default async function RetirarFotoInterceptado({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRol('super_admin')
  const { id } = await params
  const datos = await cargarFotoMiembro(Number(id))
  if (!datos || !datos.fotoUrl) notFound()

  return (
    <OverlayRuta title="Retirar foto" description={datos.nombre} width="480px" detent="medium">
      <RetirarFotoForm miembroId={datos.id} nombre={datos.nombre} />
    </OverlayRuta>
  )
}
