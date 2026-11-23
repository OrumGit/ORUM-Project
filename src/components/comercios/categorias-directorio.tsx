'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Check, ChevronLeft, ChevronRight, LayoutGrid, Search } from 'lucide-react'
import { Agitar } from '@/components/ui/agitar'
import { Button } from '@/components/ui/button'
import { IconoCategoria } from '@/components/ui/icono-categoria'
import { Input } from '@/components/ui/input'
import { Overlay } from '@/components/ui/overlay'
import { buscarCategorias, repartirTira } from '@/lib/comercios/tira-categorias'
import { HAY_ANTES, HAY_DESPUES, HOLGURA, useDesborde } from './use-desborde'
import estilos from './categorias-directorio.module.css'

/*
  LAS CATEGORÍAS  ·  a la vista, en dos filas, y una ventana con todas
  ---------------------------------------------------------------------------
  Lo comparten el directorio del Portal Público y el catálogo del Portal de
  Miembros; por eso vive en `src/components/comercios/` y no en una ruta.

  TERCERA FORMA (09/10/2026, encargo del propietario: «quiero que se vean
  directamente las categorías, con dos filas, y al final, después de unas 20
  o 30, un apartado de ver más; y se muestren todas con apartado para buscar
  directamente; que el usuario pueda desplazar»). Antes fueron una rejilla
  entera dentro del panel y luego un botón «Categorías: Todas» que abría una
  ventana: lo primero empujaba los comercios hacia abajo y lo segundo
  escondía el filtro principal detrás de un toque.

    · LA TIRA: los mismos círculos de siempre, en DOS FILAS dentro del panel.
      Si no caben a lo ancho se desplaza de lado —con el dedo, con la rueda o
      el panel táctil, y en un ordenador con las dos flechas que aparecen en
      los cantos—. El desplazamiento es el nativo del navegador (como
      `Carril`): sin gesto propio.
    · «VER MÁS», la última ficha de la tira: abre la ventana con TODAS y un
      campo para buscar por nombre. La tira enseña hasta `LIMITE_TIRA`
      (`lib/comercios/tira-categorias.ts`); una elegida que caiga después del
      corte sale igualmente, para que el filtro puesto esté siempre a la
      vista. Mientras todas quepan, la ficha dice «Ver todas»: no hay «más»,
      pero el buscador sigue a un toque.

  UNA SOLA LISTA, EN ORDEN DE LECTURA. Las dos filas son una rejilla con el
  número de columnas calculado (`--columnas`), no dos listas ni un flujo por
  columnas: así el orden del teclado y del lector es el mismo que se ve, de
  izquierda a derecha y luego abajo.

  CADA CATEGORÍA TIEMBLA AL TOCARLA, con `Agitar` —el acento de «seleccionado»
  del sistema—, en el mismo instante del toque. No tiembla al montar ni al
  apagarse.

  Las opciones siguen siendo ENLACES (el filtro vive en la URL: se comparte y
  sobrevive a un refresco) y se pueden elegir VARIAS: cada una se enciende y
  se apaga sola, con su marca de verificación; «Todas» limpia la selección.
  El toque lo resuelve el directorio al instante (`onElegir`); el `href`
  queda de respaldo sin JavaScript. La ventana no se cierra sola al elegir:
  se cierra con «Ver N comercios».
*/

export type OpcionCategoria = {
  /** `null` = «Todas». */
  id: number | null
  nombre: string
  href: string
  activa: boolean
  /** Sus subcategorías: el buscador de la ventana también las encuentra. */
  subcategorias?: string[]
}

type Props = {
  opciones: OpcionCategoria[]
  /** Enciende o apaga una categoría (`null` = «Todas»: limpia la selección). */
  onElegir: (id: number | null) => void
  /** Cuántos comercios muestra la rejilla con los filtros actuales. */
  total: number
}

/* --- La ficha de una categoría: la misma en la tira y en la ventana ------- */

function Ficha({
  opcion,
  onElegir,
}: {
  opcion: OpcionCategoria
  onElegir: (id: number | null) => void
}) {
  const { activa } = opcion
  return (
    <a
      href={opcion.href}
      className={estilos.opcion}
      data-activa={activa || undefined}
      onClick={(e) => {
        // ctrl/cmd/shift+clic: otra pestaña, con el `href` de respaldo.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        onElegir(opcion.id)
      }}
    >
      {/* El temblor va en el GLIFO, dentro del círculo, y no en el círculo:
          `Agitar` se aplica al icono, nunca a la superficie. */}
      <span className={estilos.icono} aria-hidden="true">
        <Agitar activo={activa}>
          {opcion.id === null ? (
            <LayoutGrid size={20} aria-hidden="true" />
          ) : (
            <IconoCategoria nombre={opcion.nombre} size={20} />
          )}
        </Agitar>
        {/* La marca de «elegida»: con varias a la vez, el anillo solo no
            basta para contarlas de un vistazo. */}
        {activa && opcion.id !== null && (
          <span className={estilos.marca}>
            <Check size={11} strokeWidth={3} aria-hidden="true" />
          </span>
        )}
      </span>
      <span className={estilos.nombre}>{opcion.nombre}</span>
      {/* El estado, dicho con palabras al lector de pantalla. */}
      {activa && <span className="sr-only"> (elegida)</span>}
    </a>
  )
}

/*
  «HAY MÁS FILTROS SI DESLIZAS» (12/11/2026, encargo del propietario: «pon un
  efecto para que se sepa que hay más filtros al deslizar»). La primera vez
  que la tira entra en pantalla con fichas más allá del canto, las fichas se
  ASOMAN hacia la izquierda y vuelven (`data-insinua`, solo `translate`),
  como si alguien empezara a deslizarla. Una vez por SESIÓN del navegador
  —el Inicio del socio se abre muchas veces al día y el gesto solo enseña la
  primera—, se corta si la persona toca o desliza la tira, y con movimiento
  reducido no ocurre (queda el desvanecido del canto, que ya estaba).
*/
const CLAVE_INSINUADA = 'orum:tira-categorias-insinuada'
let insinuadaEnEstaCarga = false

function yaSeInsinuo(): boolean {
  if (insinuadaEnEstaCarga) return true
  try {
    return sessionStorage.getItem(CLAVE_INSINUADA) === '1'
  } catch {
    return false
  }
}

function anotarInsinuada() {
  insinuadaEnEstaCarga = true
  try {
    sessionStorage.setItem(CLAVE_INSINUADA, '1')
  } catch {
    /* Sin almacenamiento: vale la marca de esta carga. */
  }
}

/** Con cinco fichas o menos, dos filas serían dos medias filas: va en una. */
const MINIMO_DOS_FILAS = 6

export function CategoriasDirectorio({ opciones, onElegir, total }: Props) {
  const [abierta, setAbierta] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const pistaRef = useRef<HTMLUListElement>(null)
  const desborde = useDesborde(pistaRef)
  const [insinua, setInsinua] = useState(false)

  /* El gesto de «hay más»: al entrar en pantalla, una sola vez (ver arriba). */
  useEffect(() => {
    const pista = pistaRef.current
    if (!pista || yaSeInsinuo()) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const observador = new IntersectionObserver(
      ([entrada]) => {
        if (!entrada?.isIntersecting) return
        const recorrido = pista.scrollWidth - pista.clientWidth
        // Solo si de verdad queda tira por ver hacia la derecha.
        if (recorrido <= HOLGURA || pista.scrollLeft >= recorrido - HOLGURA) return
        observador.disconnect()
        anotarInsinuada()
        setInsinua(true)
      },
      { threshold: 0.6 },
    )
    observador.observe(pista)

    // Si la persona ya está tocando o deslizando la tira, el gesto sobra.
    const cortar = () => setInsinua(false)
    pista.addEventListener('pointerdown', cortar, { passive: true })
    pista.addEventListener('wheel', cortar, { passive: true })
    return () => {
      observador.disconnect()
      pista.removeEventListener('pointerdown', cortar)
      pista.removeEventListener('wheel', cortar)
    }
  }, [])

  const { visibles, ocultas } = repartirTira(opciones)
  const fichas = visibles.length + 1 // + «Ver más»
  const columnas = fichas < MINIMO_DOS_FILAS ? fichas : Math.ceil(fichas / 2)

  const encontradas = buscarCategorias(opciones, busqueda)

  function cerrar() {
    setAbierta(false)
    setBusqueda('')
  }

  /* Casi una pantalla de tira por pulsación: lo último que se veía sigue a
     la vista. La suavidad la pone el CSS de la pista (`scroll-behavior`),
     que la retira con movimiento reducido. */
  function avanzar(sentido: 1 | -1) {
    const pista = pistaRef.current
    if (!pista) return
    pista.scrollBy({ left: sentido * pista.clientWidth * 0.8 })
  }

  return (
    <>
      <nav aria-label="Categorías" className={estilos.tira}>
        <ul
          ref={pistaRef}
          className={estilos.pista}
          data-antes={desborde & HAY_ANTES ? '' : undefined}
          data-despues={desborde & HAY_DESPUES ? '' : undefined}
          data-insinua={insinua ? '' : undefined}
          onAnimationEnd={(e) => {
            if (e.animationName.includes('insinuar')) setInsinua(false)
          }}
          style={{ '--columnas': columnas } as CSSProperties}
        >
          {visibles.map((o) => (
            <li key={o.id ?? 'todas'}>
              <Ficha opcion={o} onElegir={onElegir} />
            </li>
          ))}
          <li>
            <button
              type="button"
              className={[estilos.opcion, estilos.verMas].join(' ')}
              aria-haspopup="dialog"
              aria-expanded={abierta}
              onClick={() => setAbierta(true)}
            >
              <span className={estilos.icono} aria-hidden="true">
                <Search size={20} />
              </span>
              <span className={estilos.nombre}>{ocultas > 0 ? 'Ver más' : 'Ver todas'}</span>
              <span className="sr-only">
                {ocultas > 0 ? ` (${ocultas} categorías más, con buscador)` : ' las categorías, con buscador'}
              </span>
            </button>
          </li>
        </ul>

        {/* Las flechas: solo con ratón (el CSS las retira en táctil, donde
            se desliza con el dedo) y solo hacia donde queda tira por ver. */}
        {desborde & HAY_ANTES ? (
          <button
            type="button"
            className={[estilos.flecha, estilos.flechaAntes].join(' ')}
            aria-label="Ver las categorías anteriores"
            onClick={() => avanzar(-1)}
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
        ) : null}
        {desborde & HAY_DESPUES ? (
          <button
            type="button"
            className={[estilos.flecha, estilos.flechaDespues].join(' ')}
            aria-label="Ver más categorías"
            onClick={() => avanzar(1)}
          >
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        ) : null}
      </nav>

      <Overlay
        open={abierta}
        onClose={cerrar}
        title="Categorías"
        description="Busca una, o toca varias para ver esos comercios."
        detent="large"
        width="640px"
        footer={
          <Button
            variant="secondary"
            pildora
            fullWidth
            className={estilos.botonVer}
            onClick={cerrar}
          >
            {total === 1 ? 'Ver 1 comercio' : `Ver ${total} comercios`}
          </Button>
        }
      >
        <div className={estilos.ventana}>
          <Input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            startIcon={<Search size={18} />}
            placeholder="Buscar categoría"
            aria-label="Buscar categoría"
            autoComplete="off"
            enterKeyHint="search"
          />

          {/* Lo que cambia al teclear, dicho al lector de pantalla. */}
          <p className="sr-only" aria-live="polite">
            {busqueda.trim() === ''
              ? ''
              : encontradas.length === 1
                ? '1 categoría encontrada'
                : `${encontradas.length} categorías encontradas`}
          </p>

          {encontradas.length > 0 ? (
            <nav aria-label="Todas las categorías">
              <ul className={estilos.rejilla}>
                {encontradas.map((o) => (
                  <li key={o.id ?? 'todas'}>
                    <Ficha opcion={o} onElegir={onElegir} />
                  </li>
                ))}
              </ul>
            </nav>
          ) : (
            <p className={estilos.sinResultados}>
              Ninguna categoría coincide con «{busqueda.trim()}».
            </p>
          )}
        </div>
      </Overlay>
    </>
  )
}
