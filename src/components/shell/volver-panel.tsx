'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useSyncExternalStore } from 'react'
import { ChevronLeft } from 'lucide-react'
import { anotarVisita, destinoVolver, textoVolver, type Pila } from '@/lib/shared/volver-panel'
import styles from './volver-panel.module.css'

/*
  «VOLVER»  ·  arriba de cada pantalla del panel (07/11/2026)
  ---------------------------------------------------------------------------
  «Añade la funcionalidad para ir atrás, en todos los apartados del portal
  administrador». Lleva al LUGAR de donde se vino, tal como se dejó (sus
  filtros, su pestaña, su página), no al paso anterior del historial: ver
  `lib/shared/volver-panel.ts`. Sin pila (enlace directo, pestaña nueva),
  sube al lugar de arriba.

  La pila vive en `sessionStorage` (una por pestaña del navegador; sobrevive
  a recargar) y se lee con `useSyncExternalStore`. El servidor pinta el
  enlace al lugar de arriba, así que funciona aunque no cargue JavaScript, y
  es un `<Link>`: se puede abrir en otra pestaña.
*/

const CLAVE = 'orum:panel:volver'
const EVENTO = 'orum:panel:volver'

function leerPila(): string {
  try {
    return sessionStorage.getItem(CLAVE) ?? '[]'
  } catch {
    return '[]'
  }
}

function escribirPila(pila: Pila) {
  try {
    sessionStorage.setItem(CLAVE, JSON.stringify(pila))
  } catch {
    /* Sin almacenamiento (ventana privada estricta): queda el lugar de arriba. */
  }
  window.dispatchEvent(new Event(EVENTO))
}

function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO, avisar)
  return () => window.removeEventListener(EVENTO, avisar)
}

function aPila(texto: string | null): string[] {
  if (!texto) return []
  try {
    const valor: unknown = JSON.parse(texto)
    return Array.isArray(valor) ? valor.filter((u): u is string => typeof u === 'string') : []
  } catch {
    return []
  }
}

export function VolverPanel() {
  const ruta = usePathname()
  const consulta = useSearchParams().toString()
  const actual = consulta ? `${ruta}?${consulta}` : ruta

  // El servidor no tiene pila: pinta el lugar de arriba.
  const pila = aPila(useSyncExternalStore(suscribir, leerPila, () => null))

  // Cada lugar al que se llega queda anotado (cambiar de pestaña o de filtro
  // solo actualiza su URL).
  useEffect(() => {
    escribirPila(anotarVisita(aPila(leerPila()), actual))
  }, [actual])

  // Se calcula con la visita ya anotada: así el texto no cambia un instante
  // después de llegar, cuando el efecto la escribe.
  const destino = destinoVolver(anotarVisita(pila, actual), actual)
  const texto = textoVolver(destino)

  return (
    <Link href={destino} className={styles.volver} aria-label={texto === 'Volver' ? 'Volver atrás' : undefined}>
      <ChevronLeft size={18} aria-hidden="true" className={styles.flecha} />
      <span>{texto}</span>
    </Link>
  )
}
