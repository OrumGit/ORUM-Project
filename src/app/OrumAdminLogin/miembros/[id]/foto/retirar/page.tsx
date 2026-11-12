import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { cargarFotoMiembro } from '../_components/datos'
import { RetirarFotoForm } from './_components/retirar-foto-form'

export const metadata = { title: 'Retirar foto · ORUM' }

export default async function RetirarFotoPage({ params }: { params: Promise<{ id: string }> }) {
  // Solo el administrador: la autorización real de la acción es la misma.
  await requireRol('super_admin')
  const { id } = await params
  const datos = await cargarFotoMiembro(Number(id))
  if (!datos || !datos.fotoUrl) notFound()

  return (
    <>
      <PageHeader title="Retirar foto" description={datos.nombre} />
      <FormCard>
        <RetirarFotoForm miembroId={datos.id} nombre={datos.nombre} />
      </FormCard>
    </>
  )
}
