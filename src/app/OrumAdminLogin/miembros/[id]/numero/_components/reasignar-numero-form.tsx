'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Hash } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { SelectMenu } from '@/components/ui/select-menu'
import { ResumenErrores, useValidacion } from '@/components/ui/validacion'
import { useCerrarCuando } from '@/components/shell/overlay-ruta'
import { reasignarNumeroMembresia, type ReasignarNumeroState } from '../actions'
import { esNumeroRegistroValido } from '@/lib/miembros/numeros-registro'
import type { DatosReasignarNumero } from './datos'
import styles from '../../ficha.module.css'

/*
  REASIGNAR EL NÚMERO DE MEMBRESÍA  ·  el formulario (19/11/2026)
  ---------------------------------------------------------------------------
  Sin superficie propia: la pone quien lo usa (la ventana o la página). El
  número nuevo NO se escribe: se elige de la lista de números libres del pozo.
  Si el miembro tiene ventas, no hay lista: lo dice. El servidor vuelve a
  comprobar todo (que siga libre, que no tenga ventas).
*/

const INICIAL: ReasignarNumeroState = {}

const REGLAS = {
  numero_nuevo: [
    (v: string) => (esNumeroRegistroValido(v) ? null : 'Elige un número de la lista.'),
  ],
}
const ETIQUETAS: Record<string, string> = { numero_nuevo: 'Número nuevo' }

export function ReasignarNumeroForm({ datos }: { datos: DatosReasignarNumero }) {
  const [estado, accion, enviando] = useActionState(reasignarNumeroMembresia, INICIAL)
  useCerrarCuando(estado.ok)
  const v = useValidacion(REGLAS)
  const bloqueado = datos.ventas > 0
  const sinLibres = !bloqueado && datos.libres.length === 0

  return (
    <form action={accion} className={styles.renovar} {...v.propsFormulario}>
      {estado.error && <Alert tone="danger">{estado.error}</Alert>}
      <ResumenErrores errores={v.errores} etiquetas={ETIQUETAS} ir={v.ir} />

      <p>
        Número actual: <strong>{datos.numeroActual}</strong>. El número nuevo sale del pozo, y el
        actual vuelve a él.
      </p>

      <input type="hidden" name="miembro_id" value={datos.miembroId} />

      {bloqueado && (
        <Alert tone="warning">
          {datos.ventas === 1
            ? 'Este miembro tiene una venta registrada'
            : `Este miembro tiene ${datos.ventas} ventas registradas`}
          : ya no se puede cambiar su número.
        </Alert>
      )}

      {sinLibres && (
        <Alert tone="warning">
          No hay números libres en el pozo. Cárgalos antes en{' '}
          <Link href="/OrumAdminLogin/miembros/numeros">Números de registro</Link>.
        </Alert>
      )}

      {!bloqueado && !sinLibres && (
        <Field
          label="Número nuevo"
          help={
            datos.libresRecortados
              ? `Mostrando los primeros ${datos.libres.length} números libres del pozo.`
              : `${datos.libres.length} ${datos.libres.length === 1 ? 'número libre' : 'números libres'} en el pozo.`
          }
          error={v.error('numero_nuevo')}
        >
          <SelectMenu
            name="numero_nuevo"
            etiqueta="Número nuevo"
            placeholder="Elige un número libre…"
            opciones={datos.libres.map((n) => ({ value: n, label: n }))}
          />
        </Field>
      )}

      {!bloqueado && !sinLibres && (
        <Button
          type="submit"
          variant="brand"
          loading={enviando}
          icon={<Hash size={16} />}
          className={styles.renovarBoton}
        >
          Reasignar número
        </Button>
      )}
    </form>
  )
}
