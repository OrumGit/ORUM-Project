'use client'

import { useActionState, useState } from 'react'
import { UserPlus } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Copiar } from '@/components/ui/copiar'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SelectMenu } from '@/components/ui/select-menu'
import { Checkbox } from '@/components/ui/toggle'
import { ResumenErrores, useValidacion } from '@/components/ui/validacion'
import {
  cedula,
  correo,
  largo,
  nombrePersona,
  obligatorio,
  precio as reglaPrecio,
  salvoCortesia,
  telefono,
} from '@/lib/validacion/reglas'
import { Divider, Section, Stack } from '@/components/ui/layout'
import { useCerrarOverlay } from '@/components/shell/overlay-ruta'
import { registrarMiembro, type RegistrarMiembroState } from '../actions'
import { DuracionCortesia, ETIQUETAS_CORTESIA, REGLAS_CORTESIA } from './duracion-cortesia'
import styles from '@/styles/formulario.module.css'

type Opcion = { id: number; nombre: string }
type PlanOpcion = { id: number; nombre: string; precio: number }

const estadoInicial: RegistrarMiembroState = {}

/* Lo que se revisa antes de enviar (15/10/2026: «sus formularios no tienen
   excepciones»). El servidor vuelve a validar por su cuenta. */
const REGLAS = {
  nombres: [obligatorio('Escribe los nombres.'), nombrePersona],
  apellidos: [obligatorio('Escribe los apellidos.'), nombrePersona],
  cedula: [obligatorio('Escribe la cédula.'), cedula],
  telefono: [telefono],
  correo: [obligatorio('Escribe el correo: será su usuario de acceso.'), correo],
  direccion: [largo(5, 120, 'La dirección')],
  numero_registro: [obligatorio('Elige el número de registro del carné.')],
  plan_id: [obligatorio('Elige un plan.')],
  // Una cortesía no se cobra: el campo ni se pinta y su regla no corre.
  precio_pagado: [salvoCortesia(obligatorio('Escribe el precio pagado.')), salvoCortesia(reglaPrecio())],
  ...REGLAS_CORTESIA,
}

const ETIQUETAS: Record<string, string> = {
  nombres: 'Nombres',
  apellidos: 'Apellidos',
  cedula: 'Cédula',
  telefono: 'Teléfono',
  correo: 'Correo electrónico',
  direccion: 'Dirección',
  numero_registro: 'Número de registro',
  plan_id: 'Plan',
  precio_pagado: 'Precio pagado',
  ...ETIQUETAS_CORTESIA,
}

/**
 * Sin tarjeta contenedora. Dentro de un overlay la superficie ya la pone el
 * propio overlay: envolver otra vez daría una tarjeta sobre otra.
 *
 * El estado del formulario vive en `FormularioMiembro`; esta capa solo lo
 * remonta (vía `key`) cuando se pulsa «Registrar otro», para volver a un
 * formulario limpio sin navegar.
 */
export function MiembroForm(props: {
  ciudades: Opcion[]
  planes: PlanOpcion[]
  numerosDisponibles: string[]
  /** Solo el super_admin puede dar cortesías; al empleado la casilla no se pinta. */
  puedeCortesia: boolean
}) {
  const [instancia, setInstancia] = useState(0)
  return (
    <FormularioMiembro
      key={instancia}
      {...props}
      onRegistrarOtro={() => setInstancia((n) => n + 1)}
    />
  )
}

function FormularioMiembro({
  ciudades,
  planes,
  numerosDisponibles,
  puedeCortesia,
  onRegistrarOtro,
}: {
  ciudades: Opcion[]
  planes: PlanOpcion[]
  numerosDisponibles: string[]
  puedeCortesia: boolean
  onRegistrarOtro: () => void
}) {
  const cerrar = useCerrarOverlay()
  const [state, formAction, pending] = useActionState(registrarMiembro, estadoInicial)
  const [precio, setPrecio] = useState(planes[0] ? String(planes[0].precio) : '')
  const [esCortesia, setEsCortesia] = useState(false)
  const v = useValidacion(REGLAS)

  const sinPlanes = planes.length === 0
  const sinNumeros = numerosDisponibles.length === 0
  const bloqueado = sinPlanes || sinNumeros

  // Registro completado: la pantalla cambia por entero a entregar credenciales.
  if (state.ok && state.numero) {
    return (
      <Credenciales estado={state} onCerrar={cerrar} onRegistrarOtro={onRegistrarOtro} />
    )
  }

  return (
    <>
      <form action={formAction} className={styles.formulario} {...v.propsFormulario}>
        <ResumenErrores errores={v.errores} etiquetas={ETIQUETAS} ir={v.ir} />

        {/* `key` con el mensaje: si el alta vuelve a fallar con el MISMO error,
            React reutilizaría el nodo y el lector no lo re-anunciaría. */}
        {state.error && (
          <Alert key={state.error} tone="danger">
            {state.error}
          </Alert>
        )}

        {sinPlanes && (
          <Alert tone="warning" title="No hay planes activos">
            Activa al menos un plan de membresía antes de registrar un miembro.
          </Alert>
        )}

        {sinNumeros && (
          <Alert tone="warning" title="No hay números de registro disponibles">
            Un administrador debe cargar un rango de números en «Miembros →
            Números de registro» antes de poder registrar un miembro.
          </Alert>
        )}

        <Section title="Datos del cliente">
          <Stack gap={5}>
            <div className={styles.pareja}>
              <Field label="Nombres" error={v.error('nombres')}>
                <Input name="nombres" autoComplete="given-name" required autoFocus />
              </Field>
              <Field label="Apellidos" error={v.error('apellidos')}>
                <Input name="apellidos" autoComplete="family-name" required />
              </Field>
            </div>

            <div className={styles.pareja}>
              <Field label="Cédula" help="Sin puntos ni espacios." error={v.error('cedula')}>
                <Input name="cedula" numeric inputMode="numeric" required />
              </Field>
              <Field
                label="Teléfono"
                optional
                help="Celular de 10 cifras. Por aquí le escribimos por WhatsApp."
                error={v.error('telefono')}
              >
                <Input name="telefono" type="tel" numeric inputMode="tel" />
              </Field>
            </div>

            <Field
              label="Correo electrónico"
              help="Será su usuario de acceso al portal de miembros."
              error={v.error('correo')}
            >
              <Input name="correo" type="email" autoComplete="email" required />
            </Field>

            <div className={styles.pareja}>
              <Field label="Ciudad" optional>
                <SelectMenu
                  name="ciudad_id"
                  etiqueta="Ciudad"
                  placeholder="Sin ciudad"
                  opciones={[
                    { value: '', label: 'Sin ciudad' },
                    ...ciudades.map((c) => ({ value: String(c.id), label: c.nombre })),
                  ]}
                />
              </Field>
              <Field label="Dirección" optional error={v.error('direccion')}>
                <Input name="direccion" autoComplete="street-address" />
              </Field>
            </div>
          </Stack>
        </Section>

        <Divider />

        <Section title="Primera membresía">
          <Stack gap={5}>
            <Field
              label="Número de registro"
              help="El número impreso en el carné que vas a entregar."
              error={v.error('numero_registro')}
            >
              <SelectMenu
                name="numero_registro"
                etiqueta="Número de registro"
                defaultValue={numerosDisponibles[0] ?? ''}
                opciones={numerosDisponibles.map((n) => ({ value: n, label: n }))}
              />
            </Field>

            <div className={styles.pareja}>
              <Field label="Plan" error={v.error('plan_id')}>
                <SelectMenu
                  name="plan_id"
                  etiqueta="Plan"
                  defaultValue={planes[0] ? String(planes[0].id) : ''}
                  opciones={planes.map((p) => ({
                    value: String(p.id),
                    label: `${p.nombre} · $ ${p.precio.toLocaleString('es-CO')}`,
                  }))}
                  onChange={(valor) => {
                    const plan = planes.find((p) => p.id === Number(valor))
                    if (plan) setPrecio(String(plan.precio))
                  }}
                />
              </Field>

              {!esCortesia && (
                <Field label="Precio pagado" help="Ajústalo si hubo un descuento." error={v.error('precio_pagado')}>
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
                label="Membresía de cortesía"
                description="No se cobra: queda registrada como cortesía y no suma a los ingresos ni a las ventas."
                checked={esCortesia}
                onChange={(e) => setEsCortesia(e.target.checked)}
                disabled={sinPlanes}
              />
            )}

            {puedeCortesia && esCortesia && <DuracionCortesia error={v.error} />}

            <p className={styles.nota}>
              Al guardar se asigna el número elegido y se envía un correo para que
              el cliente active su acceso.
            </p>
          </Stack>
        </Section>

        <div className={styles.acciones}>
          <Button
            type="submit"
            loading={pending}
            disabled={bloqueado}
            icon={<UserPlus size={16} />}
          >
            Registrar miembro
          </Button>

          <Button type="button" variant="secondary" onClick={cerrar}>
            Cancelar
          </Button>
        </div>
      </form>
    </>
  )
}

/* ========================================================================== */

function Credenciales({
  estado,
  onCerrar,
  onRegistrarOtro,
}: {
  estado: RegistrarMiembroState
  onCerrar: () => void
  onRegistrarOtro: () => void
}) {
  return (
    <>
      <div className={styles.credenciales}>
        <Alert tone="success" title={`${estado.nombre} quedó registrado`} />

        <Alert tone="success" title="Correo de activación enviado">
          Se envió un enlace de un solo uso a {estado.correo} para que el cliente
          elija su propia contraseña.
        </Alert>

        <div className={styles.credencial}>
          <span className={styles.credencialEtiqueta}>Número de membresía</span>
          <Copiar valor={estado.numero!} label="Copiar número de membresía">
            <span className={styles.credencialValor}>{estado.numero}</span>
          </Copiar>
        </div>

        <div className={styles.acciones}>
          <Button type="button" onClick={onCerrar}>
            Ir a la lista
          </Button>
          <Button type="button" variant="secondary" onClick={onRegistrarOtro}>
            Registrar otro
          </Button>
        </div>
      </div>
    </>
  )
}
