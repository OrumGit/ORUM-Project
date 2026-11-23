'use client'

import { useActionState, useState } from 'react'
import { CreditCard } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SelectMenu } from '@/components/ui/select-menu'
import { Checkbox } from '@/components/ui/toggle'
import { ResumenErrores, useValidacion } from '@/components/ui/validacion'
import { obligatorio, precio as reglaPrecio, salvoCortesia } from '@/lib/validacion/reglas'
import { useCerrarCuando } from '@/components/shell/overlay-ruta'
import { renovarMembresia, type RenovarState } from '../../actions'
import { DuracionCortesia, ETIQUETAS_CORTESIA, REGLAS_CORTESIA } from '../../_components/duracion-cortesia'
import styles from '../ficha.module.css'

type PlanOpcion = { id: number; nombre: string; precio: number }

const estadoInicial: RenovarState = {}

/* El precio admite 0 (un descuento total); la cortesía va con su casilla y no se cobra. */
const REGLAS = {
  plan_id: [obligatorio('Elige un plan.')],
  precio_pagado: [
    salvoCortesia(obligatorio('Escribe el precio pagado.')),
    salvoCortesia(reglaPrecio(undefined, true)),
  ],
  ...REGLAS_CORTESIA,
}

const ETIQUETAS: Record<string, string> = {
  plan_id: 'Plan',
  precio_pagado: 'Precio pagado',
  ...ETIQUETAS_CORTESIA,
}

export function RenovarForm({
  miembroId,
  planes,
  puedeCortesia,
  inicio,
}: {
  miembroId: number
  planes: PlanOpcion[]
  /** Solo el super_admin puede dar cortesías; al empleado la casilla no se pinta. */
  puedeCortesia: boolean
  /** Día en que empezaría (hoy, o tras la membresía vigente): para decir cuándo vence una cortesía. */
  inicio?: string
}) {
  const [state, formAction, pending] = useActionState(renovarMembresia, estadoInicial)
  const [precio, setPrecio] = useState(planes[0] ? String(planes[0].precio) : '')
  const [esCortesia, setEsCortesia] = useState(false)

  const v = useValidacion(REGLAS)
  useCerrarCuando(state.ok)

  const sinPlanes = planes.length === 0

  return (
    /* Sin `Card`: la superficie la pone quien usa el formulario —el overlay o
       la página—, nunca el formulario. Antes ponía la suya y por eso no podía
       reutilizarse dentro de un diálogo sin anidar dos tarjetas. */
    <form action={formAction} className={styles.renovar} {...v.propsFormulario}>
      {state.error && <Alert tone="danger">{state.error}</Alert>}
      <ResumenErrores errores={v.errores} etiquetas={ETIQUETAS} ir={v.ir} />

      {sinPlanes && (
        <Alert tone="warning" title="No hay planes activos">
          Activa al menos un plan de membresía antes de registrar una renovación.
        </Alert>
      )}

      <input type="hidden" name="miembro_id" value={miembroId} />

      <div className={styles.renovarCampos}>
        <Field label="Plan" error={v.error('plan_id')}>
          <SelectMenu
            name="plan_id"
            etiqueta="Plan"
            defaultValue={planes[0] ? String(planes[0].id) : ''}
            opciones={planes.map((p) => ({
              value: String(p.id),
              label: `${p.nombre} · $ ${p.precio.toLocaleString('es-CO')}`,
            }))}
            // Al cambiar de plan se propone su precio de lista, pero el campo
            // sigue siendo editable: puede haber descuentos puntuales.
            onChange={(valor) => {
              const plan = planes.find((p) => p.id === Number(valor))
              if (plan) setPrecio(String(plan.precio))
            }}
          />
        </Field>

        {!esCortesia && (
          <Field
            label="Precio pagado"
            help="Puedes ajustarlo si hubo un descuento."
            error={v.error('precio_pagado')}
          >
            <Input
              name="precio_pagado"
              inputMode="numeric"
              numeric
              required
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
              disabled={sinPlanes}
            />
          </Field>
        )}
      </div>

      {puedeCortesia && (
        <Checkbox
          name="es_cortesia"
          label="Renovación de cortesía"
          description="No se cobra: queda registrada como cortesía y no suma a los ingresos ni a las ventas."
          checked={esCortesia}
          onChange={(e) => setEsCortesia(e.target.checked)}
          disabled={sinPlanes}
        />
      )}

      {puedeCortesia && esCortesia && <DuracionCortesia error={v.error} inicio={inicio} />}

      <Button
        type="submit"
        loading={pending}
        disabled={sinPlanes}
        icon={<CreditCard size={16} />}
        className={styles.renovarBoton}
      >
        Registrar renovación
      </Button>
    </form>
  )
}
