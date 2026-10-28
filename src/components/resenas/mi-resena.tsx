'use client'

import { useRef, useState, useTransition } from 'react'
import { PenLine, Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { EstrellasAccion } from '@/components/ui/estrellas'
import { AdornoEstrella } from '@/components/ui/marca/marca'
import { Modal } from '@/components/ui/modal'
import { Overlay } from '@/components/ui/overlay'
import { borrarMiResena } from '@/app/miembros/(portal)/comercios/resenas-actions'
import { FORMULARIO_RESENA_ID, FormularioResena } from './formulario-resena'
import { TarjetaResena } from './tarjeta-resena'
import { ZonaAviso } from './zona-aviso'
import estilos from './resenas.module.css'

/*
  LO DEL SOCIO EN LA SECCIÓN DE RESEÑAS  ·  cliente (rediseño 29/10/2026)
  ---------------------------------------------------------------------------
  Tres caras, siempre en una tarjeta blanca con su sombra (nunca el crema):

    · Puede calificar y aún no lo hizo → «¿Cómo te fue en Café X?» con las
      cinco estrellas A LA VISTA. Tocar una abre la ventana con esa nota ya
      puesta: el gesto de calificar es el mismo que el de empezar, un clic
      menos que el botón «Escribir reseña» de antes.
    · Ya la escribió → «Tu reseña» con «Editar» y «Borrar» en su cabecera y
      la reseña debajo, con el mismo aspecto que las de los demás.
    · No puede calificar (sin compra o sin membresía vigente) y no tiene
      reseña → una línea discreta que dice cuándo podrá.

  «Borrar» se ofrece aunque `puedeResenar` sea falso: el socio con la
  membresía vencida puede quitar la suya (spec).

  Un `role="status"` (`ZonaAviso`) dice en voz alta y a la vista qué pasó:
  la ventana se cierra al guardar y, sin ese aviso, un lector de pantalla no
  se enteraría. Tras borrar, el botón pulsado ya no existe: el foco va a esa
  zona cuando la confirmación YA cerró (`enfocarTrasCerrar`).

  ── Por qué la confirmación no lleva `title` ────────────────────────────────
  `Modal` nombra su título con un id fijo (`modal-titulo`) y las dos ventanas
  viven montadas a la vez (un `<dialog>` cerrado sigue en el DOM): con dos
  títulos, la confirmación se habría llamado como la ventana del formulario.
  Lleva `ariaLabel` y pinta su pregunta dentro.
*/

type ResenaPropia = {
  estrellas: number
  mensaje: string | null
  fecha: string
  respuestaComercio: string | null
  respuestaAdmin: string | null
}

type Props = {
  comercioId: number
  comercioNombre?: string
  puedeResenar: boolean
  resena: ResenaPropia | null
  /** Nadie ha reseñado aún: la invitación lo dice. */
  primera?: boolean
}

export function MiResena({ comercioId, comercioNombre, puedeResenar, resena, primera = false }: Props) {
  const [abierto, setAbierto] = useState(false)
  /** Cada apertura monta el formulario de nuevo: arranca de lo guardado. */
  const [vez, setVez] = useState(0)
  /** La nota que se tocó en la invitación (reseña nueva). */
  const [notaInicial, setNotaInicial] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)

  const [confirmando, setConfirmando] = useState(false)
  const [errorBorrar, setErrorBorrar] = useState<string | null>(null)
  const [borrando, iniciarBorrado] = useTransition()

  const [aviso, setAviso] = useState('')
  const zonaRef = useRef<HTMLDivElement>(null)
  const enfocarAlCerrar = useRef(false)

  const editando = resena !== null

  function abrir(nota: number | null = null) {
    setAviso('')
    setNotaInicial(nota)
    setVez((n) => n + 1)
    setAbierto(true)
  }

  function alGuardar() {
    setAbierto(false)
    setAviso(editando ? 'Tu reseña quedó actualizada.' : 'Tu reseña quedó publicada. ¡Gracias!')
  }

  function enfocarTrasCerrar() {
    if (!enfocarAlCerrar.current) return
    enfocarAlCerrar.current = false
    zonaRef.current?.focus()
  }

  function borrar() {
    const datos = new FormData()
    datos.set('comercio_id', String(comercioId))
    setErrorBorrar(null)
    iniciarBorrado(async () => {
      try {
        const r = await borrarMiResena({}, datos)
        if (!r) return
        if (r.error) {
          setErrorBorrar(r.error)
          return
        }
        enfocarAlCerrar.current = true
        setConfirmando(false)
        setAviso('Borraste tu reseña.')
      } catch {
        setErrorBorrar('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.')
      }
    })
  }

  return (
    <div className={estilos.mia}>
      {/* Siempre montada: ver `ZonaAviso`. */}
      <ZonaAviso aviso={aviso} zonaRef={zonaRef} />

      {resena ? (
        <div className={estilos.panelSocio}>
          <div className={estilos.panelCabeza}>
            <p className={estilos.panelEtiqueta}>
              <AdornoEstrella />
              Tu reseña
            </p>
            <div className={estilos.panelAcciones}>
              {puedeResenar && (
                <Button variant="ghost" size="sm" icon={<PenLine size={15} />} onClick={() => abrir()}>
                  Editar
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={15} />}
                onClick={() => {
                  setErrorBorrar(null)
                  setConfirmando(true)
                }}
              >
                Borrar
              </Button>
            </div>
          </div>
          <TarjetaResena autor="Tú" {...resena} />
        </div>
      ) : puedeResenar ? (
        <div className={estilos.panelSocio}>
          <p className={estilos.invitarPregunta}>
            {comercioNombre ? `¿Cómo te fue en ${comercioNombre}?` : '¿Cómo te fue?'}
          </p>
          <EstrellasAccion onElegir={(n) => abrir(n)} />
          <p className={estilos.invitarAyuda}>
            {primera
              ? 'Toca una estrella y sé el primero en contarlo.'
              : 'Toca una estrella para calificar. Tu opinión ayuda a otros socios.'}
          </p>
        </div>
      ) : (
        <p className={estilos.nota}>Podrás calificar este comercio cuando uses tu beneficio aquí.</p>
      )}

      {puedeResenar && (
        <Overlay
          open={abierto}
          onClose={() => setAbierto(false)}
          title={editando ? 'Editar tu reseña' : 'Escribe tu reseña'}
          description={
            comercioNombre
              ? `Cuéntales a otros socios cómo te fue en ${comercioNombre}.`
              : 'Cuéntales a otros socios cómo te fue.'
          }
          width="520px"
          detent="large"
          footer={
            <>
              <Button variant="secondary" onClick={() => setAbierto(false)} disabled={guardando}>
                Cancelar
              </Button>
              <Button type="submit" form={FORMULARIO_RESENA_ID} loading={guardando}>
                {editando ? 'Guardar cambios' : 'Publicar reseña'}
              </Button>
            </>
          }
        >
          <FormularioResena
            key={vez}
            comercioId={comercioId}
            inicial={
              resena
                ? { estrellas: resena.estrellas, mensaje: resena.mensaje }
                : notaInicial
                  ? { estrellas: notaInicial, mensaje: null }
                  : null
            }
            onGuardada={alGuardar}
            onPendiente={setGuardando}
          />
        </Overlay>
      )}

      {/* Siempre montada: al borrar, la tarjeta desaparece con la respuesta
          del servidor y la ventana tiene que poder cerrarse animada. */}
      <Modal
        open={confirmando}
        onClose={() => {
          if (!borrando) setConfirmando(false)
        }}
        ariaLabel="¿Borrar tu reseña?"
        onClosed={enfocarTrasCerrar}
        width="420px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmando(false)} disabled={borrando}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={borrar} loading={borrando}>
              Borrar reseña
            </Button>
          </>
        }
      >
        <div className={estilos.confirmar}>
          <p className={estilos.confirmarTitulo}>¿Borrar tu reseña?</p>
          <p className={estilos.confirmarTexto}>
            Se borran tus estrellas, tu mensaje y las respuestas que tenga. Podrás escribir otra
            después.
          </p>
          {errorBorrar && <Alert tone="danger">{errorBorrar}</Alert>}
        </div>
      </Modal>
    </div>
  )
}
