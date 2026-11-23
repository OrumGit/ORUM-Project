import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { PageHeader } from '@/components/ui/layout'
import { FormCard } from '@/components/ui/form-card'
import { GestorImagenes } from './_components/gestor-imagenes'
import { cargarImagenesComercio } from './_components/datos'

export const metadata = { title: 'Imágenes del comercio · ORUM' }

/**
 * Pantalla completa. Se llega aquí por enlace directo o al recargar; desde la
 * ficha, la gemela de `@modal` la intercepta y la abre encima.
 */
export default async function ImagenesComercioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRol('super_admin')
  const { id } = await params

  const datos = await cargarImagenesComercio(Number(id))
  if (!datos) notFound()

  return (
    <>
      <PageHeader title="Imágenes del comercio" description={datos.nombre} />
      <FormCard>
        <GestorImagenes
          comercioId={datos.id}
          nombre={datos.nombre}
          logoUrl={datos.logoUrl}
          portadaUrl={datos.portadaUrl}
          galeria={datos.galeria}
        />
      </FormCard>
    </>
  )
}
