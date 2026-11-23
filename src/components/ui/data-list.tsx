import Link from 'next/link'
import type { CSSProperties, ReactNode } from 'react'
import { EmptyState, ErrorState, Skeleton } from './feedback'
import styles from './data-list.module.css'

/*
  No lleva `'use client'` a propósito: así las páginas siguen siendo Server
  Components y las funciones `cell` / `rowHref` no cruzan ninguna frontera de
  serialización. La interactividad entra como islas dentro de las celdas
  (un `DropdownMenu`, un `Switch`), no en el contenedor.
*/

export type Column<T> = {
  /** Identificador único de la columna. */
  key: string
  header: string
  cell: (item: T) => ReactNode
  /** Alinea a la derecha y activa cifras tabulares. */
  numeric?: boolean
  /**
   * Columna identificadora. En móvil encabeza la tarjeta y es la que lleva
   * el enlace de fila. Debe haber exactamente una.
   */
  primary?: boolean
  /** Se omite en la vista de tarjetas si no aporta. */
  hideOnMobile?: boolean
  width?: string
}

type Props<T> = {
  items: readonly T[]
  columns: ReadonlyArray<Column<T>>
  getKey: (item: T) => string | number
  /** Convierte la fila entera en un enlace (con un solo `<a>` real). */
  /** La fila abre esta dirección; `undefined` = esa fila no lleva enlace. */
  rowHref?: (item: T) => string | undefined
  /** Acciones por fila. En escritorio se revelan al pasar por encima. */
  actions?: (item: T) => ReactNode
  /** Mantiene las acciones siempre visibles (útil si son la acción principal). */
  alwaysShowActions?: boolean
  loading?: boolean
  error?: string | null
  /** Contenido cuando no hay resultados. Por defecto, un `EmptyState` genérico. */
  empty?: ReactNode
  /** Nombre accesible de la tabla. */
  caption: string
  className?: string
}

/*
  Entrada escalonada de filas. §4.2 de la dirección de arte v2 fija el paso en
  30-40 ms y el TOPE en 8.

  El tope es lo que importa. Con el 10 anterior la fila 11 entraba a 200 ms;
  con 8 pasos de 35 el techo queda en 245 ms, que sigue estando por debajo de
  lo que se percibe como espera, y el paso más largo hace que la secuencia se
  lea como secuencia en vez de como un parpadeo.
*/
const MAX_ESCALONADAS = 8
const PASO_MS = 35

export function DataList<T>({
  items,
  columns,
  getKey,
  rowHref,
  actions,
  alwaysShowActions = false,
  loading = false,
  error = null,
  empty,
  caption,
  className,
}: Props<T>) {
  const envoltorio = [styles.envoltorio, className].filter(Boolean).join(' ')

  if (loading) {
    return (
      <div className={envoltorio}>
        <div className={styles.filasCarga} aria-busy="true" aria-label={`Cargando ${caption}`}>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className={styles.filaCarga}>
              <Skeleton width="34%" height="14px" />
              <Skeleton width="22%" height="14px" />
              <Skeleton width="18%" height="14px" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={envoltorio}>
        <ErrorState description={error} className={styles.estado} />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className={envoltorio}>
        {empty ?? (
          <EmptyState
            title="Sin resultados"
            description="No hay nada que mostrar con los filtros actuales."
            className={styles.estado}
          />
        )}
      </div>
    )
  }

  return (
    <div className={envoltorio}>
      <table className={styles.tabla}>
        <caption className="sr-only">{caption}</caption>

        <thead className={styles.encabezado}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={[styles.th, col.numeric && styles.numerico]
                  .filter(Boolean)
                  .join(' ')}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
            {actions && (
              <th scope="col" className={styles.th}>
                <span className="sr-only">Acciones</span>
              </th>
            )}
          </tr>
        </thead>

        <tbody className={styles.tbody}>
          {items.map((item, indice) => (
            <tr
              key={getKey(item)}
              className={styles.fila}
              style={
                { '--retardo': `${Math.min(indice, MAX_ESCALONADAS) * PASO_MS}ms` } as CSSProperties
              }
            >
              {columns.map((col) => {
                const contenido = col.cell(item)
                const destino = col.primary ? rowHref?.(item) : undefined

                return (
                  <td
                    key={col.key}
                    className={[
                      styles.td,
                      col.numeric && styles.numerico,
                      col.primary && styles.principal,
                      col.hideOnMobile && styles.ocultarEnMovil,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    // En móvil la cabecera de columna se convierte en la
                    // etiqueta de esta celda dentro de la tarjeta.
                    data-label={col.header}
                  >
                    {destino ? (
                      <Link href={destino} className={styles.enlace}>
                        {contenido}
                      </Link>
                    ) : (
                      contenido
                    )}
                  </td>
                )
              })}

              {actions && (
                <td
                  className={[
                    styles.td,
                    styles.acciones,
                    !alwaysShowActions && styles.accionesOcultables,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {actions(item)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
