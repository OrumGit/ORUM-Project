'use client'

import { useActionState, useState } from 'react'
import { Hash, Plus } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Stack } from '@/components/ui/layout'
import { ResumenErrores, useValidacion } from '@/components/ui/validacion'
import { obligatorio, type Regla } from '@/lib/validacion/reglas'
import { esNumeroRegistroValido, expandirRango } from '@/lib/miembros/numeros-registro'
import { useCerrarOverlay } from '@/components/shell/overlay-ruta'
import { cargarRangoNumeros, type CargarRangoState } from '../actions'
import styles from '@/styles/formulario.module.css'

const estadoInicial: CargarRangoState = {}

const ocho: Regla = (v) => (v.trim() === '' || esNumeroRegistroValido(v.trim()) ? null : 'Escribe exactamente 8 cifras.')

/* El orden y el tope de la carga, con la misma función que usa el servidor. */
const rango: Regla = (v, todos) => {
  const desde = (todos.desde ?? '').trim()
  const hasta = v.trim()
  if (!esNumeroRegistroValido(desde) || !esNumeroRegistroValido(hasta)) return null
  const r = expandirRango(desde, hasta)
  return r.ok ? null : r.error
}

const REGLAS = {
  desde: [obligatorio('Escribe el primer número.'), ocho],
  hasta: [obligatorio('Escribe el último número.'), ocho, rango],
}

const ETIQUETAS: Record<string, string> = { desde: 'Desde', hasta: 'Hasta' }

/**
 * Sin tarjeta propia: dentro del overlay la superficie ya la pone el overlay.
 *
 * Esta capa solo remonta el formulario (vía `key`) al pulsar «Cargar otro
 * rango», para volver a un formulario limpio sin navegar —el cierre siempre es
 * `router.back()` por contexto, nunca un enlace hacia adelante—.
 */
export function CargarRangoForm() {
  const [instancia, setInstancia] = useState(0)
  return <Formulario key={instancia} onOtro={() => setInstancia((n) => n + 1)} />
}

function Formulario({ onOtro }: { onOtro: () => void }) {
  const cerrar = useCerrarOverlay()
  const [state, formAction, pending] = useActionState(cargarRangoNumeros, estadoInicial)
  const v = useValidacion(REGLAS)

  if (state.ok) {
    const creados = state.creados ?? 0
    const omitidos = state.omitidos ?? 0
    return (
      <div className={styles.credenciales}>
        <Alert
          tone={creados === 0 ? 'warning' : 'success'}
          title={
            creados === 0
              ? 'No entró ningún número nuevo'
              : `Se cargaron ${creados} ${creados === 1 ? 'número' : 'números'}`
          }
        >
          {omitidos > 0
            ? `${omitidos} ya estaban en el sistema y se omitieron.`
            : 'El rango completo entró al pozo.'}
        </Alert>

        <div className={styles.acciones}>
          <Button type="button" onClick={cerrar}>
            Ir a la lista
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onOtro}
            icon={<Plus size={16} />}
          >
            Cargar otro rango
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} className={styles.formulario} {...v.propsFormulario}>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <ResumenErrores errores={v.errores} etiquetas={ETIQUETAS} ir={v.ir} />

      <Stack gap={5}>
        <p className={styles.nota}>
          Escribe el primer y el último número impresos en los carnés. Se crea
          toda la secuencia. Máximo 2000 por carga; los que ya existan se omiten.
        </p>

        <div className={styles.pareja}>
          <Field label="Desde" help="8 dígitos." error={v.error('desde')}>
            <Input
              name="desde"
              numeric
              inputMode="numeric"
              maxLength={8}
              placeholder="00000001"
              required
              autoFocus
            />
          </Field>
          <Field label="Hasta" help="8 dígitos." error={v.error('hasta')}>
            <Input
              name="hasta"
              numeric
              inputMode="numeric"
              maxLength={8}
              placeholder="00000500"
              required
            />
          </Field>
        </div>
      </Stack>

      <div className={styles.acciones}>
        <Button type="submit" loading={pending} icon={<Hash size={16} />}>
          Cargar rango
        </Button>
        <Button type="button" variant="secondary" onClick={cerrar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
