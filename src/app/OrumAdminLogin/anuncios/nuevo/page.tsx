import { requireRol } from '@/lib/auth/auth'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { AnuncioForm } from '../_components/anuncio-form'

export const metadata = { title: 'Nueva novedad · ORUM' }

export default async function NuevaAnuncioPage() {
  await requireRol('super_admin')

  return (
    <>
      <PageHeader
        title="Nueva novedad"
        description="Nace publicada. Puedes retirarla después sin borrarla."
      />
      <FormCard>
        <AnuncioForm />
      </FormCard>
    </>
  )
}
