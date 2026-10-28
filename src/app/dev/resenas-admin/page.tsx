import { notFound } from 'next/navigation'
import { ResenasAdmin } from '@/app/admin/comercios/[id]/_components/resenas-admin'
import type { ResenaGestion } from '@/lib/resenas/mapeo'
import portal from '@/app/miembros/(portal)/portal.module.css'
import estilos from './dev.module.css'

export const metadata = { title: 'Vista previa de reseñas del panel · ORUM' }

/**
 * Las reseñas del panel con datos FALSOS, solo en desarrollo. `?caso=vacio`
 * para el estado sin reseñas. Las acciones reales no escriben sin sesión de
 * super administrador.
 */

const DIA = 24 * 60 * 60 * 1000
const hace = (dias: number) => new Date(Date.now() - dias * DIA).toISOString()

const RESENAS: ResenaGestion[] = [
  {
    id: 3,
    estrellas: 5,
    mensaje: 'Muy buena atención y el descuento se aplicó sin problema.',
    autor: 'María Fernanda Gómez',
    creadaEn: hace(2),
    respuestaComercio: null,
    respuestaComercioAt: null,
    respuestaAdmin: null,
    respuestaAdminAt: null,
  },
  {
    id: 2,
    estrellas: 3,
    mensaje: 'El lugar es bonito pero tardaron en atender.\nEl café, excelente.',
    autor: 'Andrés Pérez Rojas',
    creadaEn: hace(9),
    respuestaComercio: 'Gracias por contarnos. Reforzamos el equipo.',
    respuestaComercioAt: hace(8),
    respuestaAdmin: 'Hablamos con el comercio y ya lo resuelven.',
    respuestaAdminAt: hace(7),
  },
  {
    id: 1,
    estrellas: 4,
    mensaje: null,
    autor: 'Lucía Ramírez',
    creadaEn: hace(30),
    respuestaComercio: null,
    respuestaComercioAt: null,
    respuestaAdmin: null,
    respuestaAdminAt: null,
  },
]

export default async function DevResenasAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ caso?: string }>
}) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { caso } = await searchParams
  const vacio = caso === 'vacio'

  // `?caso=apartado`: como en `/admin/resenas`, con el comercio de cada una
  // y las de menos de 4 estrellas por revisar.
  if (caso === 'apartado') {
    const comercios = ['Dulces Momentos', 'Café de prueba', 'Bendito Brunch']
    return (
      <div className={`${portal.portal} ${estilos.pagina}`} data-theme="light">
        <ResenasAdmin
          conComercio
          conRevision
          resenas={RESENAS.map((r, i) => ({
            ...r,
            comercioId: i + 1,
            comercioNombre: comercios[i % comercios.length],
            porRevisar: r.estrellas < 4,
          }))}
        />
      </div>
    )
  }

  return (
    <div className={`${portal.portal} ${estilos.pagina}`} data-theme="light">
      <ResenasAdmin
        comercioId={1}
        resumen={{ total: vacio ? 0 : 23, promedio: vacio ? null : 4 }}
        resenas={vacio ? [] : RESENAS}
      />
    </div>
  )
}
