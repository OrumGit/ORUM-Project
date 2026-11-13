import { notFound } from 'next/navigation'
import { DirectorioComercios } from '@/components/comercios/directorio-comercios'
import { obtenerDirectorioMiembros } from '@/lib/publico/datos-publicos'
import portal from '@/app/miembros/(portal)/portal.module.css'

export const metadata = { title: 'Vista previa del directorio del socio · ORUM' }
export const dynamic = 'force-dynamic'

/**
 * El directorio del Portal de Miembros SIN sesión, solo en desarrollo
 * (12/11/2026, para revisar el filtro «Beneficio»). Lee el catálogo real con
 * la clave de servicio, en solo lectura, como el Inicio del socio. Los
 * filtros escriben la URL de ESTA página (`base`).
 */
export default async function VistaPreviaDirectorioSocio() {
  if (process.env.NODE_ENV === 'production') notFound()
  const directorio = await obtenerDirectorioMiembros()
  return (
    <div className={portal.portal} data-theme="light">
      <main>
        <DirectorioComercios
          base="/dev/directorio-socio"
          directorio={directorio}
          titulo="Tus beneficios"
          bajada="Vista previa con el catálogo real y sin sesión."
          socio
          favoritos={[]}
        />
      </main>
    </div>
  )
}
