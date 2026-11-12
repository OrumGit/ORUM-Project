import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { leerAnuncioParaEditar } from '@/lib/anuncios/consultas'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { AnuncioForm } from '../../_components/anuncio-form'

export const metadata = { title: 'Editar novedad · ORUM' }

export default async function EditarAnuncioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRol('super_admin')

  const { id } = await params
  const anuncioId = Number(id)
  if (!Number.isInteger(anuncioId) || anuncioId < 1) notFound()

  const anuncio = await leerAnuncioParaEditar(createAdminClient(), anuncioId)
  if (!anuncio) notFound()

  return (
    <>
      <PageHeader title="Editar novedad" />
      <FormCard>
        <AnuncioForm anuncio={anuncio} />
      </FormCard>
    </>
  )
}
