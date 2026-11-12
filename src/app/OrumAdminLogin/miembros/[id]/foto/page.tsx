import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { FotoMiembro } from './_components/foto-miembro'
import { cargarFotoMiembro } from './_components/datos'

export const metadata = { title: 'Foto del miembro · ORUM' }

export default async function FotoMiembroPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRol('super_admin', 'empleado')
  const { id } = await params

  const datos = await cargarFotoMiembro(Number(id))
  if (!datos) notFound()

  return (
    <>
      <PageHeader title="Foto del miembro" description={datos.nombre} />
      <FormCard>
        <FotoMiembro miembroId={datos.id} nombre={datos.nombre} fotoUrl={datos.fotoUrl} />
      </FormCard>
    </>
  )
}
