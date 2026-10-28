'use client'

import { useActionState } from 'react'
import { Save } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Stack } from '@/components/ui/layout'
import { ResumenErrores, useValidacion } from '@/components/ui/validacion'
import { entero, largo, obligatorio, precio } from '@/lib/validacion/reglas'
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
  nombre: [obligatorio('Escribe el nombre del plan.'), largo(3, 60, 'El nombre')],
  descripcion: [largo(5, 200, 'La descripción')],
  precio: [obligatorio('Escribe el precio.'), precio()],
  duracion_meses: [obligatorio('Escribe la duración en meses.'), entero(1, 60, 'La duración')],
}

const ETIQUETAS: Record<string, string> = {
  nombre: 'Nombre',
  descripcion: 'Descripción',
  precio: 'Precio',
  duracion_meses: 'Duración',
}

/* Solo edita: crear planes se retiró el 29/10/2026. */
export function PlanForm({ plan }: { plan: PlanInicial }) {
  const [state, formAction, pending] = useActionState(editarPlan, estadoInicial)
  const cerrar = useCerrarOverlay()
  useCerrarCuando(state.ok)
  const v = useValidacion(REGLAS)

  return (
    <>
      <form action={formAction} className={styles.formulario} {...v.propsFormulario}>
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        <ResumenErrores errores={v.errores} etiquetas={ETIQUETAS} ir={v.ir} />

        {plan && <input type="hidden" name="id" value={plan.id} />}

        <Stack gap={5}>
          {/*
            La ayuda anterior prometía que un plan llamado «Oro» o «Premium»
            saldría con un distintivo dorado. Ese distintivo —`PlanTierBadge`,
            junto con la heurística `esPlanDestacado`— se eliminó al confirmar
            que ORUM vende un único servicio. El texto sobrevivió y prometía
            algo que no ocurre: quien leyera eso pondría un nombre por un
            efecto inexistente.
          */}
          <Field label="Nombre" help="Cómo lo verá el miembro en su carnet." error={v.error('nombre')}>
            <Input name="nombre" defaultValue={plan?.nombre} required autoFocus />
          </Field>

          <Field label="Descripción" optional error={v.error('descripcion')}>
            <Input name="descripcion" defaultValue={plan?.descripcion ?? ''} />
          </Field>

          <div className={styles.pareja}>
            <Field label="Precio" help="En pesos. Puedes escribirlo con puntos: 120.000." error={v.error('precio')}>
              <Input
                name="precio"
                inputMode="numeric"
                numeric
                required
                defaultValue={plan?.precio}
              />
            </Field>

            <Field label="Duración" help="En meses." error={v.error('duracion_meses')}>
              <Input
                name="duracion_meses"
                inputMode="numeric"
                numeric
                required
                defaultValue={plan?.duracion_meses ?? 12}
              />
            </Field>
          </div>
        </Stack>

        <div className={styles.acciones}>
          <Button
            type="submit"
            loading={pending}
            icon={<Save size={16} />}
          >
            Guardar cambios
          </Button>
          <Button type="button" variant="secondary" onClick={cerrar}>
            Cancelar
          </Button>
        </div>
      </form>
    </>
  )
}
