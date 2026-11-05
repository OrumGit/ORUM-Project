'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CAMPO_TURNSTILE, TURNSTILE_SITE_KEY_PRUEBA } from '@/lib/auth/turnstile'
import styles from './turnstile.module.css'

/*
  Widget de Cloudflare Turnstile.

  Va DENTRO de un <form>: al resolverse, inyecta un input oculto
  `cf-turnstile-response` que viaja con el envío y que la server action valida
  antes de tocar Supabase.

  Si la site key no está configurada se usa la llave de prueba oficial de
  Cloudflare (siempre pasa), así el desarrollo local funciona sin cuenta. En
  producción hay que definir `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.

  Estado: el formulario puede saber si ya hay token con `useTurnstile()` y
  desactivar su botón mientras tanto. Sin eso, en una red lenta se enviaba el
  formulario antes de que el widget terminara y la acción rechazaba por
  `token-ausente`.
*/

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || TURNSTILE_SITE_KEY_PRUEBA
const URL_API = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

export type EstadoTurnstile = 'cargando' | 'listo' | 'error'

type TurnstileAPI = {
  render: (el: HTMLElement, opciones: Record<string, unknown>) => string
  remove: (id: string) => void
  reset: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileAPI
  }
}

// El <script> se carga una sola vez para toda la página, aunque monten varios
// widgets o se navegue entre pantallas de acceso. Si falla (red, bloqueador),
// se descarta la promesa para que «Reintentar» pueda volver a pedirlo.
let promesaScript: Promise<void> | null = null

function cargarScript(): Promise<void> {
  if (promesaScript) return promesaScript
  promesaScript = new Promise<void>((resolver, rechazar) => {
    const s = document.createElement('script')
    s.src = URL_API
    s.async = true
    s.onload = () => resolver()
    s.onerror = () => {
      s.remove()
      promesaScript = null
      rechazar(new Error('No se pudo cargar Turnstile'))
    }
    document.head.appendChild(s)
  })
  return promesaScript
}

/**
 * Estado del widget para el formulario que lo monta:
 *
 *   const turnstile = useTurnstile()
 *   <Turnstile {...turnstile.enlace} reiniciarAl={state} />
 *   <Button disabled={!turnstile.listo} …>
 */
export function useTurnstile() {
  const [estado, setEstado] = useState<EstadoTurnstile>('cargando')
  return { listo: estado === 'listo', estado, enlace: { onEstado: setEstado } }
}

type Props = {
  /**
   * Cada vez que este valor cambia, el widget pide un token nuevo. Un token de
   * Turnstile solo se puede validar UNA vez, así que un formulario que permite
   * reintentar tras un error (el de aliados conserva lo escrito) debe pasarle
   * aquí el estado devuelto por la acción: sin esto, el segundo envío viaja con
   * el token ya gastado y falla con `timeout-or-duplicate`.
   */
  reiniciarAl?: unknown
  /** Los accesos siguen el tema del sistema; el Portal Público va siempre en claro. */
  tema?: 'auto' | 'light' | 'dark'
  /** Avisa al formulario de si el token ya está listo (ver `useTurnstile`). */
  onEstado?: (estado: EstadoTurnstile) => void
}

export function Turnstile({ reiniciarAl, tema = 'auto', onEstado }: Props) {
  const contenedor = useRef<HTMLDivElement>(null)
  const idWidget = useRef<string | null>(null)
  const ultimoReinicio = useRef(reiniciarAl)
  const [estado, setEstadoLocal] = useState<EstadoTurnstile>('cargando')
  // Sube al pulsar «Reintentar» y vuelve a montar el widget desde cero.
  const [intento, setIntento] = useState(0)

  // `onEstado` llega de un `useState`, así que es estable; se guarda en un ref
  // por si algún formulario pasa una función nueva en cada render.
  const avisar = useRef(onEstado)
  useEffect(() => {
    avisar.current = onEstado
  }, [onEstado])

  const fijarEstado = useCallback((nuevo: EstadoTurnstile) => {
    setEstadoLocal(nuevo)
    avisar.current?.(nuevo)
  }, [])

  useEffect(() => {
    if (Object.is(ultimoReinicio.current, reiniciarAl)) return
    ultimoReinicio.current = reiniciarAl
    // El token anterior ya se gastó: hasta que llegue otro, no se puede enviar.
    // Se difiere un microtask: un efecto no debe fijar estado de forma síncrona.
    queueMicrotask(() => fijarEstado('cargando'))
    if (idWidget.current && window.turnstile) window.turnstile.reset(idWidget.current)
  }, [reiniciarAl, fijarEstado])

  useEffect(() => {
    let widgetId: string | null = null
    let cancelado = false

    queueMicrotask(() => {
      if (!cancelado) fijarEstado('cargando')
    })

    cargarScript()
      .then(() => {
        if (cancelado || !contenedor.current || !window.turnstile) return
        widgetId = window.turnstile.render(contenedor.current, {
          sitekey: SITE_KEY,
          theme: tema,
          language: 'es',
          'response-field-name': CAMPO_TURNSTILE,
          // Reintenta solo ante un fallo (red lenta, desafío agotado) y pide un
          // token nuevo cuando el actual caduca (a los ~5 min).
          retry: 'auto',
          'retry-interval': 3000,
          'refresh-expired': 'auto',
          callback: () => fijarEstado('listo'),
          'expired-callback': () => fijarEstado('cargando'),
          'timeout-callback': () => fijarEstado('cargando'),
          'before-interactive-callback': () => fijarEstado('cargando'),
          'error-callback': (codigo: unknown) => {
            // El código dice la causa: 110xxx es de configuración (llave o
            // dominio); 300xxx y 600xxx, del dispositivo o la red.
            console.warn('[Turnstile] error', codigo)
            fijarEstado('error')
            // Con `retry: 'auto'`, devolver `false` no cancela el reintento;
            // devolver `true` marca el error como atendido.
            return true
          },
        })
        idWidget.current = widgetId
      })
      .catch(() => {
        // Fail-closed: sin widget no hay token y la server action rechaza el
        // envío. Se avisa para que la persona pueda reintentar.
        if (!cancelado) fijarEstado('error')
      })

    return () => {
      cancelado = true
      idWidget.current = null
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [tema, intento, fijarEstado])

  return (
    <div className={styles.envoltura}>
      <div ref={contenedor} className={styles.caja} />
      {estado === 'error' && (
        <p className={styles.error} role="alert">
          No pudimos completar la verificación. Revisa tu conexión (o desactiva la VPN o el
          Relay privado) y{' '}
          <button
            type="button"
            className={styles.reintentar}
            onClick={() => setIntento((n) => n + 1)}
          >
            reintenta
          </button>
          .
        </p>
      )}
    </div>
  )
}
