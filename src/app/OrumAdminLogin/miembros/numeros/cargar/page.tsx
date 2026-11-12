import { requireRol } from '@/lib/auth/auth'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { CargarRangoForm } from '../_components/cargar-rango-form'

export const metadata = { title: 'Cargar rango de números · ORUM' }

export default async function CargarRangoPage() {
  await requireRol('super_admin')

  return (
    <>
      <PageHeader
        title="Cargar rango de números"
        description="Añade al pozo toda una secuencia de números de carné de una vez."
      />
      <FormCard>
        <CargarRangoForm />
      </FormCard>
    </>
  )
}
