'use client'

import { useActionState } from 'react'
import { Save } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Stack } from '@/components/ui/layout'
import { ResumenErrores, useValidacion } from '@/components/ui/validacion'
import { cedula, correo, nombrePersona, obligatorio, telefono } from '@/lib/validacion/reglas'
import { useCerrarCuando, useCerrarOverlay } from '@/components/shell/overlay-ruta'
import { editarUsuario, type EditarUsuarioState } from '../../../actions'
import styles from '@/styles/formulario.module.css'

const estadoInicial: EditarUsuarioState = {}

const REGLAS = {
  email: [obligatorio('Escribe el correo: será su usuario de acceso.'), correo],
  nombres: [obligatorio('Escribe los nombres.'), nombrePersona],
  apellidos: [obligatorio('Escribe los apellidos.'), nombrePersona],
  cedula: [obligatorio('Escribe la cédula.'), cedula],
  telefono: [telefono],
}

const ETIQUETAS: Record<string, string> = {
  email: 'Correo',
  nombres: 'Nombres',
  apellidos: 'Apellidos',
  cedula: 'Cédula',
  telefono: 'Teléfono',
}

type Props = {
  perfilId: string
  email: string
  empleado: {
    nombres: string
    apellidos: string
    cedula: string | null
    telefono: string | null
  }
}

export function EditarForm({ perfilId, email, empleado }: Props) {
  const [state, formAction, pending] = useActionState(editarUsuario, estadoInicial)
  const cerrar = useCerrarOverlay()
  useCerrarCuando(state.ok)
  const v = useValidacion(REGLAS)

  return (
    <>
      <form action={formAction} className={styles.formulario} {...v.propsFormulario}>
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        <ResumenErrores errores={v.errores} etiquetas={ETIQUETAS} ir={v.ir} />

        <input type="hidden" name="perfil_id" value={perfilId} />
        <input type="hidden" name="email_original" value={email} />

        <Stack gap={5}>
          <Field
            label="Correo de acceso"
            help="Cambiarlo también cambia el usuario con el que inicia sesión."
            error={v.error('email')}
          >
            <Input
              name="email"
              type="email"
              defaultValue={email}
              autoComplete="email"
              required
              autoFocus
            />
          </Field>

          <div className={styles.pareja}>
            <Field label="Nombres" error={v.error('nombres')}>
              <Input
                name="nombres"
                defaultValue={empleado.nombres}
                autoComplete="given-name"
                required
              />
            </Field>
            <Field label="Apellidos" error={v.error('apellidos')}>
              <Input
                name="apellidos"
                defaultValue={empleado.apellidos}
                autoComplete="family-name"
                required
              />
            </Field>
          </div>

          <div className={styles.pareja}>
            <Field label="Cédula" help="Debe seguir siendo única." error={v.error('cedula')}>
              <Input
                name="cedula"
                defaultValue={empleado.cedula ?? ''}
                numeric
                inputMode="numeric"
                required
              />
            </Field>
            <Field label="Teléfono" optional error={v.error('telefono')}>
              <Input
                name="telefono"
                defaultValue={empleado.telefono ?? ''}
                type="tel"
                numeric
                inputMode="tel"
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
