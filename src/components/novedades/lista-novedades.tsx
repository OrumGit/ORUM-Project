import { Megaphone } from 'lucide-react'
import { EmptyState } from '@/components/ui/feedback'
import { EstrellaOrum } from '@/components/ui/marca/marca'
import { formatearFechaNovedad } from '@/lib/anuncios/fecha'
import type { AnuncioResumen } from '@/lib/anuncios/tipos'
import type { EncuadrePrevia } from '@/lib/videos/video'
import { VideoNovedad } from './video-novedad'
import styles from './lista-novedades.module.css'

/*
  LAS NOVEDADES  ·  rediseño del 21/10/2026
  ---------------------------------------------------------------------------
  Encargo: «cuando le doy a "Ver más" me aparece un diseño muy pobre que se
  ve muy vacío». Era una columna de 640px con tarjetas apiladas. Ahora:

    · LA MÁS RECIENTE, EN GRANDE: imagen y texto lado a lado a todo el ancho
      de la fachada (uno encima del otro en el teléfono), con su titular en
      el serif de la marca.
    · LAS ANTERIORES, EN REJILLA: tarjetas con su imagen en 16:9, la fecha,
      el título y el texto completo (son textos cortos: 600 caracteres).
    · SIN IMAGEN no queda un hueco: una lámina con la estrella de ORUM.
    · CADA UNA TIENE SU ANCLA (`#novedad-{id}`): el «Ver más» del aviso de la
      portada lleva directo a la suya, que se marca con el filo dorado.
*/
export function ListaNovedades({ anuncios }: { anuncios: AnuncioResumen[] }) {
  if (anuncios.length === 0) {
    return (
      <EmptyState
        icon={<Megaphone size={22} />}
        title="Todavía no hay novedades"
        description="Cuando el club anuncie algo, aparecerá aquí."
      />
    )
  }

  const [destacada, ...anteriores] = anuncios

  return (
    <div className={styles.lista}>
      <article id={`novedad-${destacada.id}`} className={styles.destacada}>
        <Imagen
          url={destacada.imagenUrl}
          video={destacada.videoUrl}
          encuadre={destacada.videoEncuadre}
          titulo={destacada.titulo}
        />
        <div className={styles.destacadaTexto}>
          <p className={styles.meta}>
            <span className={styles.etiqueta}>Lo más reciente</span>
            <time dateTime={destacada.createdAt}>{formatearFechaNovedad(destacada.createdAt)}</time>
          </p>
          <h2 className={styles.destacadaTitulo}>{destacada.titulo}</h2>
          <p className={styles.cuerpo}>{destacada.cuerpo}</p>
        </div>
      </article>

      {anteriores.length > 0 && (
        <section className={styles.anteriores} aria-labelledby="titulo-anteriores">
          <h2 id="titulo-anteriores" className={styles.subtitulo}>
            Novedades anteriores
          </h2>
          <ul className={styles.rejilla}>
            {anteriores.map((a) => (
              <li key={a.id}>
                <article id={`novedad-${a.id}`} className={styles.tarjeta}>
                  <Imagen url={a.imagenUrl} video={a.videoUrl} encuadre={a.videoEncuadre} titulo={a.titulo} />
                  <div className={styles.tarjetaTexto}>
                    <p className={styles.meta}>
                      <time dateTime={a.createdAt}>{formatearFechaNovedad(a.createdAt)}</time>
                    </p>
                    <h3 className={styles.tarjetaTitulo}>{a.titulo}</h3>
                    <p className={styles.cuerpo}>{a.cuerpo}</p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/**
 * La imagen en 16:9, o la lámina de la marca si no tiene. Decorativa: el
 * título dice qué es. Con VIDEO (13/11/2026), su VISTA PREVIA ajustada y un
 * botón de reproducir; tocarla lo abre completo, en su formato original, en
 * una ventana encima (`VideoNovedad`).
 */
function Imagen({
  url,
  video,
  encuadre,
  titulo,
}: {
  url: string | null
  video: string | null
  encuadre?: EncuadrePrevia | null
  titulo: string
}) {
  if (video) {
    return (
      <div className={styles.imagen} data-video="">
        <VideoNovedad video={video} portada={url} encuadre={encuadre} titulo={titulo} />
      </div>
    )
  }
  return (
    <div className={styles.imagen} aria-hidden="true">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- URL externa de Storage, no un asset local
        <img src={url} alt="" loading="lazy" decoding="async" />
      ) : (
        <span className={styles.lamina}>
          <EstrellaOrum className={styles.laminaEstrella} />
        </span>
      )}
    </div>
  )
}
