import { notFound } from 'next/navigation'
import { EditorFoto } from '@/app/miembros/(portal)/perfil/foto/_components/editor-foto'
import estilos from '@/app/miembros/(portal)/perfil/foto/_components/editor-foto.module.css'

export const metadata = {
  title: 'Vista previa de Mi foto · ORUM',
}

/**
 * El editor de la foto del socio, con datos FALSOS y solo en desarrollo: la
 * pantalla real exige una sesión de socio. Guardar o quitar desde aquí no
 * funciona (la acción pide la sesión).
 *
 * `?caso=bloqueada` (ya la cambió este mes), `?caso=sinfoto` o, por defecto,
 * con foto y con el cambio del mes disponible.
 */
export default async function VistaPreviaFoto({
  searchParams,
}: {
  searchParams: Promise<{ caso?: string }>
}) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { caso } = await searchParams

  return (
    <div className={estilos.pagina}>
      <EditorFoto
        nombre="María González"
        fotoUrl={caso === 'sinfoto' ? null : '/icons/orum-512.png'}
        puedeCambiar={caso !== 'bloqueada'}
        proximoCambio="el 1 de noviembre"
        enPagina
      />
    </div>
  )
}
