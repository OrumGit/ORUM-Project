'use client'

import { X } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import styles from './visor-video.module.css'

/*
  EL VIDEO EN GRANDE  ·  la visualización completa (13/11/2026)
  ---------------------------------------------------------------------------
  Una ventana encima, como los formularios («que se ponga encima de todo con
  el efecto de los formularios, y que se pueda cerrar»): `Modal desnudo`, con
  su velo difuminado y su entrada; se cierra con su X, Escape o tocando
  fuera. Dentro, el video ENTERO en su formato original («la visualización
  completa con el formato original»), con sus controles y CON SONIDO; si el
  navegador no deja sonar, en silencio (los controles lo activan). La
  pantalla completa queda en el botón del reproductor.

  Lo usan el carrusel de la portada y las novedades (públicas y de socios).
*/

type Props = {
  /** El MP4; `null` = cerrado. */
  video: string | null
  /** La portada, mientras carga. */
  portada?: string | null
  /** Qué se ve en el video (nombre accesible). */
  descripcion: string
  /** Desde qué segundo empieza (el del carrusel, si ya iba avanzado). */
  desde?: number
  onCerrar: () => void
}

export function VisorVideo({ video, portada, descripcion, desde = 0, onCerrar }: Props) {
  function alCargar(v: HTMLVideoElement) {
    if (desde > 0 && desde < v.duration - 0.5) v.currentTime = desde
    v.muted = false
    void v.play().catch(() => {
      v.muted = true
      void v.play().catch(() => {})
    })
  }

  return (
    <Modal open={video !== null} onClose={onCerrar} ariaLabel={descripcion} desnudo width="min(96vw, 1280px)">
      {video && (
        <div className={styles.visor}>
          <button type="button" className={styles.cerrar} onClick={onCerrar} aria-label="Cerrar el video">
            <X size={20} aria-hidden="true" />
          </button>
          <video
            src={video}
            poster={portada ?? undefined}
            className={styles.video}
            controls
            playsInline
            onLoadedMetadata={(e) => alCargar(e.currentTarget)}
            aria-label={descripcion}
          />
        </div>
      )}
    </Modal>
  )
}
