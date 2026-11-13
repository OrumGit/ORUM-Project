'use client'

import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SelectMenu } from '@/components/ui/select-menu'
import { SelectorFecha } from '@/components/ui/selector-fecha'
import { useInstanteAlMinuto } from '@/components/comercios/use-minuto'
import {
  calcularFinCortesia,
  ETIQUETAS_UNIDAD,
  fechaCorta,
  leerDuracionCortesia,
  MAXIMOS,
  textoVencimiento,
  UNIDADES_CORTESIA,
  type UnidadCortesia,
} from '@/lib/miembros/cortesia'
import { hoyISO } from '@/lib/shared/fecha'
import type { Regla, Valores } from '@/lib/validacion/reglas'
import styles from './duracion-cortesia.module.css'

/*
  CUÁNTO DURA LA CORTESÍA  ·  «Registrar miembro» y «Renovar membresía»
  (12/11/2026: «que el administrador pueda otorgar membresías de cortesía por
  el tiempo que él decida […] o directamente en un calendario; y conserva las
  cortesías de los planes normales»; ese día: «dejemos únicamente por días,
  descarta horas»).

  Sale debajo de la casilla de cortesía, solo con ella marcada. Por defecto
  «Lo que dura el plan»: la cortesía de siempre (la anual, un año; la
  mensual, un mes). Las demás piden la cantidad, o el día en el calendario,
  y una línea dice en palabras cuándo vence. Decide el servidor
  (`leerDuracionCortesia`); esto es el aviso al momento.
*/

const OPCIONES = UNIDADES_CORTESIA.map((u) => ({ value: u, label: ETIQUETAS_UNIDAD[u] }))

/** Las reglas de los dos campos, para sumarlas al `REGLAS` del formulario. */
function regla(campo: 'cantidad' | 'hasta'): Regla {
  return (_v: string, todos: Valores) => {
    if (!todos.es_cortesia) return null
    const unidad = todos.cortesia_duracion || 'plan'
    if (unidad === 'plan') return null
    if ((campo === 'hasta') !== (unidad === 'fecha')) return null
    const r = leerDuracionCortesia(
      { duracion: unidad, cantidad: todos.cortesia_cantidad, hasta: todos.cortesia_hasta },
      hoyISO(),
    )
    return r.ok ? null : r.error
  }
}

export const REGLAS_CORTESIA = {
  cortesia_cantidad: [regla('cantidad')],
  cortesia_hasta: [regla('hasta')],
}

export const ETIQUETAS_CORTESIA = {
  cortesia_cantidad: 'Duración de la cortesía',
  cortesia_hasta: 'Fecha de fin de la cortesía',
}

export function DuracionCortesia({
  error,
  inicio,
}: {
  /** `v.error` del formulario. */
  error: (campo: string) => string | undefined
  /**
   * Día en que empieza ('YYYY-MM-DD'). Al renovar con una membresía vigente
   * es el día siguiente a su fin; sin él, hoy.
   */
  inicio?: string
}) {
  const [unidad, setUnidad] = useState<UnidadCortesia>('plan')
  const [cantidad, setCantidad] = useState('')
  const [hasta, setHasta] = useState('')
  // `null` en el servidor: la línea de «vence» aparece al montar.
  const ahora = useInstanteAlMinuto()

  const hoy = ahora ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(ahora) : null
  // Empieza otro día si al renovar hay una membresía vigente.
  const desde = inicio && hoy && inicio > hoy ? inicio : hoy

  let vence: string | null = null
  if (unidad === 'plan') {
    vence = 'Dura lo mismo que el plan elegido: la anual, un año; la mensual, un mes.'
  } else if (desde) {
    const r = leerDuracionCortesia({ duracion: unidad, cantidad, hasta }, desde)
    if (r.ok) vence = textoVencimiento(calcularFinCortesia(r.duracion, desde, 1))
  }

  const porCantidad = unidad !== 'plan' && unidad !== 'fecha'

  return (
    <div className={styles.bloque}>
      <div className={styles.campos}>
        <Field label="¿Por cuánto tiempo?">
          <SelectMenu
            name="cortesia_duracion"
            etiqueta="¿Por cuánto tiempo?"
            opciones={OPCIONES}
            value={unidad}
            onChange={(valor) => setUnidad(valor as UnidadCortesia)}
          />
        </Field>

        {porCantidad && (
          <Field
            label={`Cantidad de ${ETIQUETAS_UNIDAD[unidad].toLowerCase()}`}
            help={`Hasta ${MAXIMOS[unidad]}.`}
            error={error('cortesia_cantidad')}
          >
            <Input
              name="cortesia_cantidad"
              inputMode="numeric"
              numeric
              autoComplete="off"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value.replace(/\D/g, ''))}
            />
          </Field>
        )}

        {unidad === 'fecha' && (
          <Field label="Vale hasta el día" error={error('cortesia_hasta')}>
            <SelectorFecha
              name="cortesia_hasta"
              etiqueta="Vale hasta el día"
              min={desde ?? undefined}
              value={hasta}
              onChange={setHasta}
            />
          </Field>
        )}
      </div>

      <p className={styles.vence} aria-live="polite">
        <CalendarClock size={16} aria-hidden="true" />
        <span>
          {vence ?? 'Escribe cuánto dura para ver cuándo vence.'}
          {desde && hoy && desde > hoy && (
            <span className={styles.nota}>
              {' '}
              Empieza el {fechaCorta(desde)}, cuando termine la membresía vigente.
            </span>
          )}
        </span>
      </p>
    </div>
  )
}
