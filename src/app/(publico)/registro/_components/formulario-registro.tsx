'use client'

import { useActionState, useState } from 'react'
import { Send } from 'lucide-react'
import { CampoContrasenaNueva } from '@/components/auth/campo-contrasena-nueva'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Stack } from '@/components/ui/layout'
import { SelectMenu } from '@/components/ui/select-menu'
import { Turnstile, useTurnstile } from '@/components/ui/turnstile'
import { Checkbox } from '@/components/ui/toggle'
import { useValidacion } from '@/components/ui/validacion'
import {
  cedula,
  contrasena,
  correo,
  nombrePersona,
  obligatorio,
  telefono,
  type ReglasFormulario,
  type Regla,
} from '@/lib/validacion/reglas'
import { revisarDireccion } from '@/lib/aliados/solicitud-aliado'
import { iniciarRegistro, type RegistroState } from '../actions'
import estilos from './formulario-registro.module.css'

const ESTADO_INICIAL: RegistroState = { ok: false }

/** Los términos son obligatorios: el checkbox solo envía «on» cuando está marcado. */
const aceptado: Regla = (valor) =>
  valor === 'on' ? null : 'Debes aceptar los términos y la política de datos para continuar.'

const REGLAS: ReglasFormulario = {
  nombres: [obligatorio('Escribe tus nombres.'), nombrePersona],
  apellidos: [obligatorio('Escribe tus apellidos.'), nombrePersona],
  cedula: [obligatorio('Escribe tu número de cédula.'), cedula],
  correo: [obligatorio('Escribe tu correo electrónico.'), correo],
  telefono: [telefono],
  ciudad_id: [obligatorio('Elige tu ciudad.')],
  direccion: [obligatorio('Escribe tu dirección.'), (valor) => revisarDireccion(valor)],
  contrasena: [obligatorio('Elige una contraseña.'), contrasena],
  terminos: [aceptado],
}

export type PlanRegistro = {
  id: number
  nombre: string
  precioTexto: string
  duracionMeses: number
}

/**
 * Registro público: datos, términos y contraseña. Valida campo a campo en el
 * navegador (las mismas reglas que el servidor) y el servidor vuelve a
 * validar todo. Sin ficha ni número: eso llega con el pago.
 */
export type CiudadRegistro = { id: number; nombre: string }

export function FormularioRegistro({
  plan,
  ciudades,
}: {
  plan: PlanRegistro
  ciudades: CiudadRegistro[]
}) {
  const [estado, accion, cargando] = useActionState(iniciarRegistro, ESTADO_INICIAL)
  const validacion = useValidacion(REGLAS)
  const turnstile = useTurnstile()
  const [contrasenaValor, setContrasenaValor] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)

  if (estado.ok) {
    return (
      <Alert tone="success" title="Revisa tu correo">
        {estado.mensaje ??
          'Te enviamos un enlace para confirmarlo y continuar con el pago.'}
      </Alert>
    )
  }

  // Un error del servidor se muestra en su campo, si no hay ya uno del navegador.
  const errorDe = (campo: string) =>
    validacion.error(campo) ?? estado.errores?.[campo as keyof typeof estado.errores] ?? null

  return (
    <form {...validacion.propsFormulario} action={accion}>
      <input type="hidden" name="plan_id" value={plan.id} />

      <Stack gap={4}>
        <p>
          Plan <strong>{plan.nombre}</strong>: {plan.precioTexto} · {plan.duracionMeses}{' '}
          {plan.duracionMeses === 1 ? 'mes' : 'meses'}
        </p>

        {estado.mensaje && !estado.ok && (
          <Alert tone="danger" title="No pudimos continuar">
            {estado.mensaje}
          </Alert>
        )}

        <Field label="Nombres" error={errorDe('nombres') ?? undefined}>
          <Input name="nombres" type="text" autoComplete="given-name" autoFocus />
        </Field>

        <Field label="Apellidos" error={errorDe('apellidos') ?? undefined}>
          <Input name="apellidos" type="text" autoComplete="family-name" />
        </Field>

        <Field label="Cédula" error={errorDe('cedula') ?? undefined}>
          <Input name="cedula" type="text" inputMode="numeric" autoComplete="off" />
        </Field>

        <Field label="Correo electrónico" error={errorDe('correo') ?? undefined}>
          <Input name="correo" type="email" autoComplete="email" />
        </Field>

        <Field label="Teléfono (opcional)" error={errorDe('telefono') ?? undefined}>
          <Input name="telefono" type="tel" autoComplete="tel" inputMode="tel" />
        </Field>

        <Field label="Ciudad" error={errorDe('ciudad_id') ?? undefined}>
          <SelectMenu
            name="ciudad_id"
            etiqueta="Ciudad"
            placeholder="Elige tu ciudad"
            opciones={[
              { value: '', label: 'Elige tu ciudad' },
              ...ciudades.map((c) => ({ value: String(c.id), label: c.nombre })),
            ]}
          />
        </Field>

        <Field label="Dirección" error={errorDe('direccion') ?? undefined}>
          <Input name="direccion" autoComplete="street-address" />
        </Field>

        <CampoContrasenaNueva
          name="contrasena"
          label="Contraseña"
          value={contrasenaValor}
          onChange={setContrasenaValor}
          error={errorDe('contrasena')}
          ver={verContrasena}
          onVer={() => setVerContrasena((v) => !v)}
        />

        <div>
          <Checkbox
            name="terminos"
            label="Acepto los términos de uso y la política de tratamiento de mis datos."
          />
          {errorDe('terminos') && (
            <p role="alert" className={estilos.error}>
              {errorDe('terminos')}
            </p>
          )}
        </div>

        <Turnstile {...turnstile.enlace} tema="light" reiniciarAl={estado} />

        <Button
          type="submit"
          variant="brand"
          size="lg"
          pildora
          fullWidth
          loading={cargando}
          icon={<Send size={17} />}
        >
          Continuar al pago
        </Button>
      </Stack>
    </form>
  )
}
