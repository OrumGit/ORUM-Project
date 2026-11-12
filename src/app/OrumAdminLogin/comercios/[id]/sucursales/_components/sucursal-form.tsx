'use client'

import { useActionState } from 'react'
import { MapPin, Save } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SelectMenu } from '@/components/ui/select-menu'
import { ResumenErrores, useValidacion } from '@/components/ui/validacion'
import { largo, obligatorio, telefono, type Regla } from '@/lib/validacion/reglas'
import { leerHorarioDelFormulario } from '@/lib/comercios/horario-formulario'
import type { HorarioSucursal } from '@/lib/comercios/horario'
import { EditorHorario } from './editor-horario'
import { Stack } from '@/components/ui/layout'
import { useCerrarCuando, useCerrarOverlay } from '@/components/shell/overlay-ruta'
import {
  crearSucursal,
  editarSucursal,
  type SucursalState,
} from '../../../sucursales-actions'
import styles from '@/styles/formulario.module.css'

type Opcion = { id: number; nombre: string }

type SucursalInicial = {
  id: number
  nombre: string
  direccion: string | null
  telefono: string | null
  ciudad_id: number | null
}

const estadoInicial: SucursalState = {}

/** El horario viaja como JSON en un campo oculto: se valida con la misma lectura del servidor. */
const reglaHorario: Regla = (valor) => {
  const leido = leerHorarioDelFormulario(valor)
  return leido.ok ? null : leido.error
}

const REGLAS = {
  nombre: [obligatorio('Escribe el nombre de la sucursal.'), largo(2, 60, 'El nombre')],
  direccion: [largo(5, 120, 'La dirección')],
  telefono: [telefono],
  ciudad_id: [obligatorio('Elige la ciudad de la sucursal.')],
  horario: [reglaHorario],
}

const ETIQUETAS: Record<string, string> = {
  nombre: 'Nombre',
  direccion: 'Dirección',
  telefono: 'Teléfono',
  ciudad_id: 'Ciudad',
  horario: 'Horario',
}

export function SucursalForm({
  comercioId,
  ciudades,
  sucursal,
  horario,
}: {
  comercioId: number
  ciudades: Opcion[]
  sucursal?: SucursalInicial
  /** El horario que ya tiene la sucursal (al editar). */
  horario?: HorarioSucursal
}) {
  const editando = Boolean(sucursal)
  const [state, formAction, pending] = useActionState(
    editando ? editarSucursal : crearSucursal,
    estadoInicial,
  )
  const cerrar = useCerrarOverlay()
  useCerrarCuando(state.ok)
  const v = useValidacion(REGLAS)

  return (
    <>
      <form action={formAction} className={styles.formulario} {...v.propsFormulario}>
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        <ResumenErrores errores={v.errores} etiquetas={ETIQUETAS} ir={v.ir} />

        <input type="hidden" name="comercio_id" value={comercioId} />
        {sucursal && <input type="hidden" name="id" value={sucursal.id} />}

        <Stack gap={5}>
          <Field
            label="Nombre"
            help="Cómo la reconoce el miembro: «Sede Centro», «Poblado»…"
            error={v.error('nombre')}
          >
            <Input name="nombre" defaultValue={sucursal?.nombre} required autoFocus />
          </Field>

          <Field label="Dirección" optional error={v.error('direccion')}>
            <Input
              name="direccion"
              defaultValue={sucursal?.direccion ?? ''}
              autoComplete="street-address"
            />
          </Field>

          <div className={styles.pareja}>
            <Field label="Teléfono" optional error={v.error('telefono')}>
              <Input
                name="telefono"
                defaultValue={sucursal?.telefono ?? ''}
                type="tel"
                numeric
                inputMode="tel"
              />
            </Field>

            <Field label="Ciudad" error={v.error('ciudad_id')}>
              <SelectMenu
                name="ciudad_id"
                etiqueta="Ciudad"
                placeholder="Selecciona una ciudad"
                defaultValue={sucursal?.ciudad_id ? String(sucursal.ciudad_id) : ''}
                opciones={ciudades.map((c) => ({ value: String(c.id), label: c.nombre }))}
              />
            </Field>
          </div>

          <EditorHorario inicial={horario ?? []} error={v.error('horario')} />
        </Stack>

        <div className={styles.acciones}>
          <Button
            type="submit"
            loading={pending}
            icon={editando ? <Save size={16} /> : <MapPin size={16} />}
          >
            {editando ? 'Guardar cambios' : 'Crear sucursal'}
          </Button>
          <Button type="button" variant="secondary" onClick={cerrar}>
            Cancelar
          </Button>
        </div>
      </form>
    </>
  )
}
