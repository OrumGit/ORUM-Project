import type { CSSProperties } from 'react'
import { presentacionPrevia, type EncuadrePrevia } from '@/lib/videos/video'
import estilos from './previa.module.css'

/*
  LA VISTA PREVIA AJUSTADA, EN PANTALLA  ·  (13/11/2026)
  ---------------------------------------------------------------------------
  El video (o su portada) se pinta ENTERO y esta clase deja a la vista solo
  el encuadre que eligió el administrador: `object-fit: cover`,
  `object-position` y un `scale` con su origen (la cuenta es pura y probada:
  `presentacionPrevia`). Las cinco cifras se inyectan como variables, que es
  lo único dinámico. Quien lo usa pone una caja con `overflow: hidden` y la
  proporción del marco alrededor: el `scale` se saldría de ella.

  Sin encuadre (los videos de antes), centrada: lo de siempre.
*/

export const CLASE_PREVIA = estilos.previa

/** Las variables CSS de la vista previa para un marco de `proporcion` (ancho/alto). */
export function estiloPrevia(encuadre: EncuadrePrevia | null | undefined, proporcion: number): CSSProperties {
  const p = presentacionPrevia(encuadre ?? null, proporcion)
  return {
    '--previa-x': `${p.posX}%`,
    '--previa-y': `${p.posY}%`,
    '--previa-escala': p.escala,
    '--previa-ox': `${p.origenX}%`,
    '--previa-oy': `${p.origenY}%`,
  } as CSSProperties
}
