import { EstrellasLectura } from '@/components/ui/estrellas-lectura'
import { TituloSeccion } from '@/components/ui/titulo-seccion'
import { formatearPromedio } from '@/lib/resenas/resenas'
import estilos from './resenas.module.css'

/*
  EL ENCABEZADO DE LAS RESEÑAS  ·  el mismo en los tres portales (29/10/2026)

  El título con la voz de la marca (`TituloSeccion` en su tamaño de bloque,
  el mismo de «Verificar membresía» en la caja) y, a la derecha, el promedio
  en el serif de la marca con sus estrellas y cuántas reseñas lo sostienen.
  Sin reseñas, solo el título: «0,0» no dice nada.

  Sin directiva: lo pintan la ficha (servidor) y la caja y el panel
  (cliente).
*/

type Props = {
  /** Id del título, para el `aria-labelledby` de la sección. */
  id: string
  titulo: string
  total: number
  promedio: number | null
}

export function ResumenResenas({ id, titulo, total, promedio }: Props) {
  return (
    <header className={estilos.cabecera}>
      <TituloSeccion id={id} como="h2" tamano="bloque" texto={titulo} />
      {total > 0 && (
        <div className={estilos.resumen}>
          {/* El número ya lo dice el nombre accesible de las estrellas. */}
          <span className={estilos.promedio} aria-hidden="true">
            {formatearPromedio(promedio)}
          </span>
          <span className={estilos.resumenDetalle}>
            <EstrellasLectura valor={promedio} tamano="md" />
            <span className={estilos.conteo}>{total === 1 ? '1 reseña' : `${total} reseñas`}</span>
          </span>
        </div>
      )}
    </header>
  )
}
