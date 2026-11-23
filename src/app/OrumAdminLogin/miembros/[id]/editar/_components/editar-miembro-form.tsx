'use client'

import { useActionState } from 'react'
import { Save } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SelectMenu } from '@/components/ui/select-menu'
import { ResumenErrores, useValidacion } from '@/components/ui/validacion'
import { cedula, correo, largo, nombrePersona, obligatorio, telefono } from '@/lib/validacion/reglas'
import { Stack } from '@/components/ui/layout'
import { useCerrarCuando, useCerrarOverlay } from '@/components/shell/overlay-ruta'
import { editarMiembro, type EditarMiembroState } from '../../../actions'
import styles from '@/styles/formulario.module.css'

type Opcion = { id: number; nombre: string }

type MiembroInicial = {
  id: number
  perfil_id: string | null
  nombres: string
  apellidos: string
  cedula: string
  telefono: string | null
  direccion: string | null
  ciudad_id: number | null
  /** Correo real de Auth, o cadena vacía si no tiene cuenta. */
  correo: string
}

const estadoInicial: EditarMiembroState = {}

/* Las mismas reglas que al registrarlo; el correo puede quedar vacío (un
   miembro sin cuenta de acceso). */
const REGLAS = {
  nombres: [obligatorio('Escribe los nombres.'), nombrePersona],
  apellidos: [obligatorio('Escribe los apellidos.'), nombrePersona],
  cedula: [obligatorio('Escribe la cédula.'), cedula],
  telefono: [telefono],
  correo: [correo],
  direccion: [largo(5, 120, 'La dirección')],
}

const ETIQUETAS: Record<string, string> = {
  nombres: 'Nombres',
  apellidos: 'Apellidos',
  cedula: 'Cédula',
  telefono: 'Teléfono',
  correo: 'Correo electrónico',
  direccion: 'Dirección',
}

export function EditarMiembroForm({
  miembro,
  ciudades,
}: {
  miembro: MiembroInicial
  ciudades: Opcion[]
}) {
  const [state, formAction, pending] = useActionState(editarMiembro, estadoInicial)
  const cerrar = useCerrarOverlay()
  useCerrarCuando(state.ok)
  const v = useValidacion(REGLAS)

  return (
    <>
      <form action={formAction} className={styles.formulario} {...v.propsFormulario}>
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        <ResumenErrores errores={v.errores} etiquetas={ETIQUETAS} ir={v.ir} />

        <input type="hidden" name="miembro_id" value={miembro.id} />
        <input type="hidden" name="perfil_id" value={miembro.perfil_id ?? ''} />
        <input type="hidden" name="correo_original" value={miembro.correo} />

        <Stack gap={5}>
          <div className={styles.pareja}>
            <Field label="Nombres" error={v.error('nombres')}>
              <Input
                name="nombres"
                defaultValue={miembro.nombres}
                autoComplete="given-name"
                required
                autoFocus
              />
            </Field>
            <Field label="Apellidos" error={v.error('apellidos')}>
              <Input
                name="apellidos"
                defaultValue={miembro.apellidos}
                autoComplete="family-name"
                required
              />
            </Field>
          </div>

          <div className={styles.pareja}>
            <Field label="Cédula" help="Debe seguir siendo única." error={v.error('cedula')}>
              <Input
                name="cedula"
                defaultValue={miembro.cedula}
                numeric
                inputMode="numeric"
                required
              />
            </Field>
            <Field label="Teléfono" optional error={v.error('telefono')}>
              <Input
                name="telefono"
                defaultValue={miembro.telefono ?? ''}
                type="tel"
                numeric
                inputMode="tel"
              />
            </Field>
          </div>

          <Field
            label="Correo electrónico"
            help="Cambiarlo también cambia su usuario de acceso."
            error={v.error('correo')}
          >
            <Input
              name="correo"
              type="email"
              defaultValue={miembro.correo}
              autoComplete="email"
            />
          </Field>

          <div className={styles.pareja}>
            <Field label="Ciudad" optional>
              <SelectMenu
                name="ciudad_id"
                etiqueta="Ciudad"
                placeholder="Sin ciudad"
                defaultValue={miembro.ciudad_id ? String(miembro.ciudad_id) : ''}
                opciones={[
                  { value: '', label: 'Sin ciudad' },
                  ...ciudades.map((c) => ({ value: String(c.id), label: c.nombre })),
                ]}
              />
            </Field>
            <Field label="Dirección" optional error={v.error('direccion')}>
              <Input
                name="direccion"
                defaultValue={miembro.direccion ?? ''}
                autoComplete="street-address"
              />
            </Field>
          </div>
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
    </>
  )
}
