'use client'

import { useCallback, useSyncExternalStore, type RefObject } from 'react'

/*
  ¿QUEDA FILA POR VER A LOS LADOS?  ·  (12/11/2026)
  ---------------------------------------------------------------------------
  Lo comparten las tres filas que se deslizan de lado en el directorio: los
  filtros, la tira de categorías y las subcategorías. Con la respuesta, cada
  fila pone `data-antes` / `data-despues` y se desvanece hacia el canto por
  el que sigue (`[data-desliza]` en `globals.css`; la tira de categorías,
  con sus propias reglas). Antes solo la tira lo hacía y las otras dos
  cortaban en seco («se ve cortado el efecto de los filtros»).

  El desplazamiento es estado EXTERNO (lo mueve el navegador, no React): se
  lee con `useSyncExternalStore`, como manda `CLAUDE.md`, y solo vuelve a
  pintar cuando cambia la respuesta —«hay antes», «hay después»—, no en
  cada píxel.
*/

export const HAY_ANTES = 1
export const HAY_DESPUES = 2
/** Holgura: los navegadores redondean el desplazamiento a fracciones de píxel. */
export const HOLGURA = 4

export function useDesborde(ref: RefObject<HTMLElement | null>): number {
  const suscribir = useCallback(
    (avisar: () => void) => {
      const fila = ref.current
      if (!fila) return () => {}
      fila.addEventListener('scroll', avisar, { passive: true })
      const observador = new ResizeObserver(avisar)
      observador.observe(fila)
      return () => {
        fila.removeEventListener('scroll', avisar)
        observador.disconnect()
      }
    },
    [ref],
  )
  const leer = useCallback(() => {
    const fila = ref.current
    if (!fila) return 0
    const recorrido = fila.scrollWidth - fila.clientWidth
    if (recorrido <= HOLGURA) return 0
    return (
      (fila.scrollLeft > HOLGURA ? HAY_ANTES : 0) |
      (fila.scrollLeft < recorrido - HOLGURA ? HAY_DESPUES : 0)
    )
  }, [ref])
  return useSyncExternalStore(suscribir, leer, () => 0)
}

/** Los atributos que dicen hacia dónde sigue la fila. */
export function atributosDesborde(desborde: number) {
  return {
    'data-antes': desborde & HAY_ANTES ? '' : undefined,
    'data-despues': desborde & HAY_DESPUES ? '' : undefined,
  }
}
