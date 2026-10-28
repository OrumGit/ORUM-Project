'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { MessageSquareText, PenLine, Reply, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/feedback'
import { Overlay } from '@/components/ui/overlay'
import { FormularioRespuesta } from '@/components/resenas/formulario-respuesta'
import { ResumenResenas } from '@/components/resenas/resumen-resenas'
import { TarjetaResena } from '@/components/resenas/tarjeta-resena'
import { ZonaAviso } from '@/components/resenas/zona-aviso'
import { fechaResena } from '@/lib/resenas/acciones'
import type { ResenaGestion } from '@/lib/resenas/mapeo'
import { quitarMiRespuesta, responderResena } from '../resenas-actions'
import verificar from './verificar.module.css'
import estilos from '@/components/resenas/resenas.module.css'

/*
  LAS RESEÑAS EN LA CAJA  ·  el comercio las lee y responde
  ---------------------------------------------------------------------------
  Una tarjeta más de la página (`.tarjeta` de verificar.module.css). Desde
  el 29/10/2026 todo lo que pinta sale de `components/resenas/` —el
  encabezado (`ResumenResenas`), cada reseña (`TarjetaResena`, aquí con el
  nombre COMPLETO del autor y los controles de respuesta), el aviso
  (`ZonaAviso`) y el formulario (`FormularioRespuesta`)—, el mismo que usa
  el panel. Aquí queda solo lo que es del comercio: qué acciones llama y
  qué dice. No hay botón de borrar la reseña: el comercio no puede.
*/

const FORMULARIO_ID = 'formulario-respuesta'

type Props = {
  total: number
  promedio: number | null
  resenas: ResenaGestion[]
}

export function ResenasComercio({ total, promedio, resenas }: Props) {
  const [abierto, setAbierto] = useState(false)
  /** La reseña a la que responde la ventana; sigue ahí mientras se anima su salida. */
  const [activa, setActiva] = useState<ResenaGestion | null>(null)
  const [vez, setVez] = useState(0)
  const [guardando, setGuardando] = useState(false)

  const [quitandoId, setQuitandoId] = useState<number | null>(null)
  const [, iniciarQuitar] = useTransition()
  const [errorQuitar, setErrorQuitar] = useState<string | null>(null)
  const [aviso, setAviso] = useState('')
  const zonaRef = useRef<HTMLDivElement>(null)
  const enfocarZona = useRef(false)

  /* Tras «Quitar» el botón desaparece y el foco caería al `body`. Se espera a
     que el aviso YA esté pintado: con la zona aún vacía, `focus()` no hace
     nada (y antes se llamaba en el mismo tick del `setAviso`). */
  useEffect(() => {
    if (aviso && enfocarZona.current) {
      enfocarZona.current = false
      zonaRef.current?.focus()
    }
  }, [aviso])

  function abrir(r: ResenaGestion) {
    setAviso('')
    setErrorQuitar(null)
    setActiva(r)
    setVez((n) => n + 1)
    setAbierto(true)
  }

  function alGuardar() {
    setAbierto(false)
    setAviso(
      activa?.respuestaComercio
        ? 'Tu respuesta quedó actualizada.'
        : 'Tu respuesta quedó publicada.',
    )
  }

  function quitar(r: ResenaGestion) {
    const datos = new FormData()
    datos.set('resena_id', String(r.id))
    setAviso('')
    setErrorQuitar(null)
    setQuitandoId(r.id)
    iniciarQuitar(async () => {
      try {
        const res = await quitarMiRespuesta({}, datos)
        if (res.error) setErrorQuitar(res.error)
        else {
          enfocarZona.current = true
          setAviso('Quitaste tu respuesta.')
        }
      } catch {
        setErrorQuitar('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.')
      } finally {
        setQuitandoId(null)
      }
    })
  }

  return (
    <section className={verificar.tarjeta} aria-labelledby="titulo-resenas">
      <ResumenResenas id="titulo-resenas" titulo="Reseñas de tus clientes" total={total} promedio={promedio} />

      <ZonaAviso aviso={aviso} error={errorQuitar} zonaRef={zonaRef} />

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
                  acciones={
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={r.respuestaComercio ? <PenLine size={15} /> : <Reply size={15} />}
                        onClick={() => abrir(r)}
                        disabled={quitandoId === r.id}
                      >
                        {r.respuestaComercio ? 'Editar respuesta' : 'Responder'}
                      </Button>
                      {r.respuestaComercio && (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 size={15} />}
                          onClick={() => quitar(r)}
                          loading={quitandoId === r.id}
                        >
                          Quitar
                        </Button>
                      )}
                    </>
                  }
                />
              </li>
            ))}
          </ul>
          {total > resenas.length && (
            <p className={estilos.pie}>
              Mostramos las {resenas.length} más recientes de {total}.
            </p>
          )}
        </>
      ) : (
        <EmptyState
          icon={<MessageSquareText aria-hidden="true" />}
          title="Aún no tienes reseñas"
          description="Cuando un socio califique tu comercio, lo verás aquí y podrás responderle."
        />
      )}

      <Overlay
        open={abierto}
        onClose={() => setAbierto(false)}
        title={activa?.respuestaComercio ? 'Editar tu respuesta' : 'Responder reseña'}
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
            accion={responderResena}
            ocultos={{ resena_id: activa.id }}
            resena={activa}
            etiqueta="Tu respuesta"
            placeholder="Agradece, aclara o cuéntale cómo lo resolverás."
            inicial={activa.respuestaComercio}
            onGuardada={alGuardar}
            onPendiente={setGuardando}
          />
        )}
      </Overlay>
    </section>
  )
}
