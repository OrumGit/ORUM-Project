import type { CSSProperties, ReactNode } from 'react'
import styles from './graficas.module.css'

/*
  GRÁFICAS SIMPLES  ·  barras y columnas, sin librería (29/10/2026)
  ---------------------------------------------------------------------------
  Para las métricas del panel («gráficas simples para ver gráficamente
  todos los datos»). Sin directiva: se pintan en el servidor, no añaden nada
  al paquete del navegador, y su único movimiento es CSS.

  Las reglas que siguen (guía de visualización del proyecto):
    · UN SOLO TONO (`--gold-600`, el oro que cumple 3:1 de objeto gráfico
      sobre blanco): cada gráfica mide UNA magnitud; no hay categorías que
      colorear. «Otros» va en el mismo tono, más claro.
    · El texto va en tinta, nunca en el color de la barra.
    · Marcas finas con el extremo redondeado de 4px, una línea base fina y
      ninguna rejilla de más.
    · Las columnas enseñan su detalle al apuntarlas O al enfocarlas con el
      teclado (globo), y cada una tiene su nombre accesible completo. Las
      tablas de siempre siguen debajo: son la vista exacta de los mismos datos.
    · Entran con un fundido y un desliz corto, escalonadas con tope de 8.
      Nada crece desde cero. Con movimiento reducido, quietas.
*/

export type BarraGrafica = {
  clave: string
  etiqueta: string
  /** Lo que mide la barra. */
  valor: number
  /** El valor ya escrito para leerlo («$ 1.250.000», «12 ventas»). */
  texto: string
  /** «Otros»: en el tono claro. */
  resto?: boolean
}

/** Barras horizontales de mayor a menor: un ranking que se lee de un vistazo. */
export function GraficaBarras({ barras, etiqueta }: { barras: BarraGrafica[]; etiqueta: string }) {
  const maximo = Math.max(...barras.map((b) => b.valor), 0)
  return (
    <ol className={styles.barras} aria-label={etiqueta}>
      {barras.map((b, i) => (
        <li
          key={b.clave}
          className={styles.barraFila}
          style={
            {
              '--i': Math.min(i, 8),
              '--ancho': `${maximo > 0 ? (b.valor / maximo) * 100 : 0}%`,
            } as CSSProperties
          }
        >
          <span className={styles.barraEtiqueta}>{b.etiqueta}</span>
          <span className={styles.barraPista} aria-hidden="true">
            <span className={styles.barra} data-resto={b.resto || undefined} />
          </span>
          <span className={styles.barraValor}>{b.texto}</span>
        </li>
      ))}
    </ol>
  )
}

export type ColumnaGrafica = {
  clave: string
  /** «14 oct», «Semana del 6 oct». */
  etiqueta: string
  valor: number
  /** Lo que dice el globo: «3 ventas». */
  texto: string
  /** Una segunda línea del globo: «$ 120.000». */
  nota?: string
}

/** Columnas en el tiempo, con el detalle de cada una en un globo. */
export function GraficaColumnas({
  columnas,
  etiqueta,
  maximoTexto,
  pie,
}: {
  columnas: ColumnaGrafica[]
  etiqueta: string
  /** El valor de la línea de arriba («12 ventas»). */
  maximoTexto: string
  /** Lo que va bajo el eje (la unidad, una aclaración). */
  pie?: ReactNode
}) {
  const maximo = Math.max(...columnas.map((c) => c.valor), 0)
  const n = columnas.length
  // Tres fechas bajo el eje: la primera, la del medio y la última.
  const marcas = n <= 1 ? [0] : n === 2 ? [0, 1] : [0, Math.floor((n - 1) / 2), n - 1]

  return (
    <figure className={styles.figura}>
      <div className={styles.plano}>
        <span className={styles.maximo} aria-hidden="true">
          {maximoTexto}
        </span>
        <ol className={styles.columnas} aria-label={etiqueta} style={{ '--n': n } as CSSProperties}>
          {columnas.map((c, i) => (
            <li
              key={c.clave}
              className={styles.columna}
              tabIndex={0}
              aria-label={`${c.etiqueta}: ${c.texto}${c.nota ? `, ${c.nota}` : ''}`}
              data-borde={i < n / 6 ? 'inicio' : i >= n - n / 6 ? 'fin' : undefined}
              style={
                {
                  '--i': Math.min(i, 8),
                  '--alto': `${maximo > 0 ? (c.valor / maximo) * 100 : 0}%`,
                } as CSSProperties
              }
            >
              <span
                className={styles.columnaBarra}
                data-vacia={c.valor === 0 || undefined}
                aria-hidden="true"
              />
              <span className={styles.globo} aria-hidden="true">
                <span className={styles.globoTitulo}>{c.etiqueta}</span>
                <span className={styles.globoValor}>{c.texto}</span>
                {c.nota && <span className={styles.globoNota}>{c.nota}</span>}
              </span>
            </li>
          ))}
        </ol>
      </div>
      <div className={styles.eje} aria-hidden="true" style={{ '--n': n } as CSSProperties}>
        {marcas.map((i) => (
          <span
            key={i}
            className={styles.ejeMarca}
            style={{ '--pos': i } as CSSProperties}
            data-lado={i === 0 ? 'inicio' : i === n - 1 ? 'fin' : 'medio'}
          >
            {columnas[i]?.etiqueta}
          </span>
        ))}
      </div>
      {pie && <figcaption className={styles.pie}>{pie}</figcaption>}
    </figure>
  )
}
