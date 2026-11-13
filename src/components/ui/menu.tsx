'use client'

import Link from 'next/link'
import { Check } from 'lucide-react'
import { useCallback, useEffect, useId, useRef, type ReactElement, type ReactNode } from 'react'
import styles from './menu.module.css'

/*
  Construido sobre la API nativa de popover. Aporta capa superior (el menú no
  lo recorta el overflow de una fila de tabla), cierre al pulsar fuera y
  cierre con Escape, sin librería de posicionamiento ni gestión de z-index.

  Lo único que queda por hacer a mano es colocar el menú y navegarlo con el
  teclado.
*/

/**
 * ¿Se ve el disparador? No basta con mirar la ventana: dentro de un
 * formulario que desplaza en su propio diálogo (el de aliados), el botón
 * sale por arriba del diálogo pero sigue «dentro de la pantalla», y el menú
 * lo seguía hasta quedar flotando sobre otra cosa. Se intersecta su caja con
 * la de cada ancestro que recorta (`overflow` distinto de `visible`).
 */
function disparadorVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect()
  let arriba = 0
  let abajo = window.innerHeight
  let izquierda = 0
  let derecha = window.innerWidth
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(p)
    if (overflowX === 'visible' && overflowY === 'visible') continue
    const c = p.getBoundingClientRect()
    arriba = Math.max(arriba, c.top)
    abajo = Math.min(abajo, c.bottom)
    izquierda = Math.max(izquierda, c.left)
    derecha = Math.min(derecha, c.right)
  }
  return r.bottom > arriba && r.top < abajo && r.right > izquierda && r.left < derecha
}

const MARGEN = 6 // separación entre disparador y menú, en px
const BORDE = 8 // margen mínimo respecto al borde de la ventana

/*
  Qué cuenta como opción navegable con flechas. Incluye `menuitemradio` porque
  una opción de un grupo excluyente —el tema— sigue siendo una fila del menú:
  si el selector solo mirase `menuitem`, las flechas la saltarían y el foco
  inicial al abrir caería en otra parte.
*/
const SELECTOR_OPCIONES =
  '[role="menuitem"]:not(:disabled), [role="menuitemradio"]:not(:disabled)'

type DropdownMenuProps = {
  /** Elemento que abre el menú. Recibe los atributos de popover. */
  trigger: ReactElement<Record<string, unknown>>
  /** Alineación horizontal respecto al disparador. */
  align?: 'start' | 'end'
  /**
   * El menú mide, como mínimo, lo que su disparador. Para cuando el
   * disparador es un CAMPO (`SelectMenu`): una lista más estrecha que el
   * campo del que cuelga se lee como un menú suelto, no como su desplegable.
   */
  igualarAncho?: boolean
  /**
   * `dialogo`: lo que se abre no es una lista sino un panel con su propio
   * teclado —el calendario de `SelectorFecha`—. Es `role="dialog"` con
   * `etiqueta`, las flechas no saltan entre opciones y el foco inicial lo
   * pone quien lo usa. La capa, la posición, el seguimiento y la animación
   * son los mismos.
   */
  como?: 'menu' | 'dialogo'
  /** Nombre accesible del panel, con `como="dialogo"`. */
  etiqueta?: string
  /** Clase extra para el panel (su ancho, por ejemplo). */
  className?: string
  /** Avisa al abrirse y al cerrarse. */
  onAlternar?: (abierto: boolean) => void
  children: ReactNode
}

export function DropdownMenu({
  trigger,
  align = 'end',
  igualarAncho = false,
  como = 'menu',
  etiqueta,
  className,
  onAlternar,
  children,
}: DropdownMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const disparadorRef = useRef<HTMLSpanElement>(null)
  const id = useId()

  /** Coloca el menú y ancla el origen de la animación en el disparador. */
  const colocar = useCallback(() => {
    const menu = menuRef.current
    const ancla = disparadorRef.current?.firstElementChild as HTMLElement | undefined
    if (!menu || !ancla) return

    const r = ancla.getBoundingClientRect()
    // Antes de medir: el ancho mínimo cambia el `offsetWidth` de abajo.
    if (igualarAncho) menu.style.minWidth = `${r.width}px`
    const { offsetWidth: ancho, offsetHeight: alto } = menu
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Vertical: debajo por defecto; arriba si abajo no cabe y arriba sí.
    const cabeDebajo = r.bottom + MARGEN + alto <= vh - BORDE
    const cabeArriba = r.top - MARGEN - alto >= BORDE
    const arriba = !cabeDebajo && cabeArriba

    const top = arriba ? r.top - MARGEN - alto : r.bottom + MARGEN

    // Horizontal: alineado al borde pedido, corrigiendo si se sale.
    let left = align === 'end' ? r.right - ancho : r.left
    left = Math.min(Math.max(BORDE, left), vw - ancho - BORDE)

    menu.style.top = `${Math.min(Math.max(BORDE, top), vh - alto - BORDE)}px`
    menu.style.left = `${left}px`

    // El menú escala desde la esquina del botón que lo abrió, no desde su
    // propio centro: así se ve de dónde salió.
    const origenX = align === 'end' ? `${r.right - left}px` : `${r.left - left}px`
    menu.style.transformOrigin = `${origenX} ${arriba ? 'bottom' : 'top'}`
    menu.style.setProperty('--desplazamiento-entrada', arriba ? '4px' : '-4px')
  }, [align, igualarAncho])

  /*
    EL MENÚ SIGUE A SU BOTÓN (bug del 30/09/2026: «cuando las activo y me
    muevo se separan y se mueven por toda la página»).

    El menú es `position: fixed` en la capa superior, así que no se desplaza
    con la página: antes se colocaba UNA vez al abrir y, al hacer scroll, se
    quedaba quieto mientras el botón se iba. Ahora, mientras está abierto, se
    recoloca en cada desplazamiento —de la página o de cualquier contenedor,
    por eso en fase de captura— y en cada cambio de tamaño, como mucho una
    vez por fotograma. Si el botón deja de VERSE —fuera de la pantalla o
    tapado por el borde del contenedor que desplaza—, el menú se cierra:
    flotando sin su botón, no se sabría de qué es.
  */
  const dejarDeSeguir = useRef<(() => void) | null>(null)

  const seguirAlDisparador = useCallback(() => {
    let marco = 0
    const alMoverse = () => {
      if (marco) return
      marco = requestAnimationFrame(() => {
        marco = 0
        const ancla = disparadorRef.current?.firstElementChild as HTMLElement | undefined
        if (!ancla) return
        if (!disparadorVisible(ancla)) {
          menuRef.current?.hidePopover()
          return
        }
        colocar()
      })
    }
    window.addEventListener('scroll', alMoverse, { capture: true, passive: true })
    window.addEventListener('resize', alMoverse, { passive: true })
    /* Y cuando el propio panel cambia de tamaño: un contenido que se pinta
       después de abrir (el mes de `SelectorFecha`) lo agranda, y colocado
       con la medida vieja se salía de la pantalla en el teléfono. */
    const observador = new ResizeObserver(alMoverse)
    if (menuRef.current) observador.observe(menuRef.current)
    return () => {
      cancelAnimationFrame(marco)
      observador.disconnect()
      window.removeEventListener('scroll', alMoverse, { capture: true })
      window.removeEventListener('resize', alMoverse)
    }
  }, [colocar])

  // Si el menú se desmonta abierto (navegación), se sueltan los escuchadores.
  useEffect(() => () => dejarDeSeguir.current?.(), [])

  const alAlternar = (e: React.SyntheticEvent<HTMLDivElement>) => {
    const evento = e.nativeEvent as ToggleEvent
    dejarDeSeguir.current?.()
    dejarDeSeguir.current = null
    onAlternar?.(evento.newState === 'open')
    if (evento.newState !== 'open') return

    colocar()
    dejarDeSeguir.current = seguirAlDisparador()
    // Enfocar el primer elemento deja el menú listo para el teclado. Un
    // diálogo pone su propio foco (el día elegido, en el calendario).
    if (como === 'menu') menuRef.current?.querySelector<HTMLElement>(SELECTOR_OPCIONES)?.focus()
  }

  /** Navegación con flechas, Inicio y Fin dentro del menú. */
  const alPulsarTecla = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const opciones = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(SELECTOR_OPCIONES) ?? [],
    )
    if (opciones.length === 0) return

    const actual = opciones.indexOf(document.activeElement as HTMLElement)
    let siguiente: number | null = null

    if (e.key === 'ArrowDown') siguiente = (actual + 1) % opciones.length
    else if (e.key === 'ArrowUp')
      siguiente = (actual - 1 + opciones.length) % opciones.length
    else if (e.key === 'Home') siguiente = 0
    else if (e.key === 'End') siguiente = opciones.length - 1

    if (siguiente !== null) {
      e.preventDefault()
      opciones[siguiente].focus()
    }
  }

  /*
    ⚠️ NADA DE `cloneElement` AQUÍ, y esto es un bug pagado, no una preferencia.

    `trigger` y los hijos de este menú los crea casi siempre un SERVER
    COMPONENT —el layout del portal, el del panel, el de comercios— y viajan
    hasta aquí por la frontera RSC. Un elemento que ha cruzado esa frontera
    llega serializado: su `type` es una referencia perezosa al módulo de
    cliente, no la función. `cloneElement` sobre eso devuelve un elemento cuyo
    tipo React no sabe resolver, y el resultado es

      «Element type is invalid: expected a string … but got: undefined»

    …con un rastro que Next oculta entero (`at ignore-listed frames`), en la
    petición del servidor, y por tanto un 500 en CUALQUIER pantalla que monte
    este menú. Tipaba, compilaba, pasaba lint y pasaba `next build`, porque el
    fallo solo existe al renderizar con datos reales.

    El atributo se pone sobre el nodo ya montado, con una ref de callback. La
    ref hace dos trabajos —guardar el nodo para `colocar()` y estampar el
    atributo— porque son el mismo momento y separarlos daría dos refs sobre el
    mismo elemento.
  */
  const anclarDisparador = useCallback(
    (nodo: HTMLSpanElement | null) => {
      disparadorRef.current = nodo
      const boton = nodo?.firstElementChild
      if (boton instanceof HTMLElement) boton.setAttribute('popovertarget', id)
    },
    [id],
  )

  return (
    <>
      <span ref={anclarDisparador} className={styles.disparador}>
        {trigger}
      </span>

      <div
        ref={menuRef}
        id={id}
        popover="auto"
        className={[styles.menu, className].filter(Boolean).join(' ')}
        role={como === 'menu' ? 'menu' : 'dialog'}
        aria-label={como === 'dialogo' ? etiqueta : undefined}
        onToggle={alAlternar}
        onKeyDown={como === 'menu' ? alPulsarTecla : undefined}
      >
        {/*
          Los hijos se pintan TAL CUAL. El retardo escalonado lo resuelve
          `menu.module.css` con `nth-child`, por la misma razón que el
          disparador no se clona: estos hijos también cruzan la frontera RSC
          —`MenuItem`, `MenuSeparator`, `MenuTema` los monta el layout del
          servidor— y clonarlos rompía el menú entero.

          Además es lo que ya hace `layout.module.css` para `Stack` y `Grid`:
          escalonar con `nth-child` funciona con cualquier hijo sin tocarlo.
        */}
        {children}
      </div>
    </>
  )
}

/* ========================================================================== */

type MenuItemProps = {
  onSelect?: () => void
  /**
   * Navega en lugar de ejecutar. Renderiza un `<Link>` real: un `<a>` dentro
   * de un `<button>` sería HTML inválido y no navegaría.
   */
  href?: string
  /**
   * Envía el `<form>` que contiene al menú en lugar de ejecutar `onSelect`.
   * Para server actions —cerrar sesión, por ejemplo—: así la acción sigue
   * funcionando sin JavaScript, que es justo cuando más importa poder salir.
   */
  submit?: boolean
  icon?: ReactNode
  /**
   * Opción elegida dentro de un grupo excluyente (el tema, por ejemplo).
   *
   * Cuando se pasa —incluso `false`— el elemento deja de ser `menuitem` y pasa
   * a `menuitemradio` con `aria-checked`: es lo que le dice al lector de
   * pantalla que hay una elección y cuál está activa. El check visible es el
   * segundo portador; sin él la única señal sería el estado ARIA, invisible.
   */
  selected?: boolean
  /** Rojo. Reserva `true` para acciones que borran o revocan. */
  destructive?: boolean
  disabled?: boolean
  /**
   * Con `href`: `false` navega sin subir al principio de la página (los
   * filtros del directorio: cambiar de ciudad no puede mandarte arriba).
   */
  scroll?: boolean
  children: ReactNode
}

export function MenuItem({
  onSelect,
  href,
  scroll,
  submit = false,
  icon,
  selected,
  destructive = false,
  disabled = false,
  children,
}: MenuItemProps) {
  const clase = [styles.item, destructive && styles.destructivo]
    .filter(Boolean)
    .join(' ')

  /** Cierra el popover contenedor sin necesidad de estado en React. */
  const cerrarMenu = (elemento: HTMLElement) => {
    elemento.closest<HTMLElement>('[popover]')?.hidePopover()
  }

  const excluyente = selected !== undefined

  const contenido = (
    <>
      {icon && <span className={styles.itemIcono}>{icon}</span>}
      {children}
      {/* Decorativo: quien lo necesita ya lo tiene en `aria-checked`. */}
      {selected && (
        <span className={styles.itemMarca} aria-hidden="true">
          <Check size={15} />
        </span>
      )}
    </>
  )

  if (href && !disabled) {
    /*
      Un enlace también puede ser la opción de un grupo excluyente: la ciudad
      o el orden del directorio público, donde cada opción NAVEGA (el filtro
      vive en la URL) y a la vez una de ellas es la elegida. `menuitemradio`
      sobre un `<a>` es ARIA válido y el lector anuncia «marcado» igual.
    */
    return (
      <Link
        href={href}
        scroll={scroll}
        role={excluyente ? 'menuitemradio' : 'menuitem'}
        aria-checked={excluyente ? selected : undefined}
        className={clase}
        onClick={(e) => {
          cerrarMenu(e.currentTarget)
          /*
            Con `onSelect`, el enlace es el RESPALDO sin JavaScript y la
            acción la resuelve quien lo usa (el directorio filtra en el
            cliente, sin ir al servidor). Se respetan ctrl/cmd/shift+clic:
            quien los usa quiere otra pestaña.
          */
          if (!onSelect || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
          e.preventDefault()
          onSelect()
        }}
      >
        {contenido}
      </Link>
    )
  }

  return (
    <button
      type={submit ? 'submit' : 'button'}
      role={excluyente ? 'menuitemradio' : 'menuitem'}
      aria-checked={excluyente ? selected : undefined}
      className={clase}
      disabled={disabled}
      onClick={(e) => {
        onSelect?.()
        cerrarMenu(e.currentTarget)
      }}
    >
      {contenido}
    </button>
  )
}

export function MenuSeparator() {
  return <hr className={styles.separador} />
}

/**
 * Encabezado de un grupo de opciones.
 *
 * El `id` es opcional y existe para poder referenciarlo desde el
 * `aria-labelledby` de un `role="group"`: así el lector anuncia "Tema, Claro,
 * marcado" en vez de solo "Claro, marcado", sin repetir el texto en un
 * `aria-label` que podría desincronizarse del visible.
 */
export function MenuLabel({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <div id={id} className={styles.etiquetaGrupo}>
      {children}
    </div>
  )
}
