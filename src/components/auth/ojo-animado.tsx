'use client'

import { useState } from 'react'
import estilos from './ojo-animado.module.css'

/*
  EL OJO DE LA CONTRASEÑA, ANIMADO  ·  (diseño aprobado el 23/11/2026)
  ---------------------------------------------------------------------------
  Dice lo que HARÁ: con la contraseña oculta, el ojo abierto («Mostrar»);
  visible, el ojo tachado («Ocultar»). Al cambiar, PARPADEA (el párpado se
  cierra y se abre: `scaleY`) y la raya se dibuja o se borra de un trazo.
  No parpadea al montar: solo cuando se toca. Va dentro de `InputButton`,
  que ya pone el nombre accesible y no le roba el foco al campo.
*/

export function OjoAnimado({ visible }: { visible: boolean }) {
  // Cuántas veces cambió: el parpadeo alterna dos animaciones iguales para
  // que el navegador la repita en cada toque (un mismo nombre no reinicia).
  const [visto, setVisto] = useState(visible)
  const [cambios, setCambios] = useState(0)
  if (visible !== visto) {
    setVisto(visible)
    setCambios((n) => n + 1)
  }

  return (
    <svg
      className={estilos.ojo}
      data-visible={visible ? '' : undefined}
      data-parpadeo={cambios === 0 ? undefined : cambios % 2 === 0 ? 'a' : 'b'}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <g className={estilos.forma}>
        <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
        <circle cx="12" cy="12" r="2.8" />
      </g>
      <path className={estilos.tachado} d="M4 4l16 16" />
    </svg>
  )
}
