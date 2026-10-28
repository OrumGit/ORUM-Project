import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { cargarRevocacion } from '@/app/admin/miembros/[id]/revocar/_components/datos'
import { RevocarForm } from '@/app/admin/miembros/[id]/revocar/_components/revocar-form'

/** Gemela interceptada de la pantalla de revocar: se abre encima de la ficha. */
export default async function RevocarInterceptado({ params }: { params: Promise<{ id: string }> }) {
  await requireRol('super_admin')
  const { id } = await params
  const datos = await cargarRevocacion(Number(id))
  if (!datos) notFound()

  return (
    <OverlayRuta title="Revocar membresía" description={datos.nombre} width="500px" detent="large">
      <RevocarForm datos={datos} />
    </OverlayRuta>
  )
}
