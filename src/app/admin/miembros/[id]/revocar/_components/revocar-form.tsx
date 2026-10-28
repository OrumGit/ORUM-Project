'use client'

import { useActionState, useState } from 'react'
import { Ban } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Textarea } from '@/components/ui/input'
import { SelectMenu } from '@/components/ui/select-menu'
import { ResumenErrores, useValidacion } from '@/components/ui/validacion'
import { useCerrarCuando } from '@/components/shell/overlay-ruta'
import { revocarMembresia, type RevocarState } from '@/app/admin/miembros/actions'
import {
  ETIQUETA_MOTIVO_REVOCACION,
  MOTIVOS_REVOCACION,
  NOTA_REVOCACION_MAXIMA,
  revisarRevocacion,
} from '@/lib/miembros/revocacion'
import type { DatosRevocacion } from './datos'
import styles from '../../ficha.module.css'

/*
  REVOCAR UNA MEMBRESÍA  ·  el formulario (29/10/2026)
  ---------------------------------------------------------------------------
  Sin superficie propia: la pone quien lo usa (la ventana o la página). Dice
  primero, en palabras, qué va a pasar —es una decisión que deja a alguien
  sin beneficios—, luego pide el motivo (y una nota, obligatoria con «Otro
  motivo») y cierra con un botón rojo que nombra la acción. Las reglas son
  las del servidor (`revisarRevocacion`), envueltas para `useValidacion`.
*/

const INICIAL: RevocarState = {}

const REGLAS = {
  motivo: [(v: string) => (revisarRevocacion(v, 'x').ok ? null : 'Elige el motivo por el que se revoca.')],
  nota: [
    (v: string, todos: Record<string, string>) => {
      const r = revisarRevocacion(todos.motivo, v)
      return !r.ok && r.campo === 'nota' ? r.error : null
    },
  ],
}
const ETIQUETAS: Record<string, string> = { motivo: 'Motivo', nota: 'Nota' }

/** 'YYYY-MM-DD' → «14 de febrero de 2027» (fecha civil: en UTC). */
function fechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function RevocarForm({ datos }: { datos: DatosRevocacion }) {
  const [estado, accion, enviando] = useActionState(revocarMembresia, INICIAL)
  useCerrarCuando(estado.ok)
  const v = useValidacion(REGLAS)
  const [largo, setLargo] = useState(0)
  const [motivo, setMotivo] = useState('')

  const quedan =
    datos.diasRestantes === 0
      ? 'vence hoy'
      : `le quedan ${datos.diasRestantes} ${datos.diasRestantes === 1 ? 'día' : 'días'}, hasta el ${fechaLarga(datos.fechaFin)}`

  return (
    <form action={accion} className={styles.renovar} {...v.propsFormulario}>
      {estado.error && !estado.campo && <Alert tone="danger">{estado.error}</Alert>}
      <ResumenErrores errores={v.errores} etiquetas={ETIQUETAS} ir={v.ir} />

      <div className={styles.revocarAviso}>
        <p className={styles.revocarPlan}>
          {datos.plan} · {quedan}
        </p>
        <ul className={styles.revocarLista}>
          <li>Pierde los beneficios de inmediato: la caja de los comercios no aceptará su carnet.</li>
          <li>En su portal verá que su membresía está cancelada.</li>
          <li>No se borra nada ni se devuelve dinero. Para devolvérsela, renuévala.</li>
        </ul>
      </div>

      <input type="hidden" name="miembro_id" value={datos.miembroId} />
      <input type="hidden" name="membresia_id" value={datos.membresiaId} />

      <Field label="Motivo" error={v.error('motivo') ?? (estado.campo === 'motivo' ? estado.error : undefined)}>
        <SelectMenu
          name="motivo"
          etiqueta="Motivo"
          placeholder="Elige un motivo…"
          opciones={MOTIVOS_REVOCACION.map((m) => ({ value: m, label: ETIQUETA_MOTIVO_REVOCACION[m] }))}
          onChange={setMotivo}
        />
      </Field>

      <Field
        label="Nota"
        optional={motivo !== 'otro'}
        help={`${largo} de ${NOTA_REVOCACION_MAXIMA} caracteres. Queda en la bitácora; el miembro no la ve.`}
        error={v.error('nota') ?? (estado.campo === 'nota' ? estado.error : undefined)}
      >
        <Textarea
          name="nota"
          rows={3}
          placeholder="Qué pasó, en una línea."
          onChange={(e) => setLargo(e.target.value.length)}
        />
      </Field>

      <Button
        type="submit"
        variant="danger"
        loading={enviando}
        icon={<Ban size={16} />}
        className={styles.renovarBoton}
      >
        Revocar membresía
      </Button>
    </form>
  )
}
