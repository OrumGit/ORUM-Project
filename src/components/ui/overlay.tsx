'use client'

import type { ReactNode } from 'react'
import { ESCRITORIO, useMediaQuery } from '@/components/use-media-query'
import { Modal } from './modal'
import { Sheet, type Detent } from './sheet'

/**
 * Contenido que aparece POR ENCIMA, con dos caras según el dispositivo.
 *
 * - **Escritorio:** diálogo centrado. Hay ratón y espacio de sobra; el centro
 *   de la pantalla es donde mira el ojo tras hacer clic.
 * - **Móvil:** hoja inferior con detents. Nace en la zona del pulgar, se
 *   arrastra y se descarta con un gesto, y deja ver el fondo.
 *
 * No son dos componentes: es uno con dos presentaciones. Quien lo usa escribe
 * el contenido una vez y no piensa en el dispositivo.
 *
 * Existe para no navegar. Un formulario de dos campos no merece una página
 * entera: sacaba al usuario de su contexto, perdía la posición de scroll de la
 * lista y costaba dos navegaciones (ir y volver) en lugar de cero.
 */

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  /**
   * Nombre accesible cuando la pantalla NO pasa `title` — el caso de la ficha
   * de comercio, que trae su propio `h1` dentro del contenido. Ese `h1` no
   * nombra al `<dialog>`: el rol de diálogo lo tiene el elemento, no lo que
   * hay dentro.
   */
  ariaLabel?: string
  /** La cabecera propia (pasos del registro), a la izquierda de la X. */
  encabezado?: ReactNode
  footer?: ReactNode
  /** Ancho del diálogo en escritorio. */
  width?: string
  /**
   * Altura inicial de la hoja en móvil. Según la HIG: `medium` cuando el
   * contenido cabe y conviene seguir viendo el fondo; `large` cuando solo es
   * útil a pantalla completa.
   */
  detent?: Detent
  /**
   * El contenido ES la superficie (ver `Modal desnudo`). Siempre diálogo
   * centrado, también en móvil: una tarjeta que pinta su propio fondo y su
   * propia X no cabe en la gramática de la hoja inferior.
   */
  desnudo?: boolean
  /**
   * Ya había una ventana abierta en su lugar (la de carga): aparece en su
   * sitio, sin animar la entrada. Ver `continuidad-ventana.ts`.
   */
  continua?: boolean
  children?: ReactNode
}

export function Overlay({
  open,
  onClose,
  title,
  description,
  ariaLabel,
  encabezado,
  footer,
  width,
  detent = 'large',
  desnudo = false,
  continua = false,
  children,
}: Props) {
  const enEscritorio = useMediaQuery(ESCRITORIO)

  if (desnudo) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        ariaLabel={ariaLabel}
        width={width}
        desnudo
        sinEntrada={continua}
      >
        {children}
      </Modal>
    )
  }

  if (enEscritorio) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title={title}
        description={description}
        ariaLabel={ariaLabel}
        encabezado={encabezado}
        footer={footer}
        width={width}
        sinEntrada={continua}
      >
        {children}
      </Modal>
    )
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      ariaLabel={ariaLabel}
      encabezado={encabezado}
      footer={footer}
      detent={detent}
      sinEntrada={continua}
    >
      {children}
    </Sheet>
  )
}
