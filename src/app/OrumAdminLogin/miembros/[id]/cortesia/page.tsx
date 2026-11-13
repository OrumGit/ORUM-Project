import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { cargarCortesia } from './_components/datos'
import { CortesiaForm } from './_components/cortesia-form'

export const metadata = { title: 'Añadir días de cortesía · ORUM' }

/** Pantalla completa (enlace directo); desde la ficha y la lista se abre encima. */
export default async function CortesiaPage({ params }: { params: Promise<{ id: string }> }) {
  // Solo el administrador, como toda cortesía: la acción lo exige igual.
  await requireRol('super_admin')
  const { id } = await params
  const datos = await cargarCortesia(Number(id))
  if (!datos) notFound()

  return (
    <>
      <PageHeader title="Añadir días de cortesía" description={datos.nombre} />
      <FormCard>
        <CortesiaForm datos={datos} />
      </FormCard>
    </>
  )
}
