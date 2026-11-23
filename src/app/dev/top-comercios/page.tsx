import { notFound } from 'next/navigation'
import { TopComerciosSocio } from '@/components/comercios/top-comercios'
import {
  armarTopCalificados,
  armarTopVentas,
  type ComercioDelTop,
  mezclarTop,
  type TopComercios,
} from '@/lib/comercios/top-comercios'
import { obtenerDirectorioMiembros } from '@/lib/publico/datos-publicos'
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
 * `?caso=uno` (un comercio por lista), `?caso=logos` (los logotipos REALES
 * del catálogo, solo lectura, con listas inventadas) o, por defecto, cinco
 * por lista.
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

/** Los diez primeros comercios del catálogo real, repartidos en dos listas. */
async function conLogosReales(): Promise<TopComercios> {
  const { comercios } = await obtenerDirectorioMiembros()
  const porId = new Map<number, ComercioDelTop>(comercios.map((c) => [c.id, c]))
  const ids = comercios.slice(0, 10).map((c) => c.id)
  return {
    ventas: armarTopVentas(
      ids.slice(0, 5).map((id, i) => ({ comercio_id: id, ventas: 50 - i })),
      porId,
    ),
    calificados: armarTopCalificados(
      ids.slice(5, 10).map((id, i) => ({ comercio_id: id, promedio: 5 - i / 10, total: 3 })),
      porId,
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
  const top = caso === 'logos' ? await conLogosReales() : datos(caso)

  return (
    <div className={portal.portal} data-theme="light">
      <main className={estilos.contenido}>
        <TopComerciosSocio top={mezclarTop(top)} />
      </main>
    </div>
  )
}
