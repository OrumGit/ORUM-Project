'use client'

/*
  ESTRELLAS QUE SE TOCAN (la de lectura vive en `estrellas-lectura.tsx`, sin
  'use client', para pintarse en el servidor). Dos piezas:

    · `EstrellasSelector` — dentro de un formulario: cinco radios reales,
      escondidos a la vista pero no al lector de pantalla (dan el rol, las
      flechas y el envío). Al lado, lo que significa la nota en palabras
      («Muy bueno»), para que nadie tenga que adivinar si tres es poco.
    · `EstrellasAccion` — FUERA de un formulario: cinco botones que eligen y
      disparan algo (la ficha abre la ventana de la reseña con esa nota ya
      puesta: un clic menos). No son radios porque en un grupo de radios las
      flechas eligen al moverse, y aquí elegir abre una ventana.

  EL MOVIMIENTO (29/10/2026). Al elegir, las estrellas se llenan de la
  primera a la elegida, escalonadas (`--n` × 30 ms, dentro de la banda de
  30–80 ms), y la elegida da un salto corto: el acento puntual de la
  selección, una vez y solo al encender. No salta al montar (con la nota que
  ya traía el formulario): solo cuando la persona la toca. Con movimiento
  reducido, cambia el relleno sin viaje.
*/

import { useState, type CSSProperties } from 'react'
import { etiquetaEstrellas } from '@/lib/resenas/resenas'
import { FormaEstrella, PUNTOS } from './estrellas-lectura'
import styles from './estrellas.module.css'

type SelectorProps = {
  /** Se envía con el formulario bajo este nombre (el valor del radio marcado). */
  name?: string
  valorInicial?: number
  onChange?: (valor: number) => void
  /** Nombre accesible del grupo. */
  etiqueta?: string
  disabled?: boolean
  /** Id del texto de ayuda/error: va en CADA radio, que es quien recibe el foco. */
  describedBy?: string
}

export function EstrellasSelector({
  name = 'estrellas',
  valorInicial,
  onChange,
  etiqueta = 'Calificación',
  disabled = false,
  describedBy,
}: SelectorProps) {
  const [valor, setValor] = useState<number>(valorInicial ?? 0)
  /** La que eligió la persona (no la que venía guardada): solo esa salta. */
  const [elegida, setElegida] = useState<number | null>(null)

  return (
    <div className={styles.conEtiqueta}>
      <div
        className={styles.selector}
        role="radiogroup"
        aria-label={etiqueta}
        data-disabled={disabled || undefined}
      >
        {PUNTOS.map((n) => (
          <label
            key={n}
            className={styles.opcion}
            data-lleno={n <= valor ? 'true' : undefined}
            data-elegida={n === elegida || undefined}
            style={{ '--n': n - 1 } as CSSProperties}
          >
            <input
              className={styles.radio}
              type="radio"
              name={name}
              value={n}
              checked={valor === n}
              disabled={disabled}
              aria-describedby={describedBy}
              aria-label={`${n === 1 ? '1 estrella' : `${n} estrellas`}: ${etiquetaEstrellas(n)}`}
              onChange={() => {
                setValor(n)
                setElegida(n)
                onChange?.(n)
              }}
            />
            <FormaEstrella className={styles.forma} />
          </label>
        ))}
      </div>
      {/* El nombre ya va en cada radio: esto es para la vista. Cambia con
          un fundido corto (`key`): se lee como la misma frase que cambia. */}
      <span className={styles.significado} aria-hidden="true">
        {valor > 0 ? (
          <span key={valor} className={styles.significadoTexto}>
            {etiquetaEstrellas(valor)}
          </span>
        ) : (
          <span className={styles.significadoVacio}>Toca una estrella</span>
        )}
      </span>
    </div>
  )
}

type AccionProps = {
  /** Lo que pasa al elegir una nota (abrir la ventana con ella puesta). */
  onElegir: (valor: number) => void
  /** Nombre accesible del grupo. */
  etiqueta?: string
}

export function EstrellasAccion({ onElegir, etiqueta = 'Califica tu visita' }: AccionProps) {
  return (
    <div className={styles.selector} role="group" aria-label={etiqueta}>
      {PUNTOS.map((n) => (
        <button
          key={n}
          type="button"
          className={`${styles.opcion} ${styles.boton}`}
          style={{ '--n': n - 1 } as CSSProperties}
          aria-label={`Calificar con ${n === 1 ? '1 estrella' : `${n} estrellas`}: ${etiquetaEstrellas(n)}`}
          onClick={() => onElegir(n)}
        >
          <FormaEstrella className={styles.forma} />
        </button>
      ))}
    </div>
  )
}
