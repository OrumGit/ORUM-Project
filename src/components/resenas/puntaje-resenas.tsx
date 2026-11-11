import type { CSSProperties } from 'react'
import { EstrellasLectura } from '@/components/ui/estrellas-lectura'
import { formatearPromedio, resumenDeConteos } from '@/lib/resenas/resenas'
import { clasificacionPromedio, distribucionEstrellas } from '@/lib/resenas/puntaje'
import estilos from './puntaje-resenas.module.css'

/*
  EL PUNTAJE  ·  solo en el panel (11/11/2026)
  ---------------------------------------------------------------------------
  «Las reseñas en general, con una media, dándole al administrador una
  perspectiva del puntaje que le ponen las personas, con una clasificación
  en estrellas». A la izquierda el promedio en el serif de la marca, sus
  estrellas, lo que significa («Muy bueno») y cuántas reseñas lo sostienen;
  a la derecha, cuántas hay de cada número de estrellas, de 5 a 1, con una
  barra en el oro de las gráficas (`--gold-600`) y la cifra en tinta.

  Sin directiva: lo pintan la ficha del comercio y `/admin/resenas`, que
  son del servidor. La barra es una escala (`transform`), nunca un ancho.
*/

type Props = {
  /** `conteos[0]` = reseñas de 1 estrella … `conteos[4]` = de 5. */
  conteos: readonly number[]
  /** Para el lector de pantalla: de quién es el puntaje. */
  etiqueta: string
}

export function PuntajeResenas({ conteos, etiqueta }: Props) {
  const { total, promedio } = resumenDeConteos(conteos)
  const filas = distribucionEstrellas(conteos)
  const clasificacion = clasificacionPromedio(promedio)

  return (
    <div className={estilos.puntaje} role="group" aria-label={etiqueta}>
      <div className={estilos.media}>
        <span className={estilos.numero} aria-hidden="true">
          {formatearPromedio(promedio)}
        </span>
        <EstrellasLectura valor={promedio} total={total} tamano="md" />
        {clasificacion && <span className={estilos.clasificacion}>{clasificacion}</span>}
        <span className={estilos.total}>
          {total === 0 ? 'Aún sin reseñas' : total === 1 ? '1 reseña' : `${total.toLocaleString('es-CO')} reseñas`}
        </span>
      </div>

      <ul className={estilos.barras} aria-label="Reseñas por número de estrellas">
        {filas.map((f) => (
          <li
            key={f.estrellas}
            className={estilos.fila}
            aria-label={`${f.estrellas} ${f.estrellas === 1 ? 'estrella' : 'estrellas'}: ${f.cantidad} (${f.porcentaje} %)`}
          >
            <span className={estilos.etiqueta} aria-hidden="true">
              {f.estrellas} ★
            </span>
            <span className={estilos.pista} aria-hidden="true">
              <span
                className={estilos.relleno}
                style={{ '--proporcion': total > 0 ? f.cantidad / total : 0 } as CSSProperties}
              />
            </span>
            <span className={estilos.cifra} aria-hidden="true">
              {f.cantidad.toLocaleString('es-CO')}
              <span className={estilos.porcentaje}>{f.porcentaje} %</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
