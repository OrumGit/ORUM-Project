'use client'

import { useRef, useState, useTransition } from 'react'
import { ArrowLeft, ArrowRight, Eye, EyeOff, ImagePlus, Pencil, Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ConfirmDialog, Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import {
  EditorEncuadre,
  useImagenElegida,
  type OpcionesEncuadre,
} from '@/components/imagenes/editor-encuadre'
import { ESTADO_SUBIDA_INICIAL, type EstadoSubida } from '@/lib/imagenes/estado'
import {
  DESCRIPCION_MAXIMA,
  TOPE_PUBLICIDAD,
  type PiezaPublicidad,
} from '@/lib/publicidad/publicidad'
import {
  cambiarVisibilidadPublicidad,
  guardarPublicidad,
  moverPublicidad,
  quitarPublicidad,
} from '../actions'
import styles from './gestor-portada.module.css'

/*
  EL GESTOR DE PUBLICIDAD  ·  las imágenes del carrusel de la portada
  ---------------------------------------------------------------------------
  Encargo del propietario (13/10/2026): «construye esa lógica y añade el
  apartado en el portal de administrador, con todas las facilidades de
  acomodación y manipulación de imágenes para que pueda editarlas,
  acomodarlas y demás».

  LA REJILLA: cada imagen en el orden en que sale en la portada, con lo que
  se le puede hacer a la vista —moverla antes o después, ocultarla sin
  borrarla, editarla y quitarla— y el hueco para añadir mientras queden
  cupos. Las acciones van DEBAJO de la imagen y con su nombre accesible: es
  una herramienta de trabajo, no una galería.

  EL AJUSTE, EN UNA VENTANA ENCIMA («un formulario no navega»): el mismo
  editor de «Mi negocio» y de la foto del socio (`EditorEncuadre`) —arrastrar,
  acercar, girar, restablecer—, con el marco en 4:3, que es EXACTAMENTE la
  proporción del carrusel en la portada: lo que se encuadra aquí es lo que
  se ve allí. «Editar» abre la imagen que ya está, no el selector de
  archivos; desde el editor, «Elegir otra» la reemplaza.

  MOVER ES CON BOTONES, no arrastrando: funcionan igual con ratón, con el
  dedo y con teclado, y con diez imágenes como mucho un puesto por pulsación
  alcanza.

  EL ARCHIVO SE LLAMA `gestor-portada` Y NO `gestor-publicidad`: el nombre
  de un módulo CSS acaba dentro de sus clases, y los bloqueadores de
  anuncios ocultan lo que lleve «publicidad» en la clase o en la dirección
  (ver `rutaPublicidad`).

  Las acciones se llaman directamente dentro de una transición (como en «Mi
  negocio»): al terminar, la acción revalida la página y las imágenes nuevas
  llegan por las props.
*/

/* 4:3, la proporción del carrusel (`que-es-orum.module.css`). 1600 px se ven
   nítidas en una pantalla grande; 700 KB quedan por debajo del megabyte que
   admiten el bucket y el cuerpo de una server action. */
const OPCIONES_IMAGEN: OpcionesEncuadre = {
  proporcion: 3 / 4,
  forma: 'rectangulo',
  // Se puede poner ENTERA, sin recortar (23/10/2026); arranca así.
  completa: true,
  anchoSalida: 1600,
  pesoMaximo: 700 * 1024,
}

/** Qué se está ajustando: una pieza que ya existe (`id`) o una nueva (`null`). */
type Objetivo = { id: number | null }

type Accion = (previo: EstadoSubida, datos: FormData) => Promise<EstadoSubida>

export function GestorPublicidad({ piezas }: { piezas: PiezaPublicidad[] }) {
  const {
    imagen,
    abriendo,
    error: errorImagen,
    falloLaActual,
    elegir,
    abrirActual,
    soltar,
  } = useImagenElegida()
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [porQuitar, setPorQuitar] = useState<PiezaPublicidad | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, enTransicion] = useTransition()
  const entrada = useRef<HTMLInputElement>(null)

  const ajustando = imagen !== null && objetivo !== null
  const cupos = Math.max(0, TOPE_PUBLICIDAD - piezas.length)
  const visibles = piezas.filter((p) => p.activa).length
  const bloqueado = ocupado || abriendo

  /** AÑADIR: abre el selector de archivos. */
  function pedir() {
    setError(null)
    setObjetivo({ id: null })
    setDescripcion('')
    entrada.current?.click()
  }

  /** EDITAR: abre en el editor la imagen que ya está publicada. */
  function editar(pieza: PiezaPublicidad) {
    setError(null)
    setObjetivo({ id: pieza.id })
    setDescripcion(pieza.descripcion)
    void abrirActual(pieza.url)
  }

  /** Cierra el ajuste sin guardar (y anula lo que se estuviera abriendo). */
  function dejarDeAjustar() {
    soltar()
    setObjetivo(null)
    setError(null)
  }

  /** Sube la imagen ya encuadrada. */
  function subir(archivo: File) {
    if (!objetivo) return
    const datos = new FormData()
    datos.set('archivo', archivo)
    datos.set('descripcion', descripcion)
    if (objetivo.id !== null) datos.set('id', String(objetivo.id))

    setError(null)
    enTransicion(async () => {
      const resultado = await guardarPublicidad(ESTADO_SUBIDA_INICIAL, datos)
      if (resultado.ok) {
        soltar()
        setObjetivo(null)
      } else {
        setError(resultado.error ?? 'No se pudo guardar la imagen. Inténtalo de nuevo.')
      }
    })
  }

  /** Una acción de un toque sobre una pieza: mover, ocultar, mostrar. */
  function ejecutar(accion: Accion, campos: Record<string, string>, aviso: string) {
    const datos = new FormData()
    for (const [clave, valor] of Object.entries(campos)) datos.set(clave, valor)

    setError(null)
    enTransicion(async () => {
      const resultado = await accion(ESTADO_SUBIDA_INICIAL, datos)
      if (!resultado.ok) setError(resultado.error ?? aviso)
    })
  }

  function quitar() {
    const pieza = porQuitar
    if (!pieza) return
    const datos = new FormData()
    datos.set('id', String(pieza.id))

    setError(null)
    enTransicion(async () => {
      const resultado = await quitarPublicidad(ESTADO_SUBIDA_INICIAL, datos)
      setPorQuitar(null)
      if (!resultado.ok) setError(resultado.error ?? 'No se pudo quitar la imagen.')
    })
  }

  const aviso = error ?? errorImagen

  return (
    <section className={styles.gestor} aria-label="Imágenes del carrusel">
      {/* El selector real, oculto: lo abren «Añadir» y «Elegir otra».
          `accept` amplio a propósito: cualquier imagen que el navegador sepa
          abrir se convierte a JPEG al guardar. */}
      <input
        ref={entrada}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          elegir(e.target.files?.[0])
          // Elegir dos veces el mismo archivo tiene que volver a disparar.
          e.target.value = ''
        }}
      />

      <div className={styles.cabeza}>
        {/* El recuento, en texto: ni el tope ni cuántas están ocultas se
            adivinan mirando la rejilla. */}
        <p className={styles.recuento} aria-live="polite">
          {piezas.length} de {TOPE_PUBLICIDAD}
          {piezas.length > 0 && (
            <span className={styles.recuentoNota}>
              {' · '}
              {visibles === piezas.length
                ? 'todas a la vista'
                : `${visibles} a la vista, ${piezas.length - visibles} ${
                    piezas.length - visibles === 1 ? 'oculta' : 'ocultas'
                  }`}
            </span>
          )}
        </p>
        <Button
          variant="brand"
          icon={<ImagePlus size={16} aria-hidden="true" />}
          onClick={pedir}
          disabled={bloqueado || cupos === 0}
          loading={abriendo && objetivo?.id === null}
        >
          Añadir imagen
        </Button>
      </div>

      {aviso && !ajustando && (
        <Alert
          key={aviso}
          tone="danger"
          /* Si no se pudo abrir la publicada, queda reemplazarla por un archivo. */
          actions={
            falloLaActual &&
            objetivo && (
              <Button variant="secondary" size="sm" onClick={() => entrada.current?.click()}>
                Elegir un archivo
              </Button>
            )
          }
        >
          {aviso}
        </Alert>
      )}

      {piezas.length === 0 ? (
        <div className={styles.vacio}>
          <p className={styles.vacioTitulo}>Aún no hay imágenes</p>
          <p className={styles.vacioTexto}>
            Sin imágenes, la portada no enseña el carrusel y el texto ocupa todo el ancho. Añade
            la primera: puede ser un anuncio, una promoción o una foto del club.
          </p>
        </div>
      ) : (
        <ol className={styles.rejilla}>
          {piezas.map((pieza, i) => {
            const nombre = `la imagen ${i + 1}`
            return (
              <li key={pieza.id} className={styles.teja} data-oculta={!pieza.activa || undefined}>
                <div className={styles.marco}>
                  {/* `<img>` y no `next/image`: la URL es de Storage. El texto
                      alternativo es la descripción que escribió el admin. */}
                  {/* eslint-disable-next-line @next/next/no-img-element -- URL de Storage, no un asset local */}
                  <img
                    src={pieza.url}
                    alt={pieza.descripcion}
                    className={styles.foto}
                    loading="lazy"
                    decoding="async"
                  />
                  <span className={styles.puesto} aria-hidden="true">
                    {i + 1}
                  </span>
                  {/* El estado, con icono y palabra: no solo con la foto atenuada. */}
                  {!pieza.activa && (
                    <span className={styles.insignia}>
                      <EyeOff size={12} aria-hidden="true" />
                      Oculta
                    </span>
                  )}
                </div>

                <p className={styles.descripcion} data-vacia={!pieza.descripcion || undefined}>
                  {pieza.descripcion || 'Sin descripción'}
                </p>

                <div className={styles.acciones}>
                  <BotonTeja
                    etiqueta={`Mover ${nombre} antes`}
                    deshabilitado={bloqueado || i === 0}
                    onClick={() =>
                      ejecutar(
                        moverPublicidad,
                        { id: String(pieza.id), sentido: '-1' },
                        'No se pudo mover la imagen.',
                      )
                    }
                  >
                    <ArrowLeft size={16} aria-hidden="true" />
                  </BotonTeja>
                  <BotonTeja
                    etiqueta={`Mover ${nombre} después`}
                    deshabilitado={bloqueado || i === piezas.length - 1}
                    onClick={() =>
                      ejecutar(
                        moverPublicidad,
                        { id: String(pieza.id), sentido: '1' },
                        'No se pudo mover la imagen.',
                      )
                    }
                  >
                    <ArrowRight size={16} aria-hidden="true" />
                  </BotonTeja>

                  <span className={styles.separador} aria-hidden="true" />

                  <BotonTeja
                    etiqueta={pieza.activa ? `Ocultar ${nombre}` : `Mostrar ${nombre}`}
                    deshabilitado={bloqueado}
                    onClick={() =>
                      ejecutar(
                        cambiarVisibilidadPublicidad,
                        { id: String(pieza.id), activo: String(!pieza.activa) },
                        'No se pudo cambiar la imagen.',
                      )
                    }
                  >
                    {pieza.activa ? (
                      <Eye size={16} aria-hidden="true" />
                    ) : (
                      <EyeOff size={16} aria-hidden="true" />
                    )}
                  </BotonTeja>
                  <BotonTeja
                    etiqueta={`Editar ${nombre}`}
                    deshabilitado={bloqueado}
                    ocupado={abriendo && objetivo?.id === pieza.id}
                    onClick={() => editar(pieza)}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </BotonTeja>
                  <BotonTeja
                    etiqueta={`Quitar ${nombre}`}
                    deshabilitado={bloqueado}
                    onClick={() => setPorQuitar(pieza)}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </BotonTeja>
                </div>
              </li>
            )
          })}
        </ol>
      )}

      <p className={styles.nota}>
        El número es el puesto en el carrusel: la 1 es la primera que se ve. Una imagen oculta se
        guarda aquí pero no sale en la portada.
        {cupos === 0 && ` Ya hay ${TOPE_PUBLICIDAD}: quita una para añadir otra.`}
      </p>

      {/* ── EL AJUSTE ───────────────────────────────────────────────────── */}
      <Modal
        open={ajustando}
        onClose={() => !ocupado && dejarDeAjustar()}
        title={objetivo?.id === null ? 'Nueva imagen' : 'Editar imagen'}
        description="Arrastra para encuadrar y acerca con la barra. Así se verá en la portada."
        width="720px"
        /* Con una imagen a medio encuadrar, un toque en el velo no la pierde. */
        cerrarAlPulsarFuera={false}
      >
        {imagen && (
          <div className={styles.ajuste}>
            <Field
              label="Descripción"
              optional
              help="Qué se ve en la imagen. La leen los lectores de pantalla y los buscadores; no sale escrita en la portada."
            >
              <Input
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                maxLength={DESCRIPCION_MAXIMA}
                placeholder="Ej.: Feria de aliados, 20 de noviembre"
                autoComplete="off"
                disabled={ocupado}
              />
            </Field>

            {/* `key` con la imagen: «Elegir otra» arranca el encuadre de cero. */}
            <EditorEncuadre
              key={imagen.url}
              imagen={imagen}
              opciones={OPCIONES_IMAGEN}
              textoGuardar={objetivo?.id === null ? 'Publicar imagen' : 'Guardar cambios'}
              guardando={ocupado}
              error={aviso}
              onGuardar={subir}
              onElegirOtra={() => entrada.current?.click()}
              onCancelar={dejarDeAjustar}
            />
          </div>
        )}
      </Modal>

      {/* Quitar borra el archivo: no se puede deshacer, así que se confirma. */}
      <ConfirmDialog
        open={porQuitar !== null}
        onClose={() => setPorQuitar(null)}
        onConfirm={quitar}
        title="¿Quitar esta imagen?"
        description="Dejará de verse en la portada y se borrará. No se puede deshacer. Si solo quieres que no salga por ahora, ocúltala."
        confirmLabel="Quitar"
        destructive
        loading={ocupado}
      />
    </section>
  )
}

/** Un botón de icono de una teja, con su nombre accesible. */
function BotonTeja({
  etiqueta,
  deshabilitado,
  ocupado,
  onClick,
  children,
}: {
  etiqueta: string
  deshabilitado: boolean
  /** Se está descargando la imagen para abrirla en el editor. */
  ocupado?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      className={styles.boton}
      onClick={onClick}
      disabled={deshabilitado}
      aria-label={etiqueta}
      title={etiqueta}
      aria-busy={ocupado || undefined}
    >
      {ocupado ? <Spinner size="sm" label={null} /> : children}
    </button>
  )
}
