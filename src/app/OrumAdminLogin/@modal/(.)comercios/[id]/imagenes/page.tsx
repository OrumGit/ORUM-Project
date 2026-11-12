import { notFound } from 'next/navigation'
import { requireRol } from '@/lib/auth/auth'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { GestorImagenes } from '@/app/OrumAdminLogin/comercios/[id]/imagenes/_components/gestor-imagenes'
import { cargarImagenesComercio } from '@/app/OrumAdminLogin/comercios/[id]/imagenes/_components/datos'

/**
 * Gemela interceptada. Cuelga de la ÚNICA ranura `@modal`, la del layout del
 * panel, para que se abra encima venga de donde venga: desde la ficha del
 * comercio, desde la lista o desde el panel de inicio.
 *
 * `large` y no `medium`: la galería crece con el número de piezas y en un
 * teléfono no hay nada del fondo que convenga seguir viendo mientras se
 * ordena.
 */
export default async function ImagenesComercioInterceptado({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireRol('super_admin')
  const { id } = await params

  const datos = await cargarImagenesComercio(Number(id))
  if (!datos) notFound()

  return (
    <OverlayRuta
      title="Imágenes del comercio"
      description={datos.nombre}
      width="720px"
      detent="large"
    >
      <GestorImagenes
        comercioId={datos.id}
        nombre={datos.nombre}
        logoUrl={datos.logoUrl}
        portadaUrl={datos.portadaUrl}
        galeria={datos.galeria}
      />
    </OverlayRuta>
  )
}
