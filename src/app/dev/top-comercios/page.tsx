import { notFound } from 'next/navigation'
import { TopComerciosSocio } from '@/components/comercios/top-comercios'
import {
  armarTopCalificados,
  armarTopVentas,
  type ComercioDelTop,
  type TopComercios,
} from '@/lib/comercios/top-comercios'
import portal from '@/app/miembros/(portal)/portal.module.css'
import estilos from './vista-previa.module.css'

export const metadata = {
  title: 'Vista previa del top de comercios · ORUM',
}

/**
 * El «Top de comercios» del Inicio del socio con datos FALSOS y solo fuera de
 * producción: la pantalla real exige una sesión de socio vigente y la
 * migración `20261029140000_top_comercios.sql`.
 *
 * `?caso=vacio-calificados` (hoy es lo real: nadie llega a 3 reseñas),
 * `?caso=uno` (una sola fila por lista) o, por defecto, cinco por lista.
 */

const NOMBRES = [
  'Pizzería Don Lucho',
  'Salón de Belleza Aurora',
  'Café del Parque con un nombre bastante largo para probar el recorte',
  'Óptica Visión',
  'Gimnasio Fuerza',
  'Librería Letras',
]

const CATEGORIAS = [
  { categoriaId: 1, categoriaNombre: 'Gastronomía', subcategoriaId: 3, subcategoriaNombre: 'Pizzerías' },
  { categoriaId: 2, categoriaNombre: 'Belleza', subcategoriaId: null, subcategoriaNombre: null },
]

const COMERCIOS = new Map<number, ComercioDelTop>(
  NOMBRES.map((nombre, i) => [
    i + 1,
    {
      id: i + 1,
      nombre,
      logoUrl: null,
      categorias: [CATEGORIAS[i % 2]],
      ciudades: ['Bogotá'],
    },
  ]),
)

function datos(caso: string | undefined): TopComercios {
  if (caso === 'uno') {
    return {
      calificados: armarTopCalificados([{ comercio_id: 1, promedio: 4.8, total: 3 }], COMERCIOS),
      ventas: armarTopVentas([{ comercio_id: 2, ventas: 1 }], COMERCIOS),
    }
  }
  return {
    calificados:
      caso === 'vacio-calificados'
        ? []
        : armarTopCalificados(
            [
              { comercio_id: 1, promedio: 4.9, total: 24 },
              { comercio_id: 2, promedio: 4.8, total: 12 },
              { comercio_id: 3, promedio: 4.6, total: 9 },
              { comercio_id: 4, promedio: 4.5, total: 40 },
              { comercio_id: 5, promedio: 4, total: 3 },
              { comercio_id: 6, promedio: 3.9, total: 8 },
            ],
            COMERCIOS,
          ),
    ventas: armarTopVentas(
      [
        { comercio_id: 4, ventas: 1280 },
        { comercio_id: 1, ventas: 128 },
        { comercio_id: 5, ventas: 96 },
        { comercio_id: 2, ventas: 12 },
        { comercio_id: 3, ventas: 1 },
        { comercio_id: 6, ventas: 1 },
      ],
      COMERCIOS,
    ),
  }
}

export default async function VistaPreviaTopComercios({
  searchParams,
}: {
  searchParams: Promise<{ caso?: string }>
}) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { caso } = await searchParams

  return (
    <div className={portal.portal} data-theme="light">
      <main className={estilos.contenido}>
        <TopComerciosSocio top={datos(caso)} />
      </main>
    </div>
  )
}
