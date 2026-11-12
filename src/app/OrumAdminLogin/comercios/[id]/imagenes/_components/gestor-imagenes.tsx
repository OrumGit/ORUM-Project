'use client'

import { useRef, useState, useTransition, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, ImagePlus, Pencil, Star, Trash2 } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ComercioLogo } from '@/components/ui/comercio-logo'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { ConfirmDialog, Modal } from '@/components/ui/modal'
import { Spinner } from '@/components/ui/spinner'
import {
  EditorEncuadre,
  useImagenElegida,
  type OpcionesEncuadre,
} from '@/components/imagenes/editor-encuadre'
import { TOPE_FOTOS_NEGOCIO, cuposLibres, fotosUsadas } from '@/lib/comercios/fotos-negocio'
import { ESTADO_SUBIDA_INICIAL, type EstadoSubida } from '@/lib/imagenes/estado'
import {
  guardarFotoGaleria,
  guardarImagenComercio,
  moverFotoGaleria,
  quitarFotoGaleria,
  quitarImagenComercio,
  usarFotoComoPortada,
} from '@/app/OrumAdminLogin/comercios/imagenes-actions'
import styles from './gestor-imagenes.module.css'

/*
  GESTOR DE IMÁGENES DE UN COMERCIO  ·  en el panel (rehecho el 13/10/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: «que en el portal administrador se tengan las
  funcionalidades de editar las imágenes —agrandar, centrar, todo— para las
  imágenes del comercio; además de la posibilidad de borrar cualquiera que
  quiera, ya sea logo, portada, galería; y mejora el diseño de ese apartado,
  no me convence».

  Antes eran tres subidas de archivo con una vista previa cada una, y una
  lista de la galería con campos de «orden» numérico: no se podía encuadrar
  nada ni quitar el logotipo o la portada. Ahora es lo mismo que el comercio
  tiene en «Mi negocio», con lo que el administrador añade:

    · EL LOGOTIPO, en su círculo, con «Editar» y «Quitar».
    · LAS FOTOS, en una rejilla: la portada primero (con su insignia) y la
      galería detrás, cada una con sus acciones DEBAJO —mover antes/después,
      editar y quitar—, y el hueco para añadir mientras queden cupos.
    · EL AJUSTE, en una ventana encima, con `EditorEncuadre`: arrastrar,
      acercar, girar y restablecer. El logotipo, en un círculo en el que
      puede verse entero; las fotos, en 16:9, como salen en la ficha. Las
      fotos de la galería llevan además su descripción (texto alternativo).

  «EDITAR» ABRE LA IMAGEN QUE YA ESTÁ, no el selector de archivos; desde el
  editor, «Elegir otra» la reemplaza. Si la publicada no se puede descargar
  (un logotipo alojado en la web del comercio, sin permiso de lectura), el
  aviso ofrece elegir un archivo.

  EL ORDEN, CON FLECHAS: ya no hay que escribir números. La portada no se
  mueve: es siempre la primera.

  CUALQUIER FOTO DE LA GALERÍA PUEDE SER LA PORTADA (la estrella de cada
  teja). Es un intercambio: la elegida sube a portada y la portada que había
  ocupa su puesto en la galería; no se pierde ninguna. Es un cambio de un
  toque y reversible (basta elegir otra), así que no pide confirmación.

  Es de cliente (antes era de servidor con islas): las acciones se llaman
  dentro de una transición y, al terminar, revalidan la ruta — las imágenes
  nuevas llegan por las props. Se importa con el alias `@/app/OrumAdminLogin/…`: la
  gemela interceptada de esta pantalla vive cuatro niveles por debajo.
*/

export type ImagenGaleria = {
  id: number
  url: string
  descripcion: string | null
  orden: number
}

/* El logotipo: un círculo en el que puede verse ENTERO (un logotipo apaisado
   no se puede «cubrir» sin cortarle las letras). Los mismos valores que usa
   el comercio en «Mi negocio»: las dos puertas producen la misma imagen. */
const OPCIONES_LOGO: OpcionesEncuadre = {
  proporcion: 1,
  forma: 'circulo',
  permiteContener: true,
  circular: true,
  anchoSalida: 640,
  pesoMaximo: 700 * 1024,
}

/* Las fotos: 16:9, la proporción de la portada en la ficha. */
const OPCIONES_FOTO: OpcionesEncuadre = {
  proporcion: 9 / 16,
  forma: 'rectangulo',
  // Se puede poner ENTERA, sin recortar (23/10/2026); arranca así.
  completa: true,
  anchoSalida: 1600,
  pesoMaximo: 700 * 1024,
}

const DESCRIPCION_MAXIMA = 160

/** Qué imagen se está cambiando o quitando. */
type Objetivo =
  | { tipo: 'logo' }
  | { tipo: 'portada' }
  /** Con `fotoId`, esa pieza; sin él, una nueva. */
  | { tipo: 'galeria'; fotoId: number | null }

type Accion = (previo: EstadoSubida, datos: FormData) => Promise<EstadoSubida>

const TEXTOS_QUITAR: Record<Objetivo['tipo'], { titulo: string; descripcion: string }> = {
  logo: {
    titulo: '¿Quitar el logotipo?',
    descripcion:
      'El comercio se verá con sus iniciales en el catálogo y en su ficha. No se puede deshacer, pero se puede subir otro cuando quieras.',
  },
  portada: {
    titulo: '¿Quitar la portada?',
    descripcion:
      'Dejará de verse en la ficha y en el directorio. No se puede deshacer, pero se puede subir otra cuando quieras.',
  },
  galeria: {
    titulo: '¿Quitar esta foto?',
    descripcion:
      'Dejará de verse en la ficha del comercio. No se puede deshacer, pero se puede subir otra cuando quieras.',
  },
}

export function GestorImagenes({
  comercioId,
  nombre,
  logoUrl,
  portadaUrl,
  galeria,
}: {
  comercioId: number
  nombre: string
  logoUrl: string | null
  portadaUrl: string | null
  galeria: ImagenGaleria[]
}) {
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
  const [porQuitar, setPorQuitar] = useState<Objetivo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ocupado, enTransicion] = useTransition()
  const entrada = useRef<HTMLInputElement>(null)

  const usadas = fotosUsadas(portadaUrl, galeria.length)
  const cupos = cuposLibres(portadaUrl, galeria.length)
  const ajustando = imagen !== null && objetivo !== null
  const esLogo = objetivo?.tipo === 'logo'
  const esGaleria = objetivo?.tipo === 'galeria'
  const bloqueado = ocupado || abriendo
  const aviso = error ?? errorImagen

  /** AÑADIR: abre el selector de archivos para ese hueco. */
  function pedir(nuevo: Objetivo) {
    setError(null)
    setObjetivo(nuevo)
    setDescripcion('')
    entrada.current?.click()
  }

  /** EDITAR: abre en el editor la imagen que ya está publicada. */
  function editar(nuevo: Objetivo, direccion: string, textoActual = '') {
    setError(null)
    setObjetivo(nuevo)
    setDescripcion(textoActual)
    void abrirActual(direccion)
  }

  /** Cierra el ajuste sin guardar (y anula lo que se estuviera abriendo). */
  function dejarDeAjustar() {
    soltar()
    setObjetivo(null)
    setError(null)
  }

  /** Sube la imagen ya encuadrada a donde diga el objetivo. */
  function subir(archivo: File) {
    if (!objetivo) return
    const destino = objetivo
    const datos = new FormData()
    datos.set('archivo', archivo)

    let accion: Accion
    if (destino.tipo === 'galeria') {
      accion = guardarFotoGaleria
      datos.set('comercio_id', String(comercioId))
      datos.set('descripcion', descripcion)
      if (destino.fotoId !== null) datos.set('foto_id', String(destino.fotoId))
    } else {
      accion = guardarImagenComercio
      datos.set('id', String(comercioId))
      datos.set('destino', destino.tipo)
    }

    setError(null)
    enTransicion(async () => {
      const resultado = await accion(ESTADO_SUBIDA_INICIAL, datos)
      if (resultado.ok) {
        soltar()
        setObjetivo(null)
      } else {
        setError(resultado.error ?? 'No se pudo guardar la imagen. Inténtalo de nuevo.')
      }
    })
  }

  function mover(fotoId: number, sentido: -1 | 1) {
    const datos = new FormData()
    datos.set('comercio_id', String(comercioId))
    datos.set('foto_id', String(fotoId))
    datos.set('sentido', String(sentido))

    setError(null)
    enTransicion(async () => {
      const resultado = await moverFotoGaleria(ESTADO_SUBIDA_INICIAL, datos)
      if (!resultado.ok) setError(resultado.error ?? 'No se pudo mover la foto.')
    })
  }

  function hacerPortada(fotoId: number) {
    const datos = new FormData()
    datos.set('comercio_id', String(comercioId))
    datos.set('foto_id', String(fotoId))

    setError(null)
    enTransicion(async () => {
      const resultado = await usarFotoComoPortada(ESTADO_SUBIDA_INICIAL, datos)
      if (!resultado.ok) setError(resultado.error ?? 'No se pudo cambiar la portada.')
    })
  }

  function quitar() {
    const destino = porQuitar
    if (!destino) return
    const datos = new FormData()

    let accion: Accion
    if (destino.tipo === 'galeria') {
      if (destino.fotoId === null) return
      accion = quitarFotoGaleria
      datos.set('comercio_id', String(comercioId))
      datos.set('foto_id', String(destino.fotoId))
    } else {
      accion = quitarImagenComercio
      datos.set('id', String(comercioId))
      datos.set('destino', destino.tipo)
    }

    setError(null)
    enTransicion(async () => {
      const resultado = await accion(ESTADO_SUBIDA_INICIAL, datos)
      setPorQuitar(null)
      if (!resultado.ok) setError(resultado.error ?? 'No se pudo quitar la imagen.')
    })
  }

  const tituloAjuste = esLogo
    ? 'Ajusta el logotipo'
    : objetivo?.tipo === 'portada'
      ? 'Ajusta la portada'
      : 'Ajusta la foto'

  return (
    <div className={styles.gestor}>
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

      {aviso && !ajustando && (
        <Alert
          key={aviso}
          tone="danger"
          /* Si no se pudo abrir la publicada (una URL externa sin permiso de
             lectura, o sin conexión), queda reemplazarla por un archivo. */
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

      {/* ── El logotipo ─────────────────────────────────────────────────── */}
      <section className={styles.bloque} aria-labelledby="imagenes-logo">
        <h2 id="imagenes-logo" className={styles.titulo}>
          Logotipo
        </h2>
        <div className={styles.filaLogo}>
          <ComercioLogo logoUrl={logoUrl} nombre={nombre} className={styles.logo} />
          <div className={styles.logoTextos}>
            <p className={styles.nota}>
              Identifica al comercio en el catálogo y en su ficha. Se ve dentro de un círculo; una
              imagen cuadrada es la que mejor queda.
            </p>
            <div className={styles.logoAcciones}>
              <Button
                variant="secondary"
                size="sm"
                loading={abriendo && esLogo}
                disabled={bloqueado}
                icon={
                  logoUrl ? (
                    <Pencil size={15} aria-hidden="true" />
                  ) : (
                    <ImagePlus size={15} aria-hidden="true" />
                  )
                }
                onClick={() => (logoUrl ? editar({ tipo: 'logo' }, logoUrl) : pedir({ tipo: 'logo' }))}
              >
                {logoUrl ? 'Editar logotipo' : 'Añadir logotipo'}
              </Button>
              {logoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={bloqueado}
                  icon={<Trash2 size={15} aria-hidden="true" />}
                  onClick={() => setPorQuitar({ tipo: 'logo' })}
                >
                  Quitar
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Las fotos ───────────────────────────────────────────────────── */}
      <section className={styles.bloque} aria-labelledby="imagenes-fotos">
        <div className={styles.filaTitulo}>
          <h2 id="imagenes-fotos" className={styles.titulo}>
            Fotos
          </h2>
          {/* El recuento, en texto: el tope no se adivina por los huecos. */}
          <p className={styles.recuento}>
            {usadas} de {TOPE_FOTOS_NEGOCIO}
          </p>
        </div>

        <ul className={styles.rejilla}>
          {/* La portada: siempre la primera, esté o no. */}
          <li>
            {portadaUrl ? (
              <Teja url={portadaUrl} insignia="Portada" texto="La foto grande de la ficha">
                <span className={styles.separador} aria-hidden="true" />
                <BotonTeja
                  etiqueta="Editar la portada"
                  deshabilitado={bloqueado}
                  ocupado={abriendo && objetivo?.tipo === 'portada'}
                  onClick={() => editar({ tipo: 'portada' }, portadaUrl)}
                >
                  <Pencil size={16} aria-hidden="true" />
                </BotonTeja>
                <BotonTeja
                  etiqueta="Quitar la portada"
                  deshabilitado={bloqueado}
                  onClick={() => setPorQuitar({ tipo: 'portada' })}
                >
                  <Trash2 size={16} aria-hidden="true" />
                </BotonTeja>
              </Teja>
            ) : (
              <Hueco
                texto="Añadir portada"
                deshabilitado={bloqueado || cupos === 0}
                onClick={() => pedir({ tipo: 'portada' })}
              />
            )}
          </li>

          {galeria.map((foto, i) => {
            const nombreFoto = `la foto ${i + 2}`
            return (
              <li key={foto.id}>
                <Teja
                  url={foto.url}
                  puesto={i + 2}
                  texto={foto.descripcion ?? ''}
                  textoVacio="Sin descripción"
                >
                  <BotonTeja
                    etiqueta={`Mover ${nombreFoto} antes`}
                    deshabilitado={bloqueado || i === 0}
                    onClick={() => mover(foto.id, -1)}
                  >
                    <ArrowLeft size={16} aria-hidden="true" />
                  </BotonTeja>
                  <BotonTeja
                    etiqueta={`Mover ${nombreFoto} después`}
                    deshabilitado={bloqueado || i === galeria.length - 1}
                    onClick={() => mover(foto.id, 1)}
                  >
                    <ArrowRight size={16} aria-hidden="true" />
                  </BotonTeja>
                  <span className={styles.separador} aria-hidden="true" />
                  <BotonTeja
                    etiqueta={`Usar ${nombreFoto} como portada`}
                    deshabilitado={bloqueado}
                    onClick={() => hacerPortada(foto.id)}
                  >
                    <Star size={16} aria-hidden="true" />
                  </BotonTeja>
                  <BotonTeja
                    etiqueta={`Editar ${nombreFoto}`}
                    deshabilitado={bloqueado}
                    ocupado={
                      abriendo && objetivo?.tipo === 'galeria' && objetivo.fotoId === foto.id
                    }
                    onClick={() =>
                      editar({ tipo: 'galeria', fotoId: foto.id }, foto.url, foto.descripcion ?? '')
                    }
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </BotonTeja>
                  <BotonTeja
                    etiqueta={`Quitar ${nombreFoto}`}
                    deshabilitado={bloqueado}
                    onClick={() => setPorQuitar({ tipo: 'galeria', fotoId: foto.id })}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </BotonTeja>
                </Teja>
              </li>
            )
          })}

          {/* Un solo hueco para añadir, mientras queden cupos. Si la portada
              está vacía, el cupo se ofrece primero a ella. */}
          {cupos > (portadaUrl ? 0 : 1) && (
            <li>
              <Hueco
                texto="Añadir foto"
                deshabilitado={bloqueado}
                onClick={() => pedir({ tipo: 'galeria', fotoId: null })}
              />
            </li>
          )}
        </ul>

        <p className={styles.nota}>
          La primera es la portada: la foto grande de la ficha y la que sale en el directorio. Las
          demás se ven en ese orden. Con la estrella, cualquiera pasa a ser la portada y la que
          había ocupa su lugar.
          {cupos === 0 && ` Ya tiene las ${TOPE_FOTOS_NEGOCIO}: quita una para añadir otra.`}
        </p>
      </section>

      {/* ── EL AJUSTE ───────────────────────────────────────────────────── */}
      <Modal
        open={ajustando}
        onClose={() => !ocupado && dejarDeAjustar()}
        title={tituloAjuste}
        description={
          esLogo
            ? 'Arrastra para centrarlo y aléjalo hasta que se vea entero. Así saldrá en el círculo.'
            : 'Arrastra para encuadrar y acerca con la barra. Así se verá en la ficha.'
        }
        width="720px"
        /* Con una imagen a medio encuadrar, un toque en el velo no la pierde. */
        cerrarAlPulsarFuera={false}
      >
        {imagen && (
          <div className={styles.ajuste}>
            {esGaleria && (
              <Field
                label="Descripción"
                optional
                help="Qué se ve en la foto, para quien no puede verla. No sale escrita en la ficha."
              >
                <Input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  maxLength={DESCRIPCION_MAXIMA}
                  placeholder="Ej.: La terraza del local, de noche"
                  autoComplete="off"
                  disabled={ocupado}
                />
              </Field>
            )}

            {/* `key` con la imagen: «Elegir otra» arranca el encuadre de cero. */}
            <EditorEncuadre
              key={imagen.url}
              imagen={imagen}
              opciones={esLogo ? OPCIONES_LOGO : OPCIONES_FOTO}
              textoGuardar={esLogo ? 'Guardar logotipo' : 'Guardar foto'}
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
        title={TEXTOS_QUITAR[porQuitar?.tipo ?? 'galeria'].titulo}
        description={TEXTOS_QUITAR[porQuitar?.tipo ?? 'galeria'].descripcion}
        confirmLabel="Quitar"
        destructive
        loading={ocupado}
      />
    </div>
  )
}

/* ==========================================================================
   LAS PIEZAS DE LA REJILLA
   ========================================================================== */

/** Una foto ya subida: la imagen, su texto y, debajo, sus acciones. */
function Teja({
  url,
  insignia,
  puesto,
  texto,
  textoVacio,
  children,
}: {
  url: string
  /** «Portada». */
  insignia?: string
  /** El puesto en la ficha, para la galería. */
  puesto?: number
  texto: string
  /** Lo que se lee cuando no hay texto. */
  textoVacio?: string
  /** Los botones de la fila de acciones. */
  children: ReactNode
}) {
  return (
    <div className={styles.teja}>
      <div className={styles.marco}>
        {/* Decorativa aquí: lo que es lo dicen la insignia, el texto de
            debajo y los nombres de los botones. `<img>` y no `next/image`:
            la URL es de Storage o externa. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- URL externa arbitraria, no un asset local */}
        <img src={url} alt="" className={styles.foto} loading="lazy" decoding="async" />
        {insignia && <span className={styles.insignia}>{insignia}</span>}
        {puesto !== undefined && (
          <span className={styles.insignia} aria-hidden="true">
            {puesto}
          </span>
        )}
      </div>
      <p className={styles.texto} data-vacio={!texto || undefined}>
        {texto || textoVacio}
      </p>
      <div className={styles.acciones}>{children}</div>
    </div>
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
  children: ReactNode
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

/** El hueco para añadir una foto. */
function Hueco({
  texto,
  deshabilitado,
  onClick,
}: {
  texto: string
  deshabilitado: boolean
  onClick: () => void
}) {
  return (
    <button type="button" className={styles.hueco} onClick={onClick} disabled={deshabilitado}>
      <ImagePlus size={22} aria-hidden="true" />
      {texto}
    </button>
  )
}
