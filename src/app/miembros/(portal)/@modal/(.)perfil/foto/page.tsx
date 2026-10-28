import { notFound } from 'next/navigation'
import { OverlayRuta } from '@/components/shell/overlay-ruta'
import { EditorFoto } from '@/app/miembros/(portal)/perfil/foto/_components/editor-foto'
import { cargarMiFoto } from '@/app/miembros/(portal)/perfil/foto/_components/datos'

/**
 * Gemela interceptada, colgada de la ranura `@modal` del portal.
 *
 * `desnudo`: como el carnet, la ventana ES la tarjeta negra del editor, que
 * lleva su propia X (`useCerrarOverlay`, es decir, `router.back()`).
 */
export default async function MiFotoInterceptada() {
  const datos = await cargarMiFoto()
  if (!datos) notFound()

  return (
    <OverlayRuta ariaLabel="Mi foto" width="460px" desnudo>
      <EditorFoto
        nombre={datos.nombre}
        fotoUrl={datos.fotoUrl}
        puedeCambiar={datos.puedeCambiar}
        proximoCambio={datos.proximoCambio}
      />
    </OverlayRuta>
  )
}
