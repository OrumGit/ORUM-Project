'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { Alert } from '@/components/ui/alert'
import { EstrellasSelector } from '@/components/ui/estrellas'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/input'
import { ResumenErrores, useValidacion } from '@/components/ui/validacion'
import { MENSAJE_MAXIMO, revisarEstrellas, revisarMensaje } from '@/lib/resenas/resenas'
import { guardarResena } from '@/app/miembros/(portal)/comercios/resenas-actions'
import estilos from './resenas.module.css'

/*
  EL FORMULARIO DE LA RESEÑA  ·  va dentro de un overlay (`MiResena`)
  ---------------------------------------------------------------------------
  Sin superficie propia: la pone la ventana. Las reglas son las mismas del
  servidor (`revisarEstrellas`, `revisarMensaje`), envueltas para
  `useValidacion`; el servidor vuelve a decidir.

  ── Por qué `onSubmit` y no `<form action>` ─────────────────────────────────

  React 19 RESETEA el formulario al terminar una acción pasada a `action`,
  también cuando vuelve con error. Los radios del selector son controlados
  (`checked` sale del estado de `EstrellasSelector`): `form.reset()` los
  desmarcaría en el DOM sin que ese estado se enterara, y se verían 4
  estrellas llenas con ningún radio marcado — el reenvío llegaría sin
  calificación. Y además el socio perdería el mensaje que había escrito.
  Aquí se envía a mano dentro de una transición: no hay reset. Cada vez que
  la ventana se abre el formulario se monta de nuevo (`key`), así que
  siempre arranca de lo guardado.

  El botón de enviar vive en el pie de la ventana, fuera del `<form>`: se
  asocia por el atributo `form` (`FORMULARIO_RESENA_ID`).
*/

export const FORMULARIO_RESENA_ID = 'formulario-resena'

const REGLAS = {
  estrellas: [(v: string) => (revisarEstrellas(v).ok ? null : 'Elige de 1 a 5 estrellas.')],
  mensaje: [
    (v: string) => {
      const r = revisarMensaje(v)
      return r.ok ? null : r.error
    },
  ],
}

const ETIQUETAS: Record<string, string> = { estrellas: 'Calificación', mensaje: 'Tu opinión' }

type Props = {
  comercioId: number
  inicial: { estrellas: number; mensaje: string | null } | null
  /** Lo que pasa al guardar bien (cerrar la ventana y avisar). */
  onGuardada: () => void
  /** Para que el pie de la ventana enseñe «Publicando…». */
  onPendiente?: (pendiente: boolean) => void
}

export function FormularioResena({ comercioId, inicial, onGuardada, onPendiente }: Props) {
  const v = useValidacion(REGLAS)
  const [error, setError] = useState<string | null>(null)
  const [largo, setLargo] = useState(inicial?.mensaje?.length ?? 0)
  const [, iniciar] = useTransition()

  function alEnviar(e: FormEvent<HTMLFormElement>) {
    v.propsFormulario.onSubmit(e)
    // La validación ya lo detuvo y llevó el foco al primer campo.
    if (e.defaultPrevented) return
    e.preventDefault()

    const datos = new FormData(e.currentTarget)
    setError(null)
    onPendiente?.(true)
    iniciar(async () => {
      try {
        const r = await guardarResena({}, datos)
        // Sin respuesta: la acción redirigió (sesión o membresía vencida) y
        // Next ya está navegando.
        if (!r) return
        if (r.ok) onGuardada()
        else setError(r.error ?? 'No pudimos guardar tu reseña. Inténtalo de nuevo.')
      } catch {
        setError('No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.')
      } finally {
        onPendiente?.(false)
      }
    })
  }

  const errorEstrellas = v.error('estrellas')

  return (
    <form
      id={FORMULARIO_RESENA_ID}
      className={estilos.formulario}
      {...v.propsFormulario}
      onSubmit={alEnviar}
    >
      {/* `Alert` danger ya es `role="alert"`: el lector lo anuncia. */}
      {error && <Alert tone="danger">{error}</Alert>}
      <ResumenErrores errores={v.errores} etiquetas={ETIQUETAS} ir={v.ir} />

      <input type="hidden" name="comercio_id" value={comercioId} />

      {/* Un grupo de radios no tiene un control al que apunte un `<label>`:
          su nombre lo da la leyenda del `fieldset`. */}
      <fieldset className={estilos.grupoEstrellas}>
        <legend className={estilos.leyenda}>Calificación</legend>
        <EstrellasSelector
          name="estrellas"
          etiqueta="Calificación"
          valorInicial={inicial?.estrellas}
          describedBy={errorEstrellas ? 'resena-error-estrellas' : undefined}
        />
        {errorEstrellas && (
          <p id="resena-error-estrellas" className={estilos.errorCampo}>
            {errorEstrellas}
          </p>
        )}
      </fieldset>

      <Field
        label="Tu opinión"
        optional
        help={`${largo} de ${MENSAJE_MAXIMO} caracteres. Sin enlaces.`}
        error={v.error('mensaje')}
      >
        <Textarea
          name="mensaje"
          rows={5}
          defaultValue={inicial?.mensaje ?? ''}
          placeholder="¿Cómo te atendieron? ¿Volverías?"
          onChange={(e) => setLargo(e.target.value.length)}
        />
      </Field>
    </form>
  )
}
