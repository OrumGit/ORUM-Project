'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { CheckCircle2, Send } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, Textarea } from '@/components/ui/input'
import { Stack } from '@/components/ui/layout'
import { Turnstile, useTurnstile } from '@/components/ui/turnstile'
import { Checkbox } from '@/components/ui/toggle'
import { WhatsAppButton } from '@/components/ui/whatsapp-button'
import {
  CAMPO_ABIERTO_EN,
  CAMPO_TRAMPA,
  CATEGORIAS_ALIADO,
  CIUDADES_ALIADO,
  MAX_DESCRIPCION,
  type SolicitudAliadoState,
} from '@/lib/aliados/solicitud-aliado'
import { enviarSolicitudAliado } from '../actions'
import { SelectorOpciones } from './selector-opciones'
import estilos from './formulario-aliado.module.css'

const ESTADO_INICIAL: SolicitudAliadoState = {}

const MENSAJE_WHATSAPP =
  'Hola, tengo un negocio y me interesa aliarme con ORUM. ¿Me cuentan cómo?'

type Props = {
  /**
   * Dónde se está pintando. El overlay ya tiene título, descripción y una forma
   * de cerrarse, así que el formulario NO los repite; la página sí necesita que
   * el éxito ofrezca una salida, porque si no deja al visitante en un callejón.
   */
  superficie: 'overlay' | 'pagina'
  /** Instante del reloj del SERVIDOR en que se pintó. Ver `pareceAutomatico`. */
  abiertoEn: number
  soporte: string | null
  onCerrar?: () => void
}

/**
 * El formulario del comercio que quiere aliarse.
 *
 * NO pone su propia tarjeta: la superficie la pone quien lo usa —el `Overlay`
 * en la landing, la `Card` en `/aliados`—. Es el mismo componente en las dos,
 * porque dos copias se desincronizan a la primera corrección.
 */
export function FormularioAliado({ superficie, abiertoEn, soporte, onCerrar }: Props) {
  const turnstile = useTurnstile()
  const [state, formAction, pending] = useActionState(
    enviarSolicitudAliado,
    ESTADO_INICIAL,
  )

  const errores = state.errores ?? {}
  const previos = state.valores

  if (state.ok) {
    return (
      <div className={estilos.exito}>
        <div className={estilos.iconoExito} aria-hidden="true">
          <CheckCircle2 size={26} />
        </div>

        <h2 className={estilos.tituloExito}>Recibimos tu solicitud</h2>

        <p className={estilos.textoExito}>
          Nuestro equipo la revisa y te contacta al teléfono o al correo que nos
          dejaste. Suele tomar un par de días hábiles.
        </p>

        <div className={estilos.accionesExito}>
          {soporte && (
            <WhatsAppButton telefono={soporte} mensaje={MENSAJE_WHATSAPP}>
              Escribirnos por WhatsApp
            </WhatsAppButton>
          )}

          {/* La página necesita puerta de salida; el overlay ya tiene la suya. */}
          {superficie === 'overlay' ? (
            <Button variant="ghost" onClick={onCerrar}>
              Cerrar
            </Button>
          ) : (
            <Button href="/" variant="ghost">
              Volver al inicio
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <form action={formAction} className={estilos.formulario} noValidate>
      {/*
        `key` en la alerta, no en el <form>: remontar el formulario borraría los
        diez campos ya tecleados. El `key` solo existe para que un mismo mensaje
        repetido vuelva a anunciarse al lector de pantalla.
      */}
      {state.error && (
        <Alert
          key={state.error}
          tone="danger"
          actions={
            soporte ? (
              <WhatsAppButton telefono={soporte} mensaje={MENSAJE_WHATSAPP} size="sm">
                Escribir por WhatsApp
              </WhatsAppButton>
            ) : undefined
          }
        >
          {state.error}
        </Alert>
      )}

      {/*
        EL CAMPO TRAMPA. Fuera del orden de tabulación y anunciado como oculto,
        así que ninguna persona —ni con lector de pantalla— lo encuentra. Se
        esconde con una clase y no con `type="hidden"`: un robot que rellena por
        nombre de campo ignora los ocultos, y este tiene que parecer rellenable.
      */}
      <div className={estilos.trampa} aria-hidden="true">
        <label htmlFor={CAMPO_TRAMPA}>No rellenes este campo</label>
        <input
          id={CAMPO_TRAMPA}
          name={CAMPO_TRAMPA}
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <input type="hidden" name={CAMPO_ABIERTO_EN} value={abiertoEn} />

      <Stack gap={4}>
        <Field label="Nombre del comercio" error={errores.nombreComercio}>
          <Input
            name="nombreComercio"
            type="text"
            defaultValue={previos?.nombreComercio}
            autoComplete="organization"
            maxLength={80}
            required
          />
        </Field>

        <div className={estilos.pareja}>
          <Field label="Tu nombre y apellido" error={errores.nombreContacto}>
            <Input
              name="nombreContacto"
              type="text"
              defaultValue={previos?.nombreContacto}
              autoComplete="name"
              maxLength={60}
              required
            />
          </Field>

          <Field label="Cargo" optional error={errores.cargo}>
            <Input
              name="cargo"
              type="text"
              defaultValue={previos?.cargo}
              autoComplete="organization-title"
              maxLength={60}
            />
          </Field>
        </div>

        <div className={estilos.pareja}>
          <Field
            label="Teléfono"
            help="Celular de 10 dígitos, con WhatsApp si lo tienes"
            error={errores.telefono}
          >
            <Input
              name="telefono"
              type="tel"
              defaultValue={previos?.telefono}
              /* `type="tel"` da el teclado correcto; `inputMode` lo asegura en
                 los navegadores que lo ignoran. Nunca `type="number"`: descarta
                 el `+` y los ceros a la izquierda. */
              inputMode="tel"
              autoComplete="tel"
              placeholder="310 000 0000"
              maxLength={20}
              required
            />
          </Field>

          <Field label="Correo" error={errores.correo}>
            <Input
              name="correo"
              type="email"
              defaultValue={previos?.correo}
              autoComplete="email"
              maxLength={254}
              required
            />
          </Field>
        </div>

        <div className={estilos.pareja}>
          <Field label="Ciudad" error={errores.ciudad}>
            {/*
              El campo se ve como los demás; la lista que abre es el menú del
              sistema (ver `selector-opciones.tsx`): la del `<select>` nativo
              no admite diseño.
            */}
            <SelectorOpciones
              name="ciudad"
              etiqueta="Ciudad"
              opciones={CIUDADES_ALIADO}
              invitacion="Elige una ciudad"
              defaultValue={previos?.ciudad}
            />
          </Field>

          <Field label="Categoría" error={errores.categoria}>
            <SelectorOpciones
              name="categoria"
              etiqueta="Categoría"
              opciones={CATEGORIAS_ALIADO}
              invitacion="Elige una categoría"
              defaultValue={previos?.categoria}
            />
          </Field>
        </div>

        <Field label="Dirección" optional error={errores.direccion}>
          <Input
            name="direccion"
            type="text"
            defaultValue={previos?.direccion}
            autoComplete="street-address"
            placeholder="Cra 15 # 93-47"
            maxLength={120}
          />
        </Field>

        <Field
          label="¿Qué ofrece tu negocio?"
          help={`Un par de frases bastan. Máximo ${MAX_DESCRIPCION} caracteres.`}
          error={errores.descripcion}
        >
          <Textarea
            name="descripcion"
            defaultValue={previos?.descripcion}
            rows={4}
            maxLength={MAX_DESCRIPCION}
            required
          />
        </Field>

        <Field
          label="Sitio web o red social"
          optional
          help="Nos ayuda a conocerte antes de llamarte."
          error={errores.enlace}
        >
          <Input
            name="enlace"
            type="text"
            defaultValue={previos?.enlace}
            inputMode="url"
            autoComplete="url"
            placeholder="instagram.com/tunegocio"
            maxLength={200}
          />
        </Field>
      </Stack>

      {/*
        Enlaces reales dentro de la etiqueta del checkbox: un `<a>` anidado en
        un `<label>` navega sin además marcar la casilla —es el comportamiento
        estándar del navegador con hijos interactivos—, así que es seguro.
        `target="_blank"` para no perder los otros nueve campos ya escritos.
      */}
      <Checkbox
        name="aceptaTerminos"
        value="true"
        required
        defaultChecked={state.aceptaTerminos ?? false}
        label={
          <>
            Leí y acepto los{' '}
            <Link
              href="/terminos"
              target="_blank"
              rel="noopener noreferrer"
              className={estilos.enlaceLegal}
            >
              Términos y condiciones
            </Link>{' '}
            y la{' '}
            <Link
              href="/privacidad"
              target="_blank"
              rel="noopener noreferrer"
              className={estilos.enlaceLegal}
            >
              Política de privacidad
            </Link>
            .
          </>
        }
      />

      {/* El Portal Público va siempre en claro: el widget no sigue al sistema. */}
      <Turnstile {...turnstile.enlace} tema="light" reiniciarAl={state} />

      {/*
        Tinta, no oro: `CLAUDE.md` retiró al Portal Público de la lista de
        pantallas habilitadas para relleno dorado.
      */}
      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={pending}
        disabled={!turnstile.listo}
        icon={<Send size={17} />}
      >
        {pending ? 'Enviando…' : 'Enviar solicitud'}
      </Button>
    </form>
  )
}
