'use client'

import { useActionState } from 'react'
import { Save } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/input'
import { Stack } from '@/components/ui/layout'
import { ResumenErrores, useValidacion } from '@/components/ui/validacion'
import { largo } from '@/lib/validacion/reglas'
import { useCerrarCuando, useCerrarOverlay } from '@/components/shell/overlay-ruta'
import { editarPlan, type PlanState } from '../actions'
import styles from '@/styles/formulario.module.css'

type PlanInicial = {
  id: number
  nombre: string
  descripcion: string | null
  precio: number
  duracion_meses: number
}

const estadoInicial: PlanState = {}

const REGLAS = {
  descripcion: [largo(5, 200, 'La descripción')],
}

const ETIQUETAS: Record<string, string> = {
  descripcion: 'Descripción',
}

function resumenPlan(plan: PlanInicial): string {
  const precio = plan.precio.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
  const meses = `${plan.duracion_meses} ${plan.duracion_meses === 1 ? 'mes' : 'meses'}`
  return `${plan.nombre} · ${precio} · ${meses}`
}

/*
  Solo la DESCRIPCIÓN se edita (07/11/2026, encargo del propietario:
  «al administrador únicamente le permitamos editar la descripción»).
  Crear y retirar planes se quitó el 29/10/2026. El nombre, el precio y la
  duración se ven, pero no se tocan aquí; la acción tampoco los escribe.
*/
export function PlanForm({ plan }: { plan: PlanInicial }) {
  const [state, formAction, pending] = useActionState(editarPlan, estadoInicial)
  const cerrar = useCerrarOverlay()
  useCerrarCuando(state.ok)
  const v = useValidacion(REGLAS)

  return (
    <form action={formAction} className={styles.formulario} {...v.propsFormulario}>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <ResumenErrores errores={v.errores} etiquetas={ETIQUETAS} ir={v.ir} />

      <input type="hidden" name="id" value={plan.id} />

      <Stack gap={5}>
        <p className={styles.nota}>
          {resumenPlan(plan)}. El nombre, el precio y la duración del plan no se cambian desde aquí.
        </p>

        <Field
          label="Descripción"
          optional
          help="Lo que incluye el plan. Hasta 200 caracteres."
          error={v.error('descripcion')}
        >
          <Textarea
            name="descripcion"
            rows={3}
            maxLength={200}
            defaultValue={plan.descripcion ?? ''}
            autoFocus
          />
        </Field>
      </Stack>

      <div className={styles.acciones}>
        <Button type="submit" loading={pending} icon={<Save size={16} />}>
          Guardar cambios
        </Button>
        <Button type="button" variant="secondary" onClick={cerrar}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}
