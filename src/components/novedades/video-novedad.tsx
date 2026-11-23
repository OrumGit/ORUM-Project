'use client'

import { useState } from 'react'
import { Play } from 'lucide-react'
import { CLASE_PREVIA, estiloPrevia } from '@/components/videos/previa'
import { VisorVideo } from '@/components/videos/visor-video'
import { PROPORCION_DESTINO, type EncuadrePrevia } from '@/lib/videos/video'
import styles from './video-novedad.module.css'

/*
  EL VIDEO DE UNA NOVEDAD  ·  (13/11/2026)
  ---------------------------------------------------------------------------
  «La visualización completa con el formato original, pero la
  previsualización con un formato ajustado». En la tarjeta se ve la VISTA
  PREVIA —la portada del video con el encuadre que eligió el administrador,
  16:9— y un botón de reproducir encima. Tocarla abre el video COMPLETO, en
  su formato original y con sonido, en la ventana encima (`VisorVideo`), la
  misma del carrusel de la portada. Nada se descarga hasta entonces.
*/

type Props = {
  video: string
  portada: string | null
  encuadre: EncuadrePrevia | null | undefined
  titulo: string
}

export function VideoNovedad({ video, portada, encuadre, titulo }: Props) {
  const [abierto, setAbierto] = useState(false)

  return (
    <>
      <button
        type="button"
        className={styles.previa}
        onClick={() => setAbierto(true)}
        aria-label={`Ver el video: ${titulo}`}
      >
        {portada ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL de Storage, no un asset local
          <img
            src={portada}
            alt=""
            className={[styles.imagen, CLASE_PREVIA].join(' ')}
            style={estiloPrevia(encuadre, PROPORCION_DESTINO.novedades)}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <video
            src={video}
            className={[styles.imagen, CLASE_PREVIA].join(' ')}
            style={estiloPrevia(encuadre, PROPORCION_DESTINO.novedades)}
            preload="metadata"
            muted
            playsInline
            aria-hidden="true"
          />
        )}
        <span className={styles.reproducir} aria-hidden="true">
          <Play size={26} />
        </span>
      </button>

      <VisorVideo
        video={abierto ? video : null}
        portada={portada}
        descripcion={titulo}
        onCerrar={() => setAbierto(false)}
      />
    </>
  )
}
