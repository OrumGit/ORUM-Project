'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { Alert } from '@/components/ui/alert'
import { EstrellasLectura } from '@/components/ui/estrellas-lectura'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/input'
import { ResumenErrores, useValidacion } from '@/components/ui/validacion'
import {
  MENSAJE_MAXIMO,
  etiquetaEstrellas,
  revisarRespuesta,
  type ResenaState,
} from '@/lib/resenas/resenas'
import estilos from './resenas.module.css'

/*
  RESPONDER UNA RESEÑA  ·  el comercio desde su caja y ORUM desde el panel
  ---------------------------------------------------------------------------
  Eran dos copias casi idénticas (`resenas-comercio.tsx` y
  `resenas-admin.tsx`); ahora es esta, y cada portal pasa su acción, su
  etiqueta y sus campos ocultos. Arriba, la reseña a la que se responde,
  citada; debajo, el campo con las reglas del servidor (`revisarRespuesta`)
  envueltas para `useValidacion`.

  Se envía con `onSubmit` dentro de una transición y no con `<form action>`:
  React 19 resetea el formulario tras la acción, también si vuelve con
  error, y se perdería lo escrito. Quien lo usa lo monta de nuevo en cada
  apertura (`key`) para que arranque de lo guardado. El botón de enviar vive
  en el pie de la ventana y se asocia por el atributo `form`.
*/

const REGLAS = {
  respuesta: [
    (v: string) => {
      const r = revisarRespuesta(v)
      return r.ok ? null : r.error
    },
  ],
}

type Props = {
  /** Id del `<form>`: el botón del pie lo nombra en su atributo `form`. */
  formId: string
  accion: (prev: ResenaState, datos: FormData) => Promise<ResenaState>
  /** Campos ocultos que la acción necesita (`resena_id`, `comercio_id`…). */
  ocultos: Record<string, string | number>
  resena: { autor: string; estrellas: number; mensaje: string | null }
  etiqueta: string
  placeholder: string
  inicial: string | null
  onGuardada: () => void
  onPendiente: (pendiente: boolean) => void
}

export function FormularioRespuesta({
  formId,
  accion,
  ocultos,
  resena,
  etiqueta,
  placeholder,
  inicial,
  onGuardada,
  onPendiente,
}: Props) {
  const v = useValidacion(REGLAS)
  const [error, setError] = useState<string | null>(null)
  const [largo, setLargo] = useState(inicial?.length ?? 0)
  const [, iniciar] = useTransition()

  function alEnviar(e: FormEvent<HTMLFormElement>) {
    v.propsFormulario.onSubmit(e)
    // La validación ya lo detuvo y llevó el foco al campo.
    if (e.defaultPrevented) return
    e.preventDefault()

    const datos = new FormData(e.currentTarget)
    setError(null)
    onPendiente(true)
    iniciar(async () => {
      try {
        const r = await accion({}, datos)
        if (r.ok) onGuardada()
        else setError(r.error ?? 'No pudimos guardar la respuesta. Inténtalo de nuevo.')
      } catch {
        setError('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.')
      } finally {
        onPendiente(false)
      }
    })
  }

  return (
    <form id={formId} className={estilos.formulario} {...v.propsFormulario} onSubmit={alEnviar}>
      {error && <Alert tone="danger">{error}</Alert>}
      <ResumenErrores errores={v.errores} etiquetas={{ respuesta: etiqueta }} ir={v.ir} />

      {Object.entries(ocultos).map(([nombre, valor]) => (
        <input key={nombre} type="hidden" name={nombre} value={valor} />
      ))}

      <blockquote className={estilos.cita}>
        <p className={estilos.citaAutor}>{resena.autor}</p>
        <p className={estilos.nota5}>
          <EstrellasLectura valor={resena.estrellas} />
          <span aria-hidden="true">{etiquetaEstrellas(resena.estrellas)}</span>
        </p>
        {resena.mensaje && <p>{resena.mensaje}</p>}
      </blockquote>

      <Field
        label={etiqueta}
        help={`${largo} de ${MENSAJE_MAXIMO} caracteres. Sin enlaces.`}
        error={v.error('respuesta')}
      >
        <Textarea
          name="respuesta"
          rows={5}
          defaultValue={inicial ?? ''}
          placeholder={placeholder}
          onChange={(e) => setLargo(e.target.value.length)}
        />
      </Field>
    </form>
  )
}
