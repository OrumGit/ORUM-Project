'use client'

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { Pause, Play } from 'lucide-react'
import { useMediaQuery } from '@/components/use-media-query'
import type { FotoPublica } from '@/lib/publico/datos-publicos'
import estilos from './carrusel-fotos.module.css'

/*
  EL CARRUSEL DE «QUÉ ES ORUM»  ·  fotos reales que se relevan solas
  ---------------------------------------------------------------------------
  Portadas de comercios aliados, una cada `INTERVALO_MS`.

  SE ARRASTRA (02/10/2026, encargo: «que se pueda desplazar con el dedo en el
  móvil y con el ratón en el PC»). Por eso dejó de ser un fundido cruzado y
  es un CARRIL: las fotos van en fila y se mueve el carril entero con
  `transform` (sin recalcular layout). Las reglas de gesto del proyecto:

    · Seguimiento 1:1 mientras el dedo está abajo, sin transición que lo
      retrase.
    · Al soltar se decide por DÓNDE IBA el gesto (desplazamiento + velocidad
      proyectada), no solo por dónde se soltó: un golpe corto y rápido pasa
      de foto igual que un arrastre largo.
    · Resistencia elástica pasados los extremos.
    · En táctil, un gesto VERTICAL sigue siendo de la página
      (`touch-action: pan-y`): solo el horizontal mueve las fotos, y se
      decide en los primeros píxeles.

  VIDEOS (13/11/2026): una pieza puede ser un video (lo sube el
  administrador en «Publicidad», ya recortado y sin sonido). Se ve su
  portada hasta que le toca; entonces se reproduce, SIN SONIDO, y el
  carrusel espera a que termine para pasar a la siguiente (no a los 4,5 s).
  Solo suena el que está a la vista y solo si el carrusel está en pantalla
  (`IntersectionObserver`): fuera de ella no gasta batería ni datos. La
  pausa del carrusel también lo pausa. Con movimiento reducido no arranca
  solo: lleva sus controles para reproducirlo a mano.

  WCAG 2.2.2 (PAUSAR, DETENER, OCULTAR): botón de pausa visible; se detiene
  con el ratón encima, con el foco dentro y mientras se arrastra; con
  `prefers-reduced-motion` no arranca solo y los cambios no se deslizan.

  Los puntos son botones de verdad (`aria-current`), las flechas ← → pasan
  de foto con el foco dentro, y el cambio se anuncia solo cuando el carrusel
  está parado (`aria-live`).
*/

const INTERVALO_MS = 4500
/** Píxeles antes de decidir si el gesto es horizontal (carrusel) o vertical (página). */
const UMBRAL_DECISION = 8
/** Fracción del ancho que tiene que alcanzar el gesto proyectado para cambiar de foto. */
const UMBRAL_CAMBIO = 0.2
/** Cuánto «empuja» la velocidad: ms de inercia que se suman al desplazamiento. */
const PROYECCION_MS = 180
/** Resistencia pasados los extremos: el carril avanza un tercio de lo que se arrastra. */
const RESISTENCIA = 0.35

type Gesto = {
  id: number
  x0: number
  y0: number
  x: number
  t: number
  velocidad: number
  /** `null` mientras no se sabe si el gesto es horizontal o vertical. */
  horizontal: boolean | null
}

type Props = {
  fotos: FotoPublica[]
  /** Nombre accesible del carrusel, que debe decir QUÉ fotos son. */
  etiqueta: string
  className?: string
}

export function CarruselFotos({ fotos, etiqueta, className }: Props) {
  const reducirMovimiento = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [actual, setActual] = useState(0)
  const [pausadoPorUsuario, setPausadoPorUsuario] = useState(false)
  const [enfocado, setEnfocado] = useState(false)
  const [desplazamiento, setDesplazamiento] = useState(0)
  const [arrastrando, setArrastrando] = useState(false)
  const gesto = useRef<Gesto | null>(null)
  const raiz = useRef<HTMLDivElement>(null)
  const videos = useRef<(HTMLVideoElement | null)[]>([])
  const [enPantalla, setEnPantalla] = useState(false)

  const total = fotos.length
  const rotando =
    total > 1 && !pausadoPorUsuario && !enfocado && !arrastrando && !reducirMovimiento
  const actualEsVideo = Boolean(fotos[actual]?.video)

  // Un video marca su propio tiempo: el temporizador solo corre con fotos.
  useEffect(() => {
    if (!rotando || actualEsVideo) return
    const temporizador = window.setTimeout(() => {
      setActual((i) => (i + 1) % total)
    }, INTERVALO_MS)
    return () => window.clearTimeout(temporizador)
  }, [rotando, actualEsVideo, actual, total])

  // ¿Se ve el carrusel? Fuera de la pantalla, ningún video se reproduce.
  useEffect(() => {
    const el = raiz.current
    if (!el || !fotos.some((f) => f.video)) return
    const observador = new IntersectionObserver(([e]) => setEnPantalla(e.isIntersecting), { threshold: 0.25 })
    observador.observe(el)
    return () => observador.disconnect()
  }, [fotos])

  // Solo el video que está a la vista se reproduce, y desde el principio.
  useEffect(() => {
    videos.current.forEach((v, i) => {
      if (!v) return
      const toca = i === actual && enPantalla && !pausadoPorUsuario && !reducirMovimiento
      if (toca) {
        if (v.paused) void v.play().catch(() => {})
      } else if (!v.paused) {
        v.pause()
      }
      if (i !== actual && v.currentTime > 0) v.currentTime = 0
    })
  }, [actual, enPantalla, pausadoPorUsuario, reducirMovimiento])

  /** Al terminar un video: pasa a la siguiente pieza, o lo repite si el carrusel está parado. */
  function alTerminarVideo(i: number) {
    if (i !== actual) return
    if (rotando) {
      setActual((i + 1) % total)
      return
    }
    const v = videos.current[i]
    if (v && !pausadoPorUsuario && !reducirMovimiento) {
      v.currentTime = 0
      void v.play().catch(() => {})
    }
  }

  if (total === 0) return null

  /* --- Arrastrar ---------------------------------------------------------- */

  function alApretar(e: PointerEvent<HTMLDivElement>) {
    if (total < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return
    gesto.current = {
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      x: e.clientX,
      t: e.timeStamp,
      velocidad: 0,
      horizontal: null,
    }
  }

  function alMover(e: PointerEvent<HTMLDivElement>) {
    const g = gesto.current
    if (!g || g.id !== e.pointerId) return
    const dx = e.clientX - g.x0
    const dy = e.clientY - g.y0

    if (g.horizontal === null) {
      if (Math.abs(dx) < UMBRAL_DECISION && Math.abs(dy) < UMBRAL_DECISION) return
      g.horizontal = Math.abs(dx) > Math.abs(dy)
      if (!g.horizontal) {
        // Vertical: es de la página. Se suelta el gesto.
        gesto.current = null
        return
      }
      e.currentTarget.setPointerCapture(e.pointerId)
      setArrastrando(true)
    }

    // Velocidad suavizada (px/ms) para proyectar al soltar. El intervalo
    // tiene un mínimo de 8 ms (medio fotograma): dos eventos casi
    // simultáneos darían una velocidad disparatada y un gesto corto lento
    // pasaría de foto sin querer.
    const dt = Math.max(8, e.timeStamp - g.t)
    g.velocidad = 0.8 * ((e.clientX - g.x) / dt) + 0.2 * g.velocidad
    g.x = e.clientX
    g.t = e.timeStamp

    // Pasado un extremo, el carril se resiste.
    const fuera = (actual === 0 && dx > 0) || (actual === total - 1 && dx < 0)
    setDesplazamiento(fuera ? dx * RESISTENCIA : dx)
  }

  function alSoltar(e: PointerEvent<HTMLDivElement>) {
    const g = gesto.current
    gesto.current = null
    if (!g || g.id !== e.pointerId || !g.horizontal) return

    const ancho = e.currentTarget.clientWidth || 1
    const proyectado = e.clientX - g.x0 + g.velocidad * PROYECCION_MS
    if (proyectado < -ancho * UMBRAL_CAMBIO && actual < total - 1) setActual(actual + 1)
    else if (proyectado > ancho * UMBRAL_CAMBIO && actual > 0) setActual(actual - 1)

    setDesplazamiento(0)
    setArrastrando(false)
  }

  function alCancelar() {
    gesto.current = null
    setDesplazamiento(0)
    setArrastrando(false)
  }

  function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
    if (total < 2) return
    if (e.key === 'ArrowRight') {
      e.preventDefault()
      setActual((i) => (i + 1) % total)
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      setActual((i) => (i - 1 + total) % total)
    }
  }

  return (
    <div
      ref={raiz}
      className={[estilos.carrusel, className].filter(Boolean).join(' ')}
      role="group"
      aria-roledescription="carrusel"
      aria-label={etiqueta}
      onMouseEnter={() => setEnfocado(true)}
      onMouseLeave={() => setEnfocado(false)}
      onFocus={() => setEnfocado(true)}
      onBlur={(e) => {
        // Solo cuando el foco sale del carrusel entero, no al pasar entre sus botones.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEnfocado(false)
      }}
      onKeyDown={alTeclear}
    >
      <div
        className={estilos.fotos}
        aria-live={rotando ? 'off' : 'polite'}
        data-arrastrable={total > 1 || undefined}
        onPointerDown={alApretar}
        onPointerMove={alMover}
        onPointerUp={alSoltar}
        onPointerCancel={alCancelar}
      >
        {/* El carril: `--indice` y `--desplazamiento` son lo único dinámico
            que se inyecta por `style`. */}
        <div
          className={estilos.pista}
          data-arrastrando={arrastrando || undefined}
          style={
            {
              '--indice': actual,
              '--desplazamiento': `${desplazamiento}px`,
            } as CSSProperties
          }
        >
          {fotos.map((foto, i) =>
            foto.video ? (
              <video
                key={foto.url}
                ref={(v) => {
                  videos.current[i] = v
                }}
                src={foto.video}
                poster={foto.url}
                className={estilos.foto}
                data-controles={reducirMovimiento || undefined}
                aria-label={foto.alt}
                aria-hidden={i !== actual}
                muted
                playsInline
                // Carga cuando le toca: hasta entonces se ve su portada.
                preload={i === actual ? 'auto' : 'none'}
                loop={total === 1}
                controls={reducirMovimiento}
                onEnded={() => alTerminarVideo(i)}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element -- URL externa arbitraria, no un asset local
              <img
                key={foto.url}
                src={foto.url}
                alt={foto.alt}
                className={estilos.foto}
                aria-hidden={i !== actual}
                draggable={false}
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
              />
            ),
          )}
        </div>
      </div>

      {total > 1 && (
        <div className={estilos.controles}>
          <button
            type="button"
            className={estilos.pausa}
            onClick={() => setPausadoPorUsuario((p) => !p)}
            aria-label={pausadoPorUsuario ? 'Reanudar las fotos' : 'Pausar las fotos'}
          >
            {pausadoPorUsuario ? (
              <Play size={14} aria-hidden="true" />
            ) : (
              <Pause size={14} aria-hidden="true" />
            )}
          </button>

          <div className={estilos.puntos}>
            {fotos.map((foto, i) => (
              <button
                key={foto.url}
                type="button"
                className={estilos.punto}
                onClick={() => setActual(i)}
                aria-label={`${foto.video ? 'Video' : 'Foto'} ${i + 1} de ${total}`}
                aria-current={i === actual ? 'true' : undefined}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
