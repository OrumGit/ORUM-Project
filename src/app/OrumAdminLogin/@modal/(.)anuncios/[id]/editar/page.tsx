import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { leerAnuncioParaEditar } from '@/lib/anuncios/consultas'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { AnuncioForm } from '@/app/OrumAdminLogin/anuncios/_components/anuncio-form'

export default async function EditarAnuncioInterceptada({
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
    <OverlayRuta title="Editar novedad" detent="large" width="640px">
      <AnuncioForm anuncio={anuncio} />
    </OverlayRuta>
  )
}
