/*
  LA PUBLICIDAD DE LA PORTADA  ·  reglas puras
  ---------------------------------------------------------------------------
  Encargo del propietario (13/10/2026): las imágenes del carrusel de «Una red
  de valor que se nota» dejan de ser las portadas de los comercios y pasan a
  ser publicidad que el administrador sube, ordena, oculta y quita.

  Aquí vive lo que tienen que decir igual la interfaz y el servidor: el tope,
  la descripción y cómo queda el orden al mover una pieza.
*/

import type { EncuadrePrevia } from '../videos/video'

/** Cuántas imágenes puede tener el carrusel, contando las ocultas. */
export const TOPE_PUBLICIDAD = 10

/** Largo máximo de la descripción (el texto alternativo de la imagen). */
export const DESCRIPCION_MAXIMA = 140

/** Lo que se lee cuando una imagen no trae descripción. */
export const DESCRIPCION_POR_DEFECTO = 'Publicidad de ORUM'

/** Una pieza de publicidad, tal como la necesita el panel. */
export type PiezaPublicidad = {
  id: number
  /** La imagen, o la portada del video. */
  url: string
  /** El MP4, si la pieza es un video (13/11/2026). */
  video: string | null
  /** El encuadre de su vista previa (13/11/2026), si lo tiene. */
  encuadre?: EncuadrePrevia | null
  descripcion: string
  activa: boolean
}

/**
 * Limpia la descripción y dice si vale. Es opcional: vacía se acepta (la
 * portada usa entonces `DESCRIPCION_POR_DEFECTO`).
 */
export function revisarDescripcion(
  cruda: string,
): { ok: true; descripcion: string } | { ok: false; error: string } {
  const descripcion = cruda.replace(/\s+/g, ' ').trim()
  if (descripcion.length > DESCRIPCION_MAXIMA) {
    return {
      ok: false,
      error: `La descripción no puede pasar de ${DESCRIPCION_MAXIMA} caracteres.`,
    }
  }
  return { ok: true, descripcion }
}

/** El texto alternativo con el que la imagen sale en la portada. */
export function textoAlternativo(descripcion: string): string {
  return descripcion.trim() || DESCRIPCION_POR_DEFECTO
}

/* Cómo queda el orden al mover una pieza: lo comparten este carrusel y la
   galería de un comercio (`lib/shared/orden.ts`). */
export { ordenTrasMover } from '../shared/orden'
