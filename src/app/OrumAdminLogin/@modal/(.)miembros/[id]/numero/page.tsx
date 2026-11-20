import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { cargarReasignarNumero } from '@/app/OrumAdminLogin/miembros/[id]/numero/_components/datos'
import { ReasignarNumeroForm } from '@/app/OrumAdminLogin/miembros/[id]/numero/_components/reasignar-numero-form'

/** Gemela interceptada de la pantalla de reasignar número: se abre encima de la ficha. */
export default async function ReasignarNumeroInterceptado({ params }: { params: Promise<{ id: string }> }) {
  await requireRol('super_admin')
  const { id } = await params
  const datos = await cargarReasignarNumero(Number(id))
  if (!datos) notFound()

  return (
    <OverlayRuta title="Reasignar número" description={datos.nombre} width="500px" detent="large">
      <ReasignarNumeroForm datos={datos} />
    </OverlayRuta>
  )
}
