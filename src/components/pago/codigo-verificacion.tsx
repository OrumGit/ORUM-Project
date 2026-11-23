'use client'

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { LARGO_CODIGO, llenarCasillas } from '@/lib/auth/codigo-verificacion'
import estilos from './codigo-verificacion.module.css'

/*
  LAS SEIS CASILLAS DEL CÓDIGO  ·  (diseño aprobado el 23/11/2026)
  ---------------------------------------------------------------------------
  Una cifra por casilla, en la letra de texto con cifras parejas (el serif
  de títulos tiene números «antiguos» que suben y bajan). Pegar el código
  llena las seis; borrar vuelve a la anterior; con la sexta, el formulario se
  envía solo (`onCompleto`). El valor viaja en un campo oculto con `name`.

  La primera casilla lleva `autocomplete="one-time-code"`: el teléfono ofrece
  el código del correo o del mensaje sin teclearlo.
*/

type Props = {
  name: string
  /** El código vuelve a vacío cuando cambia (p. ej. tras un error). */
  reinicio?: unknown
  error?: string | null
  disabled?: boolean
  onCompleto?: () => void
}

export function CodigoVerificacion({ name, reinicio, error, disabled, onCompleto }: Props) {
  const [casillas, setCasillas] = useState<string[]>(() => Array(LARGO_CODIGO).fill(''))
  const [reinicioVisto, setReinicioVisto] = useState(reinicio)
  const refs = useRef<Array<HTMLInputElement | null>>([])

  // Un error del servidor vacía las casillas para volver a escribir.
  if (reinicio !== reinicioVisto) {
    setReinicioVisto(reinicio)
    setCasillas(Array(LARGO_CODIGO).fill(''))
  }

  const aplicar = (desde: number, texto: string) => {
    const { casillas: nuevas, foco } = llenarCasillas(casillas, desde, texto)
    setCasillas(nuevas)
    refs.current[foco]?.focus()
    if (nuevas.every((c) => c !== '') && texto !== '') {
      // Se envía en el siguiente fotograma, con el campo oculto ya escrito.
      requestAnimationFrame(() => onCompleto?.())
    }
  }

  const alTeclear = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && casillas[i] === '' && i > 0) {
      e.preventDefault()
      const nuevas = [...casillas]
      nuevas[i - 1] = ''
      setCasillas(nuevas)
      refs.current[i - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && i > 0) {
      e.preventDefault()
      refs.current[i - 1]?.focus()
    } else if (e.key === 'ArrowRight' && i < LARGO_CODIGO - 1) {
      e.preventDefault()
      refs.current[i + 1]?.focus()
    }
  }

  const alPegar = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    aplicar(i, e.clipboardData.getData('text'))
  }

  return (
    <fieldset className={estilos.grupo} disabled={disabled} aria-describedby={error ? `${name}-error` : undefined}>
      <legend className={estilos.oculto}>Código de confirmación de 6 cifras</legend>
      <input type="hidden" name={name} value={casillas.join('')} />
      <div className={estilos.casillas}>
        {casillas.map((valor, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el
            }}
            className={estilos.casilla}
            data-error={error ? '' : undefined}
            value={valor}
            onChange={(e) => aplicar(i, e.target.value)}
            onKeyDown={(e) => alTeclear(i, e)}
            onPaste={(e) => alPegar(i, e)}
            onFocus={(e) => e.target.select()}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            aria-label={`Cifra ${i + 1} de ${LARGO_CODIGO}`}
            aria-invalid={error ? true : undefined}
            autoFocus={i === 0}
          />
        ))}
      </div>
      {error && (
        <p id={`${name}-error`} role="alert" className={estilos.error}>
          {error}
        </p>
      )}
    </fieldset>
  )
}
