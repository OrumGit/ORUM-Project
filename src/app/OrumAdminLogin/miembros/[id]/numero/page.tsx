import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { cargarReasignarNumero } from './_components/datos'
import { ReasignarNumeroForm } from './_components/reasignar-numero-form'

export const metadata = { title: 'Reasignar número · ORUM' }

/** Pantalla completa (enlace directo); desde la ficha se abre encima. */
export default async function ReasignarNumeroPage({ params }: { params: Promise<{ id: string }> }) {
  // Solo el administrador: la acción lo exige igual.
  await requireRol('super_admin')
  const { id } = await params
  const datos = await cargarReasignarNumero(Number(id))
  if (!datos) notFound()

  return (
    <>
      <PageHeader title="Reasignar número" description={datos.nombre} />
      <FormCard>
        <ReasignarNumeroForm datos={datos} />
      </FormCard>
    </>
  )
}
