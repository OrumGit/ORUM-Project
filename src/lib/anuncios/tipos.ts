import type { EncuadrePrevia } from '../videos/video'

/** Una novedad tal como la consumen el banner y el historial. */
export type AnuncioResumen = {
  id: number
  titulo: string
  cuerpo: string
  /** La imagen, o la portada del video si lo hay. */
  imagenUrl: string | null
  /** El MP4 de la novedad (13/11/2026); `null` = solo imagen. */
  videoUrl: string | null
  /** El encuadre de la vista previa del video (13/11/2026). */
  videoEncuadre?: EncuadrePrevia | null
  createdAt: string
}
