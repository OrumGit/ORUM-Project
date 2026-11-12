'use client'

import { useActionState, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Copiar } from '@/components/ui/copiar'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Stack } from '@/components/ui/layout'
import { ResumenErrores, useValidacion } from '@/components/ui/validacion'
import { cedula, correo, nombrePersona, obligatorio, telefono } from '@/lib/validacion/reglas'
import { SegmentedControl } from '@/components/ui/segmented'
import { useCerrarOverlay } from '@/components/shell/overlay-ruta'
import { crearUsuario, type CrearUsuarioState } from '../../actions'
import styles from '@/styles/formulario.module.css'

const estadoInicial: CrearUsuarioState = {}

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

type Tipo = 'empleado' | 'super_admin'

/**
 * El estado vive en `FormularioUsuario`; esta capa solo lo remonta (vía `key`)
 * al pulsar «Crear otro», para volver a un formulario limpio sin navegar.
 */
export function UsuarioForm() {
  const [instancia, setInstancia] = useState(0)
  return (
    <FormularioUsuario
      key={instancia}
      onCrearOtro={() => setInstancia((n) => n + 1)}
    />
  )
}

function FormularioUsuario({ onCrearOtro }: { onCrearOtro: () => void }) {
  const cerrar = useCerrarOverlay()
  const [state, formAction, pending] = useActionState(crearUsuario, estadoInicial)
  const [tipo, setTipo] = useState<Tipo>('empleado')
  const v = useValidacion(REGLAS)

  if (state.ok && state.email) {
    return <Credenciales estado={state} onCerrar={cerrar} onCrearOtro={onCrearOtro} />
  }

  return (
    <>
      <form action={formAction} className={styles.formulario} {...v.propsFormulario}>
        {state.error && <Alert tone="danger">{state.error}</Alert>}
        <ResumenErrores errores={v.errores} etiquetas={ETIQUETAS} ir={v.ir} />

        {/* El tipo de usuario es una decisión de permisos: se elige entre dos
            opciones visibles a la vez, no escondidas en un desplegable. */}
        <Field label="Tipo de usuario">
          <input type="hidden" name="tipo" value={tipo} />
          <SegmentedControl
            options={[
              { value: 'empleado', label: 'Empleado' },
              { value: 'super_admin', label: 'Administrador' },
            ]}
            value={tipo}
            onChange={setTipo}
            ariaLabel="Tipo de usuario"
            size="md"
          />
        </Field>

        {tipo === 'super_admin' && (
          <Alert tone="warning" title="Acceso completo">
            Un administrador puede crear otros usuarios, gestionar comercios y cambiar los
            planes de membresía.
          </Alert>
        )}

        <Stack gap={5}>
          <Field
            label="Correo electrónico"
            help="Será su usuario para iniciar sesión en el panel."
            error={v.error('email')}
          >
            <Input name="email" type="email" autoComplete="email" required autoFocus />
          </Field>

          <div className={styles.pareja}>
            <Field label="Nombres" error={v.error('nombres')}>
              <Input name="nombres" autoComplete="given-name" required />
            </Field>
            <Field label="Apellidos" error={v.error('apellidos')}>
              <Input name="apellidos" autoComplete="family-name" required />
            </Field>
          </div>

          <div className={styles.pareja}>
            <Field label="Cédula" help="Sin puntos ni espacios." error={v.error('cedula')}>
              <Input name="cedula" numeric inputMode="numeric" required />
            </Field>
            <Field label="Teléfono" optional error={v.error('telefono')}>
              <Input name="telefono" type="tel" numeric inputMode="tel" />
            </Field>
          </div>

          <p className={styles.nota}>
            Al guardar se envía un correo con un enlace de un solo uso para activar
            el acceso.
          </p>
        </Stack>

        <div className={styles.acciones}>
          <Button type="submit" loading={pending} icon={<UserPlus size={16} />}>
            Crear usuario
          </Button>
          <Button type="button" variant="secondary" onClick={cerrar}>
            Cancelar
          </Button>
        </div>
      </form>
    </>
  )
}

function Credenciales({
  estado,
  onCerrar,
  onCrearOtro,
}: {
  estado: CrearUsuarioState
  onCerrar: () => void
  onCrearOtro: () => void
}) {
  return (
    <>
      <div className={styles.credenciales}>
        <Alert tone="success" title="Usuario creado" />

        <Alert tone="success" title="Correo de activación enviado">
          Se envió un enlace de un solo uso para que el usuario elija su propia
          contraseña.
        </Alert>

        <div className={styles.credencial}>
          <span className={styles.credencialEtiqueta}>Correo de acceso</span>
          <Copiar valor={estado.email ?? ''} label="Copiar correo">
            <span className={styles.credencialValor}>{estado.email}</span>
          </Copiar>
        </div>

        <div className={styles.acciones}>
          <Button type="button" onClick={onCerrar}>
            Ir a la lista
          </Button>
          <Button type="button" variant="secondary" onClick={onCrearOtro}>
            Crear otro
          </Button>
        </div>
      </div>
    </>
  )
}
