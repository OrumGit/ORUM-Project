'use client'

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
} from 'react'
import { Pause, Play, RefreshCw, Upload, VolumeX } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/ui/feedback'
import { SegmentedControl } from '@/components/ui/segmented'
import { Checkbox } from '@/components/ui/toggle'
import {
  DURACION_MAXIMA,
  ENCUADRE_CENTRADO,
  PROPORCION_DESTINO,
  ZOOM_MAXIMO,
  medidasSalida,
  moverExtremo,
  recorteParaMarco,
  revisarTramo,
  textoTiempo,
  textoTiempoLargo,
  tramoInicial,
  type DestinoVideo,
  type Encuadre,
  type Tramo,
} from '@/lib/videos/video'
import { ErrorVideo, capturarPortada, exportarVideo, miniaturas } from './exportar-video'
import { subirVideo } from './subir-video'
import styles from './editor-video.module.css'

/*
  EL EDITOR DE VIDEO  ·  novedades y carrusel de la portada (13/11/2026)
  ---------------------------------------------------------------------------
  Encargo: «subir videos de máximo 5 minutos, con el visor para recortarlo y
  ajustar la duración, para que se vea correctamente en los portales».

  Tres cosas, de arriba abajo:
    · EL MARCO, con la proporción del destino (16:9 novedades, 4:3 portada).
      «Llenar el marco»: se arrastra para encuadrar y se acerca con la barra
      (las flechas también mueven); es exactamente lo que se recorta al
      preparar. «Video completo»: sin recortar, el marco es el del propio
      video (como las fotos enteras). Si el video ya tiene la proporción del
      marco, no hay nada que elegir.
    · LA LÍNEA DE TIEMPO con miniaturas y DOS TIRADORES, inicio y fin (con
      ratón, dedo o flechas; Mayús salta 10 s). El tramo no puede pasar de 5
      minutos: un video más largo abre recortado a sus primeros 5 y el
      tirador que se pase arrastra al otro. Reproducir enseña solo el tramo.
    · «Usar este video»: saca la portada (el primer fotograma del tramo),
      prepara el MP4 en el navegador y lo sube, con una barra que dice qué
      hace y cuánto lleva, y «Cancelar» en todo momento.

  Movimiento: nada se anima salvo el arrastre (sigue al dedo, sin
  transición) y la entrada del aviso de progreso. Las medidas del encuadre se
  inyectan como variables (`style`), que es lo único dinámico.
*/

export type VideoListo = {
  /** La ruta del MP4 ya subido en el bucket de videos. */
  ruta: string
  /** El primer fotograma, para guardarlo como la imagen de la pieza. */
  portada: File
  /** Cuánto dura lo publicado, en segundos. */
  duracion: number
}

type Props = {
  archivo: File
  destino: DestinoVideo
  textoGuardar?: string
  /** El padre está guardando lo ya subido: todo quieto y «Guardando…». */
  guardando?: boolean
  onListo: (video: VideoListo) => void
  onCancelar: () => void
  onElegirOtro: () => void
}

type Meta = { duracion: number; ancho: number; alto: number }
type Fase = { etapa: 'portada' | 'preparando' | 'subiendo'; progreso: number }

const ETAPA: Record<Fase['etapa'], string> = {
  portada: 'Sacando la portada…',
  preparando: 'Preparando el video',
  subiendo: 'Subiendo el video',
}

const MINIATURAS = 10

export function EditorVideo({
  archivo,
  destino,
  textoGuardar = 'Usar este video',
  guardando = false,
  onListo,
  onCancelar,
  onElegirOtro,
}: Props) {
  // El padre lo monta con `key` por archivo: la URL local vive lo que vive el editor.
  const [url] = useState(() => URL.createObjectURL(archivo))
  useEffect(() => () => URL.revokeObjectURL(url), [url])

  const video = useRef<HTMLVideoElement>(null)
  const marco = useRef<HTMLDivElement>(null)
  const pista = useRef<HTMLDivElement>(null)
  const arrastre = useRef<{ id: number; x: number; y: number; centroX: number; centroY: number; escala: number } | null>(null)
  const cancelador = useRef<AbortController | null>(null)
  const ultimoPorcentaje = useRef(-1)

  const [meta, setMeta] = useState<Meta | null>(null)
  const [errorCarga, setErrorCarga] = useState<string | null>(null)
  const [tramo, setTramo] = useState<Tramo>({ inicio: 0, fin: 0 })
  const [modo, setModo] = useState<'llenar' | 'completo'>('llenar')
  const [encuadre, setEncuadre] = useState<Encuadre>(ENCUADRE_CENTRADO)
  const [quitarSonido, setQuitarSonido] = useState(false)
  const [reproduciendo, setReproduciendo] = useState(false)
  const [actual, setActual] = useState(0)
  const [tiras, setTiras] = useState<string[]>([])
  const [fase, setFase] = useState<Fase | null>(null)
  const [error, setError] = useState<string | null>(null)

  // En la portada los videos se ven sin sonido: no se sube el audio.
  const sinSonido = destino === 'portada' || quitarSonido
  const proporcion = PROPORCION_DESTINO[destino]
  const mismaProporcion = meta !== null && Math.abs(meta.ancho / meta.alto - proporcion) < 0.02
  const llenar = meta !== null && !mismaProporcion && modo === 'llenar'
  const recorte = meta && llenar ? recorteParaMarco(meta, proporcion, encuadre) : null
  const salida = meta ? medidasSalida(recorte ? { ancho: recorte.width, alto: recorte.height } : meta) : null
  const ocupado = fase !== null || guardando
  const largoTramo = tramo.fin - tramo.inicio

  // Las miniaturas, cuando ya se sabe cuánto dura.
  useEffect(() => {
    if (!meta) return
    let vivo = true
    let hechas: string[] = []
    void miniaturas(archivo, meta.duracion, MINIATURAS).then((urls) => {
      hechas = urls
      if (vivo) setTiras(urls)
      else urls.forEach((u) => URL.revokeObjectURL(u))
    })
    return () => {
      vivo = false
      hechas.forEach((u) => URL.revokeObjectURL(u))
    }
  }, [archivo, meta])

  // Si se cierra a medias, se cancela lo que se estuviera preparando o subiendo.
  useEffect(() => () => cancelador.current?.abort(), [])

  function alCargar() {
    const v = video.current
    if (!v) return
    const duracion = Number.isFinite(v.duration) ? v.duration : 0
    if (!(duracion > 0) || !v.videoWidth) {
      setErrorCarga('No se pudo leer este video. Prueba con otro archivo, mejor en MP4.')
      return
    }
    setMeta({ duracion, ancho: v.videoWidth, alto: v.videoHeight })
    setTramo(tramoInicial(duracion))
  }

  /* --- Reproducir solo el tramo ------------------------------------------- */

  function alternarReproduccion() {
    const v = video.current
    if (!v) return
    if (!v.paused) {
      v.pause()
      return
    }
    if (v.currentTime < tramo.inicio || v.currentTime >= tramo.fin - 0.05) v.currentTime = tramo.inicio
    void v.play().catch(() => setReproduciendo(false))
  }

  function alAvanzar() {
    const v = video.current
    if (!v) return
    setActual(v.currentTime)
    // Al llegar al fin del tramo, vuelve al inicio y se detiene.
    if (!v.paused && v.currentTime >= tramo.fin) {
      v.pause()
      v.currentTime = tramo.inicio
    }
  }

  function irA(segundo: number) {
    const v = video.current
    if (!v) return
    v.pause()
    v.currentTime = segundo
    setActual(segundo)
  }

  /* --- El tramo ------------------------------------------------------------ */

  function mover(extremo: 'inicio' | 'fin', valor: number) {
    if (!meta) return
    const nuevo = moverExtremo(tramo, extremo, valor, meta.duracion)
    setTramo(nuevo)
    irA(extremo === 'inicio' ? nuevo.inicio : nuevo.fin)
  }

  function segundoEn(clientX: number): number {
    const caja = pista.current?.getBoundingClientRect()
    if (!caja || !meta) return 0
    return Math.min(1, Math.max(0, (clientX - caja.left) / caja.width)) * meta.duracion
  }

  function alApretarTirador(e: PointerEvent<HTMLButtonElement>) {
    if (ocupado) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    e.currentTarget.focus()
  }

  function alMoverTirador(extremo: 'inicio' | 'fin', e: PointerEvent<HTMLButtonElement>) {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
    mover(extremo, segundoEn(e.clientX))
  }

  function alTeclearTirador(extremo: 'inicio' | 'fin', e: KeyboardEvent<HTMLButtonElement>) {
    if (!meta) return
    const paso = e.shiftKey ? 10 : 1
    const valor = tramo[extremo]
    const destinoTecla: Record<string, number> = {
      ArrowLeft: valor - paso,
      ArrowDown: valor - paso,
      ArrowRight: valor + paso,
      ArrowUp: valor + paso,
      Home: 0,
      End: meta.duracion,
    }
    if (!(e.key in destinoTecla)) return
    e.preventDefault()
    mover(extremo, destinoTecla[e.key])
  }

  /* --- El encuadre --------------------------------------------------------- */

  function encuadrarEn(centroX: number, centroY: number, zoom = encuadre.zoom) {
    if (!meta) return
    const r = recorteParaMarco(meta, proporcion, { x: centroX / meta.ancho, y: centroY / meta.alto, zoom })
    // Se guarda el centro YA acotado: así el siguiente arrastre no arrastra un sobrante.
    setEncuadre({ x: (r.left + r.width / 2) / meta.ancho, y: (r.top + r.height / 2) / meta.alto, zoom })
  }

  function alApretarMarco(e: PointerEvent<HTMLDivElement>) {
    if (!recorte || ocupado || (e.pointerType === 'mouse' && e.button !== 0)) return
    e.currentTarget.setPointerCapture(e.pointerId)
    arrastre.current = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      centroX: recorte.left + recorte.width / 2,
      centroY: recorte.top + recorte.height / 2,
      // Píxeles del video por píxel de pantalla.
      escala: recorte.width / (marco.current?.clientWidth || 1),
    }
  }

  function alMoverMarco(e: PointerEvent<HTMLDivElement>) {
    const a = arrastre.current
    if (!a || a.id !== e.pointerId) return
    encuadrarEn(a.centroX - (e.clientX - a.x) * a.escala, a.centroY - (e.clientY - a.y) * a.escala)
  }

  function alTeclearMarco(e: KeyboardEvent<HTMLDivElement>) {
    if (!recorte || !meta) return
    const paso = (e.shiftKey ? 0.1 : 0.02) * recorte.width
    const dx = e.key === 'ArrowLeft' ? -paso : e.key === 'ArrowRight' ? paso : 0
    const dy = e.key === 'ArrowUp' ? -paso : e.key === 'ArrowDown' ? paso : 0
    if (!dx && !dy) return
    e.preventDefault()
    encuadrarEn(recorte.left + recorte.width / 2 + dx, recorte.top + recorte.height / 2 + dy)
  }

  function acercar(zoom: number) {
    if (!recorte) return
    encuadrarEn(recorte.left + recorte.width / 2, recorte.top + recorte.height / 2, zoom)
  }

  /* --- Preparar y subir ---------------------------------------------------- */

  function progreso(etapa: Fase['etapa'], fraccion: number) {
    const porcentaje = Math.floor(fraccion * 100)
    if (porcentaje === ultimoPorcentaje.current) return
    ultimoPorcentaje.current = porcentaje
    setFase({ etapa, progreso: fraccion })
  }

  async function preparar() {
    const v = video.current
    if (!meta || !salida || !v) return
    const motivo = revisarTramo(tramo, meta.duracion)
    if (motivo) {
      setError(motivo)
      return
    }
    setError(null)
    const control = new AbortController()
    cancelador.current = control
    ultimoPorcentaje.current = -1

    try {
      setFase({ etapa: 'portada', progreso: 0 })
      v.pause()
      v.currentTime = tramo.inicio
      await new Promise<void>((ok) => v.addEventListener('seeked', () => ok(), { once: true }))
      const portada = await capturarPortada(v, recorte, salida)

      const mp4 = await exportarVideo(archivo, {
        tramo,
        recorte,
        salida,
        sinSonido,
        alProgresar: (p) => progreso('preparando', p),
        senal: control.signal,
      })
      if (control.signal.aborted) return

      ultimoPorcentaje.current = -1
      const ruta = await subirVideo(mp4, destino, (p) => progreso('subiendo', p), control.signal)
      onListo({ ruta, portada, duracion: largoTramo })
    } catch (e) {
      const cancelado =
        control.signal.aborted || (e instanceof Error && /cancel|abort/i.test(`${e.name} ${e.message}`))
      if (!cancelado) {
        setError(e instanceof ErrorVideo ? e.message : 'No se pudo preparar el video. Inténtalo de nuevo.')
      }
    } finally {
      if (cancelador.current === control) cancelador.current = null
      setFase(null)
    }
  }

  function cancelar() {
    if (cancelador.current) {
      cancelador.current.abort()
      return
    }
    onCancelar()
  }

  /* --- Pintar -------------------------------------------------------------- */

  const variables = {
    '--proporcion': mismaProporcion || llenar || !meta ? proporcion : meta.ancho / meta.alto,
    ...(recorte && meta
      ? {
          '--v-ancho': `${(meta.ancho / recorte.width) * 100}%`,
          '--v-alto': `${(meta.alto / recorte.height) * 100}%`,
          '--v-x': `${(-recorte.left / meta.ancho) * 100}%`,
          '--v-y': `${(-recorte.top / meta.alto) * 100}%`,
        }
      : {}),
  } as CSSProperties

  const pct = (s: number) => (meta ? `${(s / meta.duracion) * 100}%` : '0%')

  if (errorCarga) {
    return (
      <div className={styles.editor}>
        <Alert tone="danger">{errorCarga}</Alert>
        <div className={styles.botones}>
          <Button type="button" variant="secondary" onClick={onCancelar}>
            Cancelar
          </Button>
          <Button type="button" icon={<RefreshCw size={16} />} onClick={onElegirOtro}>
            Elegir otro video
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.editor} style={variables}>
      {/* ── EL MARCO ─────────────────────────────────────────────────── */}
      {meta && !mismaProporcion && (
        <SegmentedControl
          options={[
            { value: 'llenar', label: 'Llenar el marco' },
            { value: 'completo', label: 'Video completo' },
          ]}
          value={modo}
          onChange={(m) => setModo(m)}
          ariaLabel="Cómo se ajusta el video al marco"
        />
      )}

      <div
        ref={marco}
        className={styles.marco}
        data-llenar={llenar || undefined}
        data-cargando={!meta || undefined}
        onPointerDown={alApretarMarco}
        onPointerMove={alMoverMarco}
        onPointerUp={() => (arrastre.current = null)}
        onPointerCancel={() => (arrastre.current = null)}
        onKeyDown={alTeclearMarco}
        tabIndex={llenar ? 0 : undefined}
        role={llenar ? 'group' : undefined}
        aria-label={llenar ? 'Encuadre del video: arrástralo o muévelo con las flechas' : undefined}
      >
        <video
          ref={video}
          src={url}
          className={styles.video}
          muted={sinSonido}
          playsInline
          preload="auto"
          onLoadedMetadata={alCargar}
          onError={() =>
            setErrorCarga(
              'Este video no se puede abrir en este navegador (puede venir en un formato del iPhone). Prueba con otro archivo o expórtalo como MP4.',
            )
          }
          onTimeUpdate={alAvanzar}
          onPlay={() => setReproduciendo(true)}
          onPause={() => setReproduciendo(false)}
        />
      </div>

      {llenar && (
        <label className={styles.zoom}>
          <span>Acercar</span>
          <input
            type="range"
            min={1}
            max={ZOOM_MAXIMO}
            step={0.01}
            value={encuadre.zoom}
            onChange={(e) => acercar(Number(e.target.value))}
            disabled={ocupado}
          />
        </label>
      )}

      {/* ── LA LÍNEA DE TIEMPO ──────────────────────────────────────── */}
      {meta && (
        <div className={styles.tiempo}>
          <div className={styles.controles}>
            <button
              type="button"
              className={styles.reproducir}
              onClick={alternarReproduccion}
              disabled={ocupado}
              aria-label={reproduciendo ? 'Pausar' : 'Reproducir el tramo elegido'}
            >
              {reproduciendo ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
            </button>
            <p className={styles.reloj}>
              {textoTiempo(Math.max(0, actual - tramo.inicio))} / {textoTiempo(largoTramo)}
            </p>
            {destino !== 'portada' && (
              <Checkbox
                label="Quitar el sonido"
                checked={quitarSonido}
                onChange={(e) => setQuitarSonido(e.target.checked)}
                disabled={ocupado}
                className={styles.sonido}
              />
            )}
            {destino === 'portada' && (
              <span className={styles.nota}>
                <VolumeX size={14} aria-hidden="true" />
                En la portada se ve sin sonido
              </span>
            )}
          </div>

          <div ref={pista} className={styles.pista} onPointerDown={(e) => !ocupado && e.target === e.currentTarget && irA(segundoEn(e.clientX))}>
            <div className={styles.tiras} aria-hidden="true">
              {tiras.map((u) => (
                // eslint-disable-next-line @next/next/no-img-element -- miniatura local
                <img key={u} src={u} alt="" />
              ))}
            </div>
            <span className={styles.fuera} style={{ '--de': '0%', '--hasta': pct(tramo.inicio) } as CSSProperties} aria-hidden="true" />
            <span className={styles.fuera} style={{ '--de': pct(tramo.fin), '--hasta': '100%' } as CSSProperties} aria-hidden="true" />
            <span
              className={styles.tramo}
              style={{ '--de': pct(tramo.inicio), '--hasta': pct(tramo.fin) } as CSSProperties}
              aria-hidden="true"
            />
            <span className={styles.cabezal} style={{ '--en': pct(actual) } as CSSProperties} aria-hidden="true" />
            {(['inicio', 'fin'] as const).map((extremo) => (
              <button
                key={extremo}
                type="button"
                className={styles.tirador}
                data-extremo={extremo}
                style={{ '--en': pct(tramo[extremo]) } as CSSProperties}
                role="slider"
                aria-label={extremo === 'inicio' ? 'Dónde empieza' : 'Dónde termina'}
                aria-valuemin={0}
                aria-valuemax={Math.round(meta.duracion)}
                aria-valuenow={Math.round(tramo[extremo])}
                aria-valuetext={textoTiempoLargo(tramo[extremo])}
                disabled={ocupado}
                onPointerDown={alApretarTirador}
                onPointerMove={(e) => alMoverTirador(extremo, e)}
                onKeyDown={(e) => alTeclearTirador(extremo, e)}
              />
            ))}
          </div>

          <p className={styles.resumen} aria-live="polite">
            Empieza en <strong>{textoTiempo(tramo.inicio)}</strong> · termina en{' '}
            <strong>{textoTiempo(tramo.fin)}</strong> · dura <strong>{textoTiempo(largoTramo)}</strong>
            {meta.duracion > DURACION_MAXIMA && (
              <span className={styles.nota}>
                {' '}
                El video dura {textoTiempo(meta.duracion)}: se publican como mucho 5 minutos.
              </span>
            )}
          </p>
        </div>
      )}

      {error && <Alert tone="danger">{error}</Alert>}

      {guardando && !fase && (
        <div className={styles.fase} role="status">
          <p className={styles.faseTexto}>Guardando…</p>
          <ProgressBar label="Guardando" />
        </div>
      )}

      {fase && (
        <div className={styles.fase} role="status">
          <p className={styles.faseTexto}>
            {ETAPA[fase.etapa]}
            {fase.etapa !== 'portada' && ` · ${Math.floor(fase.progreso * 100)} %`}
          </p>
          <ProgressBar
            value={fase.etapa === 'portada' ? undefined : fase.progreso * 100}
            label={ETAPA[fase.etapa]}
          />
          <p className={styles.faseAyuda}>
            Deja esta ventana abierta. Un video largo puede tardar un par de minutos.
          </p>
        </div>
      )}

      <div className={styles.botones}>
        <Button type="button" variant="secondary" onClick={cancelar} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="button" variant="secondary" icon={<RefreshCw size={16} />} onClick={onElegirOtro} disabled={ocupado}>
          Elegir otro
        </Button>
        <Button
          type="button"
          icon={<Upload size={16} />}
          onClick={preparar}
          disabled={!meta || ocupado}
          loading={ocupado}
        >
          {textoGuardar}
        </Button>
      </div>
    </div>
  )
}
