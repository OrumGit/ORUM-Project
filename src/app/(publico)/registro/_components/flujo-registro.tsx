'use client'

import Image from 'next/image'
import { useActionState, useEffect, useState, type ReactNode } from 'react'
import { ArrowRight, ArrowLeftRight, Lock, Mail, RotateCw } from 'lucide-react'
import { CampoContrasenaNueva } from '@/components/auth/campo-contrasena-nueva'
import { OjoAnimado } from '@/components/auth/ojo-animado'
import { CodigoVerificacion } from '@/components/pago/codigo-verificacion'
import { PasosPago } from '@/components/pago/pasos-pago'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input, InputButton } from '@/components/ui/input'
import { AdornoEstrella } from '@/components/ui/marca/marca'
import monograma from '@/components/ui/marca/monograma.png'
import { SelectMenu } from '@/components/ui/select-menu'
import { Turnstile, useTurnstile } from '@/components/ui/turnstile'
import { useValidacion } from '@/components/ui/validacion'
import { revisarDireccion } from '@/lib/aliados/solicitud-aliado'
import {
  cedula,
  contrasena,
  correo,
  igualA,
  nombrePersona,
  obligatorio,
  telefono,
  type Regla,
  type ReglasFormulario,
} from '@/lib/validacion/reglas'
import { iniciarRegistro, type RegistroState } from '../actions'
import {
  confirmarCodigoRegistro,
  reenviarCodigoRegistro,
  type ConfirmarCodigoState,
  type ReenviarCodigoState,
} from '../codigo-actions'
import { iniciarPagoRegistro, type IniciarPagoState } from '../pagar/actions'
import estilos from './flujo-registro.module.css'

/*
  EL REGISTRO CON PAGO, EN UNA SOLA VENTANA  ·  (diseño aprobado el
  23/11/2026, «ORUM — Pago con Mercado Pago»)
  ---------------------------------------------------------------------------
  Tres pasos sin salir de la ventana: 1 · Tus datos → 2 · Tu correo (el
  código de 6 dígitos) → 3 · Pago (abre Mercado Pago). Los tres pasos viven
  montados a la vez —el que no toca va `hidden`—: volver a «Tus datos» para
  corregir el correo conserva lo escrito.

  Quien lo usa pone el MARCO (`marco`): la ventana de la ruta interceptada
  (`Overlay`, con los pasos en su cabecera y el botón en su pie pegado) o la
  página a pantalla completa de un enlace directo. El botón de cada paso va
  en el pie y apunta a su formulario con `form=`.
*/

export type PlanRegistro = {
  id: number
  nombre: string
  precio: number
  precioTexto: string
  /** «mes», «año». */
  periodo: string
}

export type CiudadRegistro = { id: number; nombre: string }

export type PartesMarco = {
  /** Los pasos, para la cabecera. */
  encabezado: ReactNode
  cuerpo: ReactNode
  /** El botón del paso y su nota, para el pie pegado. */
  pie: ReactNode
  /** El nombre del paso, para nombrar el diálogo. */
  titulo: string
}

type Paso = 1 | 2 | 3

const ACEPTADO: Regla = (valor) =>
  valor === 'on' ? null : 'Acepta los términos y el aviso de privacidad para continuar.'

const REGLAS: ReglasFormulario = {
  nombres: [obligatorio('Escribe tus nombres.'), nombrePersona],
  apellidos: [obligatorio('Escribe tus apellidos.'), nombrePersona],
  cedula: [obligatorio('Escribe tu número de cédula.'), cedula],
  telefono: [obligatorio('Escribe tu celular.'), telefono],
  correo: [obligatorio('Escribe tu correo electrónico.'), correo],
  ciudad_id: [obligatorio('Elige tu ciudad.')],
  direccion: [obligatorio('Escribe tu dirección.'), (valor) => revisarDireccion(valor)],
  contrasena: [obligatorio('Crea una contraseña.'), contrasena],
  confirmar: [obligatorio('Repite la contraseña.'), igualA('contrasena', 'Las dos contraseñas no coinciden.')],
  terminos: [ACEPTADO],
}

const SEGUNDOS_REENVIO = 45

/** El servidor nombra algunos campos distinto que el formulario. */
const CAMPO_DEL_SERVIDOR: Record<string, string> = { ciudadId: 'ciudad_id' }

/** El orden de los campos, para llevar el foco al primero que el servidor rechazó. */
const ORDEN_CAMPOS = [
  'nombres',
  'apellidos',
  'cedula',
  'telefono',
  'correo',
  'ciudad_id',
  'direccion',
  'contrasena',
  'confirmar',
  'terminos',
]

export function FlujoRegistro({
  planes,
  planInicial,
  ciudades,
  marco,
  vistaPrevia,
}: {
  planes: PlanRegistro[]
  planInicial: number
  ciudades: CiudadRegistro[]
  marco: (partes: PartesMarco) => ReactNode
  /** Solo `/dev/pago`: abre en un paso con datos falsos, sin enviar nada. */
  vistaPrevia?: { paso: Paso; correo: string; nombre: string }
}) {
  const [paso, setPaso] = useState<Paso>(vistaPrevia?.paso ?? 1)
  const [planId, setPlanId] = useState(planInicial)
  const plan = planes.find((p) => p.id === planId) ?? planes[0]
  const [nombre, setNombre] = useState(vistaPrevia?.nombre ?? '')

  const [espera, setEspera] = useState(SEGUNDOS_REENVIO)

  // --- Paso 1: tus datos -------------------------------------------------------
  const [registro, enviarRegistro, registrando] = useActionState(
    async (previo: RegistroState, datos: FormData) => {
      setNombre(String(datos.get('nombres') ?? '').trim().split(/\s+/)[0] ?? '')
      const r = await iniciarRegistro(previo, datos)
      if (r.ok) {
        setEspera(SEGUNDOS_REENVIO)
        setPaso(2)
      }
      return r
    },
    { ok: false } as RegistroState,
  )
  const validacion = useValidacion(REGLAS)
  const turnstile = useTurnstile()
  const [clave, setClave] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [verConfirmar, setVerConfirmar] = useState(false)
  const [eligiendoPlan, setEligiendoPlan] = useState(false)
  // Los errores del servidor, con los nombres del formulario.
  const erroresServidor: Record<string, string> = {}
  for (const [campo, mensaje] of Object.entries(registro.errores ?? {})) {
    if (mensaje) erroresServidor[CAMPO_DEL_SERVIDOR[campo] ?? campo] = mensaje
  }
  const errorDe = (campo: string) => validacion.error(campo) ?? erroresServidor[campo] ?? null

  // Si el servidor rechaza algo, el foco va al primer campo marcado (solo al
  // llegar una respuesta nueva).
  useEffect(() => {
    const errores = registro.errores ?? {}
    const nombres = Object.keys(errores).map((c) => CAMPO_DEL_SERVIDOR[c] ?? c)
    const primero = ORDEN_CAMPOS.find((c) => nombres.includes(c))
    if (!primero) return
    document
      .querySelector<HTMLElement>(`#form-registro [name="${primero}"]:not([type="hidden"])`)
      ?.focus()
  }, [registro])

  // --- Paso 2: el código ---------------------------------------------------------
  const [codigo, enviarCodigo, confirmando] = useActionState(
    async (previo: ConfirmarCodigoState, datos: FormData) => {
      const r = await confirmarCodigoRegistro(previo, datos)
      if (r.ok) setPaso(3)
      return r
    },
    { ok: false } as ConfirmarCodigoState,
  )
  const [reenvio, reenviar, reenviando] = useActionState(
    async (previo: ReenviarCodigoState, datos: FormData) => {
      const r = await reenviarCodigoRegistro(previo, datos)
      if (r.enviado) setEspera(SEGUNDOS_REENVIO)
      return r
    },
    { enviado: false } as ReenviarCodigoState,
  )
  useEffect(() => {
    if (paso !== 2 || espera <= 0) return
    const t = window.setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => window.clearTimeout(t)
  }, [paso, espera])

  // --- Paso 3: el pago -------------------------------------------------------------
  const [pago, pagar, abriendoPago] = useActionState(iniciarPagoRegistro, {} as IniciarPagoState)

  const correoEnviado = registro.correo ?? vistaPrevia?.correo ?? ''

  const encabezado = <PasosPago actual={paso} />

  const cuerpo = (
    <div className={estilos.flujo}>
      {/* ============================ 1 · TUS DATOS ============================ */}
      <section hidden={paso !== 1} aria-labelledby="titulo-datos" className={estilos.paso}>
        <TarjetaPlan
          plan={plan}
          planes={planes}
          abierto={eligiendoPlan}
          onAbrir={() => setEligiendoPlan((v) => !v)}
          onElegir={(id) => {
            setPlanId(id)
            setEligiendoPlan(false)
          }}
        />

        <h2 id="titulo-datos" className={estilos.titulo}>
          <span>
            Crea tu <em>cuenta</em>
          </span>
          <AdornoEstrella />
        </h2>

        {registro.mensaje && !registro.ok && (
          <Alert tone="danger" title="No pudimos continuar">
            {erroresServidor.planId ?? registro.mensaje}
          </Alert>
        )}

        <form id="form-registro" {...validacion.propsFormulario} action={enviarRegistro} className={estilos.rejilla}>
          <input type="hidden" name="plan_id" value={plan.id} />
          <Field label="Nombres" error={errorDe('nombres')}>
            <Input name="nombres" autoComplete="given-name" maxLength={80} />
          </Field>
          <Field label="Apellidos" error={errorDe('apellidos')}>
            <Input name="apellidos" autoComplete="family-name" maxLength={80} />
          </Field>
          <Field label="Cédula" error={errorDe('cedula')}>
            <Input name="cedula" inputMode="numeric" autoComplete="off" maxLength={15} />
          </Field>
          <Field label="Celular" error={errorDe('telefono')}>
            <Input name="telefono" type="tel" inputMode="tel" autoComplete="tel" maxLength={16} />
          </Field>
          <div className={estilos.ancho}>
            <Field label="Correo" error={errorDe('correo')}>
              <Input
                name="correo"
                type="email"
                autoComplete="email"
                spellCheck={false}
                autoCapitalize="none"
                maxLength={254}
              />
            </Field>
          </div>
          <Field label="Ciudad" error={errorDe('ciudad_id')}>
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
          <Field label="Dirección" error={errorDe('direccion')}>
            <Input name="direccion" autoComplete="street-address" maxLength={120} />
          </Field>
          <div className={estilos.ancho}>
            <CampoContrasenaNueva
              name="contrasena"
              label="Crea una contraseña"
              value={clave}
              onChange={setClave}
              error={errorDe('contrasena')}
              ver={verClave}
              onVer={() => setVerClave((v) => !v)}
            />
          </div>
          <div className={estilos.ancho}>
            <Field label="Repítela" error={errorDe('confirmar')}>
              <Input
                name="confirmar"
                type={verConfirmar ? 'text' : 'password'}
                autoComplete="new-password"
                maxLength={128}
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                spellCheck={false}
                autoCapitalize="none"
                endAdornment={
                  <InputButton
                    label={verConfirmar ? 'Ocultar la contraseña repetida' : 'Mostrar la contraseña repetida'}
                    onClick={() => setVerConfirmar((v) => !v)}
                  >
                    <OjoAnimado visible={verConfirmar} />
                  </InputButton>
                }
              />
            </Field>
            {confirmar !== '' && confirmar === clave && !errorDe('confirmar') && (
              <p className={estilos.coinciden}>Las dos coinciden</p>
            )}
          </div>

          <div className={estilos.ancho}>
            <label className={estilos.casilla}>
              <input type="checkbox" name="terminos" className={estilos.casillaInput} />
              <span className={estilos.casillaCaja} aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M5.5 12.5l4.2 4.2 8.8-9.4" />
                </svg>
              </span>
              <span>
                Acepto los{' '}
                <a href="/terminos" target="_blank" rel="noopener noreferrer">
                  términos
                </a>{' '}
                y el{' '}
                <a href="/privacidad" target="_blank" rel="noopener noreferrer">
                  aviso de privacidad
                </a>
                .
              </span>
            </label>
            {errorDe('terminos') && (
              <p role="alert" className={estilos.errorCampo}>
                {errorDe('terminos')}
              </p>
            )}
          </div>

          <div className={estilos.ancho}>
            <Turnstile {...turnstile.enlace} tema="light" reiniciarAl={registro} />
          </div>
        </form>
      </section>

      {/* ============================ 2 · TU CORREO ============================ */}
      <section hidden={paso !== 2} aria-labelledby="titulo-correo" className={`${estilos.paso} ${estilos.centrado}`}>
        <span className={estilos.aro} aria-hidden="true">
          <Mail size={26} strokeWidth={1.6} />
        </span>
        <h2 id="titulo-correo" className={estilos.titulo}>
          <span>
            Revisa tu <em>correo</em>
          </span>
        </h2>
        <p className={estilos.texto}>
          Escribe el código de 6 cifras que enviamos a
          <strong className={estilos.correo}>{correoEnviado}</strong>
        </p>

        <form id="form-codigo" action={enviarCodigo} className={estilos.formCodigo}>
          <input type="hidden" name="correo" value={correoEnviado} />
          {paso === 2 && (
            <CodigoVerificacion
              name="codigo"
              reinicio={codigo}
              error={codigo.error}
              disabled={confirmando}
              onCompleto={() =>
                (document.getElementById('form-codigo') as HTMLFormElement | null)?.requestSubmit()
              }
            />
          )}
        </form>

        <div className={estilos.ayudas}>
          <form action={reenviar} className={estilos.lineaAyuda}>
            <input type="hidden" name="correo" value={correoEnviado} />
            ¿No te llegó? Mira en «Spam» o{' '}
            {espera > 0 ? (
              <span className={estilos.espera}>pide otro en 0:{String(espera).padStart(2, '0')}</span>
            ) : (
              <button type="submit" className={estilos.enlace} disabled={reenviando}>
                <RotateCw size={14} aria-hidden="true" /> pide otro código
              </button>
            )}
          </form>
          <p role="status" className={estilos.lineaAyuda}>
            {reenvio.enviado && !reenvio.error ? 'Te enviamos un código nuevo. Usa el último que te llegue.' : ''}
          </p>
          {reenvio.error && (
            <p role="alert" className={estilos.errorCampo}>
              {reenvio.error}
            </p>
          )}
          <p className={estilos.lineaAyuda}>
            ¿Escribiste mal tu correo?{' '}
            <button type="button" className={estilos.enlace} onClick={() => setPaso(1)}>
              Corrígelo
            </button>
          </p>
          <p className={estilos.nota}>
            El correo también trae un botón: si lo tocas, sigues desde ahí. Si ese correo ya tenía cuenta en
            ORUM, te llega un aviso para entrar en vez del código.
          </p>
        </div>
      </section>

      {/* ============================ 3 · PAGO ============================ */}
      <section hidden={paso !== 3} aria-labelledby="titulo-pago" className={estilos.paso}>
        <h2 id="titulo-pago" className={estilos.titulo}>
          <span>
            Todo listo para <em>pagar</em>
            {nombre && `, ${nombre}`}
          </span>
        </h2>
        <ResumenPago plan={plan} />
        {pago.error && (
          <Alert tone="warning" title="No pudimos abrir el pago">
            {pago.error}
          </Alert>
        )}
        <form id="form-pago" action={pagar}>
          <input type="hidden" name="plan_id" value={plan.id} />
        </form>
      </section>
    </div>
  )

  const pie =
    paso === 1 ? (
      <PieBoton
        form="form-registro"
        cargando={registrando}
        deshabilitado={!turnstile.listo}
        icono={<ArrowRight size={18} aria-hidden="true" />}
        nota={
          turnstile.listo
            ? 'Aún no te cobramos nada. Tu número de socio llega cuando el pago se confirme.'
            : turnstile.estado === 'error'
              ? 'No cargó la verificación anti-robots. Recarga la página o desactiva el bloqueador de anuncios.'
              : 'Comprobando que no eres un robot… un momento.'
        }
      >
        Continuar
      </PieBoton>
    ) : paso === 2 ? (
      <PieBoton
        form="form-codigo"
        cargando={confirmando}
        nota="Al escribir la sexta cifra, seguimos solos. Si cierras, tu cuenta queda creada: entra con tu correo para terminar."
      >
        Confirmar mi correo
      </PieBoton>
    ) : (
      <PieBoton
        form="form-pago"
        cargando={abriendoPago}
        icono={<Lock size={18} aria-hidden="true" />}
        iconoAntes
        nota="Te llevamos a Mercado Pago y, al terminar, vuelves aquí solo. Si cierras, entra con tu correo para terminar después."
      >
        Pagar {plan.precioTexto} con Mercado Pago
      </PieBoton>
    )

  return marco({
    encabezado,
    cuerpo,
    pie,
    titulo: paso === 1 ? 'Crea tu cuenta' : paso === 2 ? 'Revisa tu correo' : 'Pago',
  })
}

/* -------------------------------------------------------------------------- */

function PieBoton({
  form,
  cargando,
  deshabilitado = false,
  icono,
  iconoAntes = false,
  nota,
  children,
}: {
  form: string
  cargando: boolean
  deshabilitado?: boolean
  icono?: ReactNode
  iconoAntes?: boolean
  nota: string
  children: ReactNode
}) {
  return (
    <div className={estilos.pie}>
      <Button
        type="submit"
        form={form}
        variant="brand"
        size="lg"
        pildora
        fullWidth
        loading={cargando}
        disabled={deshabilitado}
        icon={iconoAntes ? icono : undefined}
      >
        {children}
        {!iconoAntes && icono}
      </Button>
      <p className={estilos.nota} aria-live="polite">
        {nota}
      </p>
    </div>
  )
}

/** El plan elegido, siempre a la vista; «Cambiar plan» despliega los demás. */
function TarjetaPlan({
  plan,
  planes,
  abierto,
  onAbrir,
  onElegir,
}: {
  plan: PlanRegistro
  planes: PlanRegistro[]
  abierto: boolean
  onAbrir: () => void
  onElegir: (id: number) => void
}) {
  return (
    <div className={estilos.tarjetaPlan}>
      <div className={estilos.planFila}>
        <div className={estilos.planDatos}>
          <Image className={estilos.planLogo} src={monograma} alt="" aria-hidden="true" />
          <div className={estilos.planTextos}>
            <p className={estilos.planNombre}>Membresía {plan.nombre}</p>
            <p className={estilos.planPrecio}>
              <strong>{plan.precioTexto}</strong> al {plan.periodo} · se renueva sola
            </p>
          </div>
        </div>
        {planes.length > 1 && (
          <button
            type="button"
            className={estilos.cambiar}
            aria-expanded={abierto}
            aria-controls="lista-planes"
            onClick={onAbrir}
          >
            <ArrowLeftRight size={14} aria-hidden="true" />
            Cambiar plan
          </button>
        )}
      </div>
      {abierto && (
        <div id="lista-planes" role="radiogroup" aria-label="Elige tu plan" className={estilos.planes}>
          {planes.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={p.id === plan.id}
              className={estilos.opcionPlan}
              onClick={() => onElegir(p.id)}
            >
              <span className={estilos.opcionNombre}>{p.nombre}</span>
              <span className={estilos.opcionPrecio}>
                {p.precioTexto} <span>/ {p.periodo}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** Lo que se compra, en grande y sin letra menuda (paso 3 y «Completa tu membresía»). */
export function ResumenPago({ plan }: { plan: PlanRegistro }) {
  return (
    <div className={estilos.resumen}>
      <div className={estilos.resumenFila}>
        <div className={estilos.planDatos}>
          <Image className={estilos.planLogo} src={monograma} alt="" aria-hidden="true" />
          <div className={estilos.planTextos}>
            <p className={estilos.resumenNombre}>Membresía ORUM · {plan.nombre}</p>
            <p className={estilos.planPrecio}>Desde que se confirme el pago</p>
          </div>
        </div>
        <p className={estilos.resumenPrecio}>{plan.precioTexto}</p>
      </div>
      <ul className={estilos.resumenLista}>
        <li>
          <RotateCw size={18} aria-hidden="true" />
          <span>
            <strong>Se renueva sola cada {plan.periodo}</strong> con la misma tarjeta. Puedes apagar la renovación
            cuando quieras desde tu perfil.
          </span>
        </li>
        <li>
          <Lock size={18} aria-hidden="true" />
          <span>
            Pagas en <strong>Mercado Pago</strong>, con tarjeta. ORUM nunca ve los datos de tu tarjeta.
          </span>
        </li>
      </ul>
    </div>
  )
}
