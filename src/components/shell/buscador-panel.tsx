'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useId, useMemo, useRef, useState, useTransition } from 'react'
import { RefreshCw, Search, X } from 'lucide-react'
import { buscarMiembrosAction } from '@/app/admin/actions'
import { Avatar } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useMediaQuery } from '@/components/use-media-query'
import type { MiembroEncontrado } from '@/lib/miembros/buscar-miembros'
import type { RolCodigo } from '@/lib/supabase/database.types'
import { accionesPara } from './acciones-panel'
import styles from './buscador-panel.module.css'

/*
  EL BUSCADOR DEL PANEL  ·  rediseño del 15/10/2026
  ---------------------------------------------------------------------------
  Sustituye a la paleta de comandos. Encargo del propietario: «no quiero que
  aparezcan comandos; además quiero facilidad». Así que no hay ventana aparte
  ni teclas a la vista: es un campo de búsqueda normal en la barra de arriba,
  y al escribir se despliega DEBAJO lo que coincide:

    · LOS MIEMBROS, cada uno con su número y su estado, y al lado lo que se
      suele hacer con él: «Renovar» si está vencido o por vencer. Consultar
      si alguien está al día no obliga a abrir su ficha.
    · LAS ACCIONES que casan con lo escrito («vender», «nuevo comercio»…).
    · Sin escribir nada, los accesos más usados.

  El teclado sigue sirviendo, sin anunciarlo: Ctrl/⌘+K o «/» llevan al
  campo, las flechas recorren los resultados, Intro abre y Escape cierra.
*/

/** El evento con el que cualquier pantalla pide llevar el foco al buscador. */
const EVENTO_BUSCAR = 'orum:buscar'

/** Lleva el foco al buscador (la pestaña «Buscar» del teléfono, por ejemplo). */
export function enfocarBuscador() {
  window.dispatchEvent(new Event(EVENTO_BUSCAR))
}

/** Espera antes de consultar: sin ella, cada tecla dispara una consulta. */
const DEBOUNCE_MS = 160
/** Vencida, o le quedan menos días que esto: el atajo es «Renovar». */
const DIAS_RENOVAR = 30

function escribiendo(destino: EventTarget | null): boolean {
  if (!(destino instanceof HTMLElement)) return false
  return (
    destino.isContentEditable ||
    destino instanceof HTMLInputElement ||
    destino instanceof HTMLTextAreaElement ||
    destino instanceof HTMLSelectElement
  )
}

function conviveRenovar(m: MiembroEncontrado): boolean {
  if (!m.estado) return false
  return !m.estado.activa || m.estado.diasRestantes <= DIAS_RENOVAR
}

type Props = {
  rol: RolCodigo
  /** Fuente de miembros. Por defecto la del panel; `/dev/shell` pone una falsa. */
  buscar?: (termino: string) => Promise<MiembroEncontrado[]>
  className?: string
}

export function BuscadorPanel({ rol, buscar = buscarMiembrosAction, className }: Props) {
  const estrecho = useMediaQuery('(max-width: 639px)')
  const router = useRouter()
  const idLista = useId()
  const raiz = useRef<HTMLDivElement>(null)
  const entrada = useRef<HTMLInputElement>(null)
  const lista = useRef<HTMLDivElement>(null)

  const [consulta, setConsulta] = useState('')
  const [abierto, setAbierto] = useState(false)
  const [miembros, setMiembros] = useState<MiembroEncontrado[]>([])
  /*
    La opción marcada con las FLECHAS; -1 = ninguna (29/10/2026: «no me
    gusta que se vea como señalada esa opción»). Antes la primera salía
    marcada al abrir y el ratón marcaba la que pisaba: ahora solo marca el
    teclado, que sí necesita saber dónde está. Enter sin nada marcado abre
    la primera, como antes.
  */
  const [seleccion, setSeleccion] = useState(-1)
  const [buscando, iniciarBusqueda] = useTransition()

  const termino = consulta.trim()
  const conMiembros = termino.length >= 2
  const miembrosVisibles = useMemo(() => (conMiembros ? miembros : []), [conMiembros, miembros])
  const acciones = useMemo(() => {
    const todas = accionesPara(rol, termino)
    // Sin escribir, solo los accesos más usados: la lista entera abruma.
    return termino ? todas.slice(0, 6) : todas.slice(0, 5)
  }, [rol, termino])

  /* Una lista plana para recorrer con las flechas: miembros y acciones. */
  const destinos = useMemo(
    () => [
      ...miembrosVisibles.map((m) => `/admin/miembros/${m.id}`),
      ...acciones.map((a) => a.href),
    ],
    [miembrosVisibles, acciones],
  )

  // Los atajos de teclado, sin anunciarlos: llevan al campo.
  useEffect(() => {
    const enfocar = () => {
      entrada.current?.focus()
      entrada.current?.select()
    }
    const alPulsar = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        enfocar()
        return
      }
      if (
        e.key === '/' &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !e.defaultPrevented &&
        !escribiendo(e.target) &&
        !document.querySelector('dialog[open]')
      ) {
        e.preventDefault()
        enfocar()
      }
    }
    window.addEventListener('keydown', alPulsar)
    window.addEventListener(EVENTO_BUSCAR, enfocar)
    return () => {
      window.removeEventListener('keydown', alPulsar)
      window.removeEventListener(EVENTO_BUSCAR, enfocar)
    }
  }, [])

  // La consulta, con su pausa.
  useEffect(() => {
    if (!conMiembros) return
    const temporizador = setTimeout(() => {
      iniciarBusqueda(async () => {
        setMiembros(await buscar(termino))
      })
    }, DEBOUNCE_MS)
    return () => clearTimeout(temporizador)
  }, [termino, conMiembros, buscar])

  // La opción elegida con flechas, siempre a la vista.
  useEffect(() => {
    lista.current
      ?.querySelector<HTMLElement>('[data-seleccionada="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [seleccion])

  function cerrar() {
    setAbierto(false)
    setSeleccion(-1)
  }

  function ir(href: string) {
    cerrar()
    setConsulta('')
    entrada.current?.blur()
    router.push(href)
  }

  function alTeclear(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      if (consulta) setConsulta('')
      else {
        cerrar()
        entrada.current?.blur()
      }
      return
    }
    if (!abierto) setAbierto(true)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSeleccion((s) => (destinos.length ? (s + 1) % destinos.length : -1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSeleccion((s) =>
        destinos.length ? (s < 0 ? destinos.length - 1 : (s - 1 + destinos.length) % destinos.length) : -1,
      )
    } else if (e.key === 'Enter') {
      const destino = destinos[seleccion < 0 ? 0 : seleccion]
      if (destino) {
        e.preventDefault()
        ir(destino)
      }
    }
  }

  const sinResultados =
    conMiembros && !buscando && miembrosVisibles.length === 0 && acciones.length === 0

  return (
    <div
      ref={raiz}
      className={[styles.buscador, className].filter(Boolean).join(' ')}
      onBlur={(e) => {
        // Solo cuando el foco sale del buscador entero, no al pasar a un resultado.
        if (!raiz.current?.contains(e.relatedTarget as Node | null)) cerrar()
      }}
    >
      <label className={styles.campo}>
        <Search size={17} aria-hidden="true" className={styles.lupa} />
        <input
          ref={entrada}
          type="search"
          className={styles.entrada}
          value={consulta}
          onChange={(e) => {
            setConsulta(e.target.value)
            setSeleccion(-1)
            setAbierto(true)
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={alTeclear}
          // En el teléfono la frase entera no cabía y se cortaba a la mitad
          // («Busca un miembro, u»): ahí basta con «Buscar» (29/10/2026); qué
          // se puede buscar lo dice la lista al escribir.
          placeholder={estrecho ? 'Buscar' : 'Busca un miembro, una cédula o qué hacer'}
          aria-label="Buscar en el panel"
          role="combobox"
          aria-expanded={abierto}
          aria-controls={idLista}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
        />
        {consulta && (
          <button
            type="button"
            className={styles.limpiar}
            aria-label="Borrar la búsqueda"
            // No le roba el foco al campo (si no, el desplegable se cerraría).
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              setConsulta('')
              entrada.current?.focus()
            }}
          >
            <X size={15} aria-hidden="true" />
          </button>
        )}
      </label>

      {abierto && (
        <div
          ref={lista}
          id={idLista}
          className={styles.desplegable}
          role="listbox"
          aria-label="Resultados"
          data-barra=""
        >
          {/* Sin nada que enseñar, solo el aviso de abajo: antes salían dos
              que decían lo mismo («Ningún miembro…» y «Nada coincide…»). */}
          {conMiembros && !sinResultados && (
            <>
              <p className={styles.grupo}>
                Miembros
                {buscando && <Spinner size="sm" label={null} />}
              </p>
              {miembrosVisibles.map((m, i) => (
                <div
                  key={m.id}
                  role="option"
                  aria-selected={seleccion === i}
                  data-seleccionada={seleccion === i}
                  className={styles.fila}
                >
                  <Link
                    href={`/admin/miembros/${m.id}`}
                    className={styles.filaPrincipal}
                    onClick={() => {
                      cerrar()
                      setConsulta('')
                    }}
                  >
                    <Avatar nombre={m.nombre} src={m.fotoUrl} size="sm" decorativo />
                    <span className={styles.textos}>
                      <span className={styles.nombre}>{m.nombre}</span>
                      <span className={styles.meta}>
                        Nº {m.numeroMembresia} · CC {m.cedula}
                      </span>
                    </span>
                    {m.estado && <StatusBadge estado={m.estado} size="sm" />}
                  </Link>
                  {conviveRenovar(m) && (
                    <Link
                      href={`/admin/miembros/${m.id}/renovar`}
                      className={styles.atajo}
                      onClick={() => {
                        cerrar()
                        setConsulta('')
                      }}
                    >
                      <RefreshCw size={13} aria-hidden="true" />
                      Renovar
                    </Link>
                  )}
                </div>
              ))}
              {!buscando && miembrosVisibles.length === 0 && (
                <p className={styles.vacio}>Ningún miembro coincide con «{termino}».</p>
              )}
            </>
          )}

          {acciones.length > 0 && (
            <>
              <p className={styles.grupo}>{termino ? 'Acciones' : 'Accesos rápidos'}</p>
              {acciones.map((a, j) => {
                const i = miembrosVisibles.length + j
                return (
                  <Link
                    key={a.id}
                    href={a.href}
                    role="option"
                    aria-selected={seleccion === i}
                    data-seleccionada={seleccion === i}
                    className={styles.accion}
                    onClick={() => {
                      cerrar()
                      setConsulta('')
                    }}
                  >
                    <span className={styles.accionIcono} aria-hidden="true">
                      <a.icon size={16} />
                    </span>
                    <span className={styles.textos}>
                      <span className={styles.nombre}>{a.label}</span>
                      {a.hint && <span className={styles.meta}>{a.hint}</span>}
                    </span>
                  </Link>
                )
              })}
            </>
          )}

          {sinResultados && (
            <p className={styles.vacio}>
              Nada coincide con «{termino}». Prueba con el número de membresía o la cédula.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
