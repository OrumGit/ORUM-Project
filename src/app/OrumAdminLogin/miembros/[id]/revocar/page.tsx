import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { cargarRevocacion } from './_components/datos'
import { RevocarForm } from './_components/revocar-form'

export const metadata = { title: 'Revocar membresía · ORUM' }

/** Pantalla completa (enlace directo); desde la ficha se abre encima. */
export default async function RevocarPage({ params }: { params: Promise<{ id: string }> }) {
  // Solo el administrador: la acción lo exige igual.
  await requireRol('super_admin')
  const { id } = await params
  const datos = await cargarRevocacion(Number(id))
  if (!datos) notFound()

  return (
    <>
      <PageHeader title="Revocar membresía" description={datos.nombre} />
      <FormCard>
        <RevocarForm datos={datos} />
      </FormCard>
    </>
  )
}
