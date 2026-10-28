import { notFound } from 'next/navigation'
import { EditorFoto } from './_components/editor-foto'
import { cargarMiFoto } from './_components/datos'
import estilos from './_components/editor-foto.module.css'

export const metadata = { title: 'Mi foto · ORUM' }

/**
 * Pantalla completa. Es a donde se llega por enlace directo o al recargar;
 * desde el carnet, la gemela de `@modal` la intercepta y la abre encima, que
 * es lo que pide la regla «un formulario no navega». Aquí el editor pone el
 * `h1` y su X vuelve al portal.
 */
export default async function MiFotoPage() {
  const datos = await cargarMiFoto()
  if (!datos) notFound()

  return (
    <div className={estilos.pagina}>
      <EditorFoto
        nombre={datos.nombre}
        fotoUrl={datos.fotoUrl}
        puedeCambiar={datos.puedeCambiar}
        proximoCambio={datos.proximoCambio}
        enPagina
      />
    </div>
  )
}
