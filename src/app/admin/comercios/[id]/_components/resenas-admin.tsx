'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCheck, MessageSquareText, PenLine, Reply, Store, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/feedback'
import { ConfirmDialog } from '@/components/ui/modal'
import { Overlay } from '@/components/ui/overlay'
import { FormularioRespuesta } from '@/components/resenas/formulario-respuesta'
import { ResumenResenas } from '@/components/resenas/resumen-resenas'
import { TarjetaResena } from '@/components/resenas/tarjeta-resena'
import { ZonaAviso } from '@/components/resenas/zona-aviso'
import { fechaResena } from '@/lib/resenas/acciones'
import type { ResenaGestion, ResenaPanel } from '@/lib/resenas/mapeo'
import {
  eliminarResena,
  marcarResenaRevisada,
  quitarRespuestaAdmin,
  responderComoAdmin,
} from '../../resenas-actions'
import estilos from '@/components/resenas/resenas.module.css'

/*
  LAS RESEÑAS EN LA FICHA DEL COMERCIO  ·  moderación del super administrador
  ---------------------------------------------------------------------------
  Misma pieza que la caja del comercio (`ResenasComercio`): desde el
  29/10/2026 las dos pintan con `components/resenas/` (encabezado, reseña,
  aviso y formulario de respuesta) y su hoja única. Aquí, con el nombre
  completo, la respuesta del comercio SOLO LECTURA, la de ORUM editable y
  un «Eliminar» que borra para siempre (por eso pasa por una confirmación).

  DOS SITIOS (29/10/2026): la pestaña «Reseñas» de la ficha de un comercio
  (con su encabezado y su promedio) y el apartado `/admin/resenas`, con
  TODAS: ahí cada reseña dice de qué comercio es (enlace a su ficha), si
  está POR REVISAR (menos de 4 estrellas y sin revisar), y ofrece «Marcar
  como revisada». Responder como ORUM también la da por revisada.
*/

const FORMULARIO_ID = 'formulario-respuesta-orum'

/** Una reseña de la lista: en el apartado trae su comercio y si está por revisar. */
type Item = ResenaGestion & Partial<Pick<ResenaPanel, 'comercioId' | 'comercioNombre' | 'porRevisar'>>

type Props = {
  /** Ficha de un comercio: su id. En el apartado, cada reseña trae el suyo. */
  comercioId?: number
  /** Encabezado con el promedio (ficha). En el apartado lo pone la página. */
  resumen?: { total: number; promedio: number | null }
  resenas: Item[]
  /** Apartado: cada reseña dice de qué comercio es. */
  conComercio?: boolean
  /** Existe `revisada_at`: se ofrece «Marcar como revisada». */
  conRevision?: boolean
  /** Lo que se dice sin reseñas (cambia con la pestaña del apartado). */
  vacio?: { titulo: string; descripcion: string }
}

export function ResenasAdmin({
  comercioId,
  resumen,
  resenas,
  conComercio = false,
  conRevision = false,
  vacio = {
    titulo: 'Este comercio aún no tiene reseñas',
    descripcion: 'Cuando un socio califique este comercio, lo verás aquí y podrás moderarlo.',
  },
}: Props) {
  const comercioDe = (r: Item) => r.comercioId ?? comercioId ?? 0
  const [abierto, setAbierto] = useState(false)
  const [activa, setActiva] = useState<Item | null>(null)
  const [vez, setVez] = useState(0)
  const [guardando, setGuardando] = useState(false)

  const [ocupadaId, setOcupadaId] = useState<number | null>(null)
  const [porEliminar, setPorEliminar] = useState<Item | null>(null)
  const [, iniciar] = useTransition()
  const [errorAccion, setErrorAccion] = useState<string | null>(null)
  const [aviso, setAviso] = useState('')
  const zonaRef = useRef<HTMLDivElement>(null)
  /** 'ahora': enfocar al pintarse el aviso; 'al-cerrar': esperar a que cierre la ventana. */
  const enfocarZona = useRef<'ahora' | 'al-cerrar' | null>(null)

  /* El botón que se pulsó desaparece con su fila: el foco caería al `body`.
     Se lleva a la zona del aviso cuando el DOM ya la muestra (antes, la zona
     estaba oculta y `focus()` en el mismo tick no hacía nada). */
  useEffect(() => {
    if (aviso && enfocarZona.current === 'ahora') {
      enfocarZona.current = null
      zonaRef.current?.focus()
    }
  }, [aviso])

  function abrir(r: Item) {
    setAviso('')
    setErrorAccion(null)
    setActiva(r)
    setVez((n) => n + 1)
    setAbierto(true)
  }

  function alGuardar() {
    setAbierto(false)
    setAviso(
      activa?.respuestaAdmin
        ? 'La respuesta de ORUM quedó actualizada.'
        : 'La respuesta de ORUM quedó publicada.',
    )
  }

  function ejecutar(
    r: Item,
    accion: typeof quitarRespuestaAdmin,
    exito: string,
    alTerminar?: () => void,
    foco: 'ahora' | 'al-cerrar' = 'ahora',
  ) {
    const datos = new FormData()
    datos.set('resena_id', String(r.id))
    datos.set('comercio_id', String(comercioDe(r)))
    setAviso('')
    setErrorAccion(null)
    setOcupadaId(r.id)
    iniciar(async () => {
      try {
        const res = await accion({}, datos)
        if (res.error) setErrorAccion(res.error)
        else {
          enfocarZona.current = foco
          setAviso(exito)
        }
      } catch {
        setErrorAccion('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.')
      } finally {
        setOcupadaId(null)
        alTerminar?.()
      }
    })
  }

  return (
    <div className={estilos.mia}>
      {resumen && (
        <ResumenResenas
          id="titulo-resenas"
          titulo="Reseñas de los socios"
          total={resumen.total}
          promedio={resumen.promedio}
        />
      )}

      <ZonaAviso aviso={aviso} error={errorAccion} zonaRef={zonaRef} />

      {resenas.length > 0 ? (
        <>
          <ul className={estilos.lista}>
            {resenas.map((r) => (
              <li key={r.id} className={estilos.item}>
                <TarjetaResena
                  autor={r.autor}
                  estrellas={r.estrellas}
                  mensaje={r.mensaje}
                  fecha={fechaResena(r.creadaEn)}
                  respuestaComercio={r.respuestaComercio}
                  respuestaAdmin={r.respuestaAdmin}
                  contexto={
                    conComercio || r.porRevisar ? (
                      <>
                        {conComercio && r.comercioId && (
                          <Link
                            href={`/admin/comercios/${r.comercioId}?pestana=resenas`}
                            className={estilos.contextoComercio}
                          >
                            <Store size={13} aria-hidden="true" />
                            {r.comercioNombre}
                          </Link>
                        )}
                        {r.porRevisar && <span className={estilos.porRevisar}>Por revisar</span>}
                      </>
                    ) : undefined
                  }
                  acciones={
                    <>
                      {conRevision && r.porRevisar && (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={<CheckCheck size={15} />}
                          onClick={() =>
                            ejecutar(r, marcarResenaRevisada, 'La reseña quedó marcada como revisada.')
                          }
                          loading={ocupadaId === r.id}
                        >
                          Marcar como revisada
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={r.respuestaAdmin ? <PenLine size={15} /> : <Reply size={15} />}
                        onClick={() => abrir(r)}
                        disabled={ocupadaId === r.id}
                      >
                        {r.respuestaAdmin ? 'Editar respuesta' : 'Responder como ORUM'}
                      </Button>
                      {r.respuestaAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            ejecutar(r, quitarRespuestaAdmin, 'Quitaste la respuesta de ORUM.')
                          }
                          disabled={ocupadaId === r.id}
                        >
                          Quitar respuesta
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Trash2 size={15} />}
                        onClick={() => setPorEliminar(r)}
                        disabled={ocupadaId === r.id}
                      >
                        Eliminar
                      </Button>
                    </>
                  }
                />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState
          icon={<MessageSquareText aria-hidden="true" />}
          title={vacio.titulo}
          description={vacio.descripcion}
        />
      )}

      <Overlay
        open={abierto}
        onClose={() => setAbierto(false)}
        title={activa?.respuestaAdmin ? 'Editar respuesta de ORUM' : 'Responder como ORUM'}
        description={activa ? `Respondes a ${activa.autor}. La verán todos los socios.` : undefined}
        width="520px"
        detent="large"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAbierto(false)} disabled={guardando}>
              Cancelar
            </Button>
            <Button type="submit" form={FORMULARIO_ID} loading={guardando}>
              Publicar respuesta
            </Button>
          </>
        }
      >
        {activa && (
          <FormularioRespuesta
            key={vez}
            formId={FORMULARIO_ID}
            accion={responderComoAdmin}
            ocultos={{ resena_id: activa.id, comercio_id: comercioDe(activa) }}
            resena={activa}
            etiqueta="Respuesta de ORUM"
            placeholder="Aclara, agradece o explica qué hará ORUM."
            inicial={activa.respuestaAdmin}
            onGuardada={alGuardar}
            onPendiente={setGuardando}
          />
        )}
      </Overlay>

      {/* Borra la reseña de la base: no se puede deshacer, así que se confirma. */}
      <ConfirmDialog
        open={porEliminar !== null}
        onClose={() => setPorEliminar(null)}
        onConfirm={() => {
          if (porEliminar)
            ejecutar(
              porEliminar,
              eliminarResena,
              'La reseña se eliminó.',
              () => setPorEliminar(null),
              'al-cerrar',
            )
        }}
        title="¿Eliminar esta reseña?"
        description={
          porEliminar
            ? `Se borrará para siempre la reseña de ${porEliminar.autor}, con las respuestas que tenga. Esta acción no se puede deshacer.`
            : undefined
        }
        onClosed={() => {
          /* La confirmación ya cerró del todo: el navegador intentó devolver
             el foco a «Eliminar», que ya no existe. Aquí se corrige. */
          if (enfocarZona.current === 'al-cerrar') {
            enfocarZona.current = null
            zonaRef.current?.focus()
          }
        }}
        confirmLabel="Eliminar para siempre"
        destructive
        loading={ocupadaId !== null && porEliminar !== null && ocupadaId === porEliminar.id}
      />
    </div>
  )
}
