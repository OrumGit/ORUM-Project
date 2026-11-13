import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { cargarCortesia } from '@/app/OrumAdminLogin/miembros/[id]/cortesia/_components/datos'
import { CortesiaForm } from '@/app/OrumAdminLogin/miembros/[id]/cortesia/_components/cortesia-form'

/** Gemela interceptada de «Añadir días de cortesía»: se abre encima de la ficha o de la lista. */
export default async function CortesiaInterceptado({ params }: { params: Promise<{ id: string }> }) {
  await requireRol('super_admin')
  const { id } = await params
  const datos = await cargarCortesia(Number(id))
  if (!datos) notFound()

  return (
    <OverlayRuta title="Añadir días de cortesía" description={datos.nombre} width="520px" detent="large">
      <CortesiaForm datos={datos} />
    </OverlayRuta>
  )
}
