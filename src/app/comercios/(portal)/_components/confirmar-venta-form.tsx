'use client'

import { useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { Receipt } from 'lucide-react'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { SelectMenu } from '@/components/ui/select-menu'
import { TituloSeccion } from '@/components/ui/titulo-seccion'
import { formatearBeneficioCorto } from '@/lib/comercios/beneficios-formato'
import { calcularDescuento, calcularValorFinal } from '@/lib/comercios/ventas'
import type { RegistrarVentaState } from '../actions'
import type { MetodoRegistroVenta, TipoBeneficioCodigo } from '@/lib/supabase/database.types'
import styles from './verificar.module.css'

type Sucursal = { id: number; nombre: string | null }
type Promocion = {
  id: number
  titulo: string
  tipoCodigo: TipoBeneficioCodigo
  valor: number | null
  /** Vale AHORA (día y hora de Colombia). Si no, se ve apagada y no se puede elegir. */
  disponibleHoy: boolean
  /** «Hoy aplica desde las 6:00 p. m.», «Hoy no aplica»: por qué no se puede elegir ahora. */
  ahoraTexto?: string | null
  /** «Solo martes y jueves»; null si vale todos los días. */
  diasTexto: string | null
  /** «Condiciones y restricciones» de la promoción; null si no tiene. */
  restricciones: string | null
}

const PESOS = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

/** Separador de miles para lo que se está tecleando: `45000` → `45.000`. */
const MILES = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 })

/*
  Los montos viajan como cadena de dígitos y el servidor los lee con `Number()`.
  Cualquier separador o signo que se cuele daría `NaN` y la venta se rechazaría
  con un error que el cajero no sabría corregir, así que se filtra al teclear.
*/
const soloDigitos = (valor: string) => valor.replace(/\D+/g, '')

/** Tope de nueve dígitos: mil millones de pesos en una compra es un dedo pegado. */
const MAX_DIGITOS = 9

const enPesos = (digitos: string) => (digitos === '' ? '' : MILES.format(Number(digitos)))

/*
  EL FORMULARIO DE VENTA  ·  dentro de la ventana del veredicto (04/10/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: «mejora el diseño del formulario». Tres cambios, y
  los tres salen de cómo se usa esto: de pie, con una mano y el cliente
  delante.

    1. LA PROMOCIÓN ES UN DESPLEGABLE, como la sucursal, y NO existe «Sin
       promoción» (encargo del 05/10/2026: «que no esté la opción de poner
       sin promoción, y que las promociones estén en una lista desplegable,
       como las sucursales»). Antes eran opciones de un toque con «Sin
       promoción» marcada de entrada. Arranca vacío y hay que elegir una: se
       comprueba al enviar, igual que la sucursal. Solo un comercio sin
       promociones vigentes registra la venta sin promoción.
    2. EL DESCUENTO YA NO SE DISFRAZA DE CAMPO. Había un recuadro punteado con
       forma de campo que no se podía tocar. Lo que calcula la promoción es un
       RENGLÓN del recibo, no un control.
    3. EL PIE ES UN RECIBO: compra, descuento y total a cobrar, con el total
       en el serif de display. Es el número que se dice en voz alta.

  El estado de la venta (`state`, `formAction`, `pending`) lo pone la ventana:
  al registrarse, ella cambia entera al acuse y este formulario se desmonta.
*/
export function ConfirmarVentaForm({
  miembroId,
  membresiaId,
  numeroMembresia,
  metodo,
  sucursales,
  promociones,
  state,
  formAction,
  pending,
}: {
  miembroId: number
  membresiaId: number | null
  numeroMembresia: string
  metodo: MetodoRegistroVenta
  sucursales: Sucursal[]
  promociones: Promocion[]
  state: RegistrarVentaState
  formAction: (datos: FormData) => void
  pending: boolean
}) {
  const idTitulo = useId()
  const [promocionId, setPromocionId] = useState('')
  /*
    Vacíos, no `'0'`. Un cero de partida obliga a borrarlo antes de teclear —y
    si no se borra, el importe sale multiplicado por diez—. Lo que se ve cuando
    no hay nada escrito es el marcador de posición.
  */
  const [valorCompra, setValorCompra] = useState('')
  const [descuentoManual, setDescuentoManual] = useState('')
  /*
    LA SUCURSAL ARRANCA VACÍA A PROPÓSITO: preelegir una atribuiría la venta a
    una sede que nadie eligió. El desplegable es `SelectMenu` (la lista con el
    diseño del sitio), y un campo oculto no admite `required`: que haya una
    elegida se comprueba aquí, al enviar.
  */
  const [sucursalId, setSucursalId] = useState('')
  const [faltaSucursal, setFaltaSucursal] = useState(false)
  const campoSucursal = useRef<HTMLDivElement>(null)
  /* La promoción, igual: arranca vacía y se exige al enviar. */
  const [faltaPromocion, setFaltaPromocion] = useState(false)
  const campoPromocion = useRef<HTMLDivElement>(null)
  /*
    Y EL IMPORTE, con el MISMO aviso que los otros dos (encargo del
    05/10/2026). Llevaba `required`, y lo que salía al enviar vacío era el
    globo del navegador —otro aspecto, otro idioma según el sistema—, que
    además cortaba el envío antes de que se marcaran la promoción y la
    sucursal. Ahora los tres se comprueban aquí y se marcan a la vez.
  */
  const [faltaImporte, setFaltaImporte] = useState(false)
  const campoImporte = useRef<HTMLDivElement>(null)

  const promocionSeleccionada = promociones.find((p) => String(p.id) === promocionId) ?? null

  // Porcentaje y monto fijo se calculan solos; 2x1 y regalo los tasa el cajero.
  const calculoAutomatico =
    promocionSeleccionada?.tipoCodigo === 'porcentaje' ||
    promocionSeleccionada?.tipoCodigo === 'monto_fijo'
  const descuentoAMano = promocionSeleccionada !== null && !calculoAutomatico

  const valorDescuento = useMemo(() => {
    if (!promocionSeleccionada) return 0
    if (calculoAutomatico) {
      return calcularDescuento(
        promocionSeleccionada.tipoCodigo as 'porcentaje' | 'monto_fijo',
        promocionSeleccionada.valor ?? 0,
        Number(valorCompra) || 0,
      )
    }
    return Number(descuentoManual) || 0
  }, [promocionSeleccionada, calculoAutomatico, valorCompra, descuentoManual])

  const compra = Number(valorCompra) || 0
  const valorFinal = calcularValorFinal(compra, valorDescuento)
  const hayImporte = compra > 0

  const haySelectorSucursal = sucursales.length > 1
  const hayPromociones = promociones.length > 0
  /* Se exige elegir solo si hay alguna que hoy valga: si todas son de otros
     días, la venta se registra sin promoción, como en un comercio sin ellas. */
  const hayPromocionesHoy = promociones.some((p) => p.disponibleHoy)

  /* Sin importe, sin promoción o sin sucursal no se envía: se dice en el
     propio campo y se lleva el foco al primero que falte —enfocarlo lo trae
     a la vista si quedó bajo el pie pegado—. */
  const alEnviar = (e: FormEvent<HTMLFormElement>) => {
    const sinImporte = compra <= 0
    const sinPromocion = hayPromocionesHoy && promocionId === ''
    const sinSucursal = haySelectorSucursal && sucursalId === ''
    if (!sinImporte && !sinPromocion && !sinSucursal) return
    e.preventDefault()
    setFaltaImporte(sinImporte)
    setFaltaPromocion(sinPromocion)
    setFaltaSucursal(sinSucursal)
    if (sinImporte) campoImporte.current?.querySelector('input')?.focus()
    else if (sinPromocion) campoPromocion.current?.querySelector('button')?.focus()
    else campoSucursal.current?.querySelector('button')?.focus()
  }

  return (
    <form
      action={formAction}
      onSubmit={alEnviar}
      className={styles.formularioVenta}
      aria-labelledby={idTitulo}
    >
      <input type="hidden" name="miembro_id" value={miembroId} />
      <input type="hidden" name="membresia_id" value={membresiaId ?? ''} />
      <input type="hidden" name="numero_membresia" value={numeroMembresia} />
      <input type="hidden" name="metodo_registro" value={metodo} />
      {/* Lo que viaja es SIEMPRE este: la cifra tecleada en los tipos que tasa
          el cajero, o la que calcula la promoción. El servidor la recalcula
          de todos modos y no confía en ella. */}
      <input type="hidden" name="valor_descuento" value={valorDescuento} />
      {/* Con una sola sucursal no hay nada que elegir: se manda oculta. */}
      {!haySelectorSucursal && (
        <input type="hidden" name="sucursal_id" value={sucursales[0]?.id ?? ''} />
      )}

      <TituloSeccion id={idTitulo} como="h2" tamano="bloque" texto="Registrar venta" />

      {/* `key` con el propio mensaje: sin él, dos fallos idénticos seguidos no
          se vuelven a anunciar al lector de pantalla. */}
      {state.error && (
        <Alert key={state.error} tone="danger">
          {state.error}
        </Alert>
      )}

      {/*
        EL IMPORTE VA PRIMERO. Es el único dato que el cajero tiene que teclear
        y el que decide el total; la promoción y la sucursal son elecciones de
        lista. `styles.importe` va en el ENVOLTORIO, no en el `Input`: ver el
        porqué de la especificidad en `verificar.module.css`.
      */}
      <div ref={campoImporte} className={styles.importe}>
        <Field
          label="Valor de la compra"
          error={faltaImporte ? 'Escribe el valor de la compra.' : null}
        >
          <Input
            /*
              El campo VISIBLE no se envía: lleva los puntos de millar para que
              el cajero vea de un vistazo si se le fue un cero. Lo que viaja son
              los dígitos limpios del `hidden` de abajo —el servidor los parsea
              con `Number()` y cualquier separador daría `NaN`—.

              `text` con `inputMode="numeric"`, no `type="number"`: en Android
              el teclado de `number` trae `+`, `-` y coma —ninguno vale aquí,
              son pesos enteros— y los spinners nativos son un blanco de toque
              parásito para quien maneja el móvil de pie y con una mano.

              `enterKeyHint="done"`: con el teclado abierto, el total y el botón
              quedan debajo; la propia tecla de retorno lo cierra.
            */
            type="text"
            inputMode="numeric"
            pattern="[0-9.]*"
            enterKeyHint="done"
            autoComplete="off"
            placeholder="0"
            numeric
            value={enPesos(valorCompra)}
            onChange={(e) => {
              setValorCompra(soloDigitos(e.target.value).slice(0, MAX_DIGITOS))
              setFaltaImporte(false)
            }}
            /* Sin `required`: lo comprueba `alEnviar`, con el aviso del sitio. */
            aria-required="true"
          />
        </Field>
        <input type="hidden" name="valor_compra" value={valorCompra || '0'} />
      </div>

      {/* ── LA PROMOCIÓN ─────────────────────────────────────────────────── */}
      {hayPromociones ? (
        <div ref={campoPromocion}>
          <Field
            label="Promoción"
            error={faltaPromocion ? 'Elige la promoción que se aplica a esta venta.' : null}
          >
            <SelectMenu
              name="promocion_id"
              etiqueta="Promoción"
              placeholder={hayPromocionesHoy ? 'Selecciona una promoción' : 'Hoy ninguna aplica'}
              value={promocionId}
              onChange={(id) => {
                setPromocionId(id)
                setFaltaPromocion(false)
              }}
              opciones={promociones.map((p) => ({
                value: String(p.id),
                /* La cifra corta DELANTE («30% · …»): si el título es largo
                   y se corta, lo que se pierde es el final, no el beneficio. */
                label: `${formatearBeneficioCorto(p.tipoCodigo, p.valor)} · ${p.titulo}`,
                /* La que hoy no toca se ve apagada y dice por qué. */
                disabled: !p.disponibleHoy,
                nota: p.disponibleHoy
                  ? (p.diasTexto ?? undefined)
                  : [p.diasTexto, p.ahoraTexto ?? 'hoy no aplica'].filter(Boolean).join(' · '),
              }))}
            />
          </Field>

          {/* Lo que el cajero tiene que leer ANTES de aplicar el descuento. */}
          {promocionSeleccionada?.restricciones && (
            <Alert tone="info" title="Condiciones y restricciones">
              <span className={styles.restricciones}>{promocionSeleccionada.restricciones}</span>
            </Alert>
          )}
        </div>
      ) : (
        /* Sin promociones vigentes no hay nada que elegir. */
        <input type="hidden" name="promocion_id" value="" />
      )}

      {/* 2x1 y regalo no se pueden calcular: los tasa el cajero. */}
      {descuentoAMano && (
        <Field label="Descuento" help="Escribe cuánto se descontó con esta promoción.">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9.]*"
            enterKeyHint="done"
            autoComplete="off"
            placeholder="0"
            numeric
            value={enPesos(descuentoManual)}
            onChange={(e) => setDescuentoManual(soloDigitos(e.target.value).slice(0, MAX_DIGITOS))}
          />
        </Field>
      )}

      {haySelectorSucursal && (
        <div ref={campoSucursal}>
          <Field
            label="Sucursal"
            error={faltaSucursal ? 'Elige la sucursal donde se hace esta venta.' : null}
          >
            <SelectMenu
              name="sucursal_id"
              etiqueta="Sucursal"
              placeholder="Selecciona una sucursal"
              value={sucursalId}
              onChange={(id) => {
                setSucursalId(id)
                setFaltaSucursal(false)
              }}
              opciones={sucursales.map((s) => ({
                value: String(s.id),
                label: s.nombre ?? `Sucursal ${s.id}`,
              }))}
            />
          </Field>
        </div>
      )}

      {/*
        EL PIE, PEGADO ABAJO: el total y el botón de cobrar se quedan a la
        vista aunque la lista de promociones sea larga o la ventana baja. Los
        campos desplazan entre el veredicto (arriba) y esto (abajo).

        EL RECIBO. La compra y el descuento solo aparecen cuando hay descuento:
        sin él, repetir el importe dos veces no informa de nada. `<output>` se
        anuncia solo al cambiar el total.
      */}
      <div className={styles.pieVenta}>
      <dl className={styles.resumen}>
        {valorDescuento > 0 && (
          <>
            <div className={styles.resumenFila}>
              <dt>Compra</dt>
              <dd>{PESOS.format(compra)}</dd>
            </div>
            <div className={`${styles.resumenFila} ${styles.resumenDescuento}`}>
              <dt>
                Descuento
                {promocionSeleccionada &&
                  ` · ${formatearBeneficioCorto(promocionSeleccionada.tipoCodigo, promocionSeleccionada.valor)}`}
              </dt>
              <dd>−{PESOS.format(valorDescuento)}</dd>
            </div>
          </>
        )}
        <div className={styles.resumenTotal}>
          <dt>Total a cobrar</dt>
          <dd>
            <output>{PESOS.format(valorFinal)}</output>
          </dd>
        </div>
      </dl>

      {/*
        EL BOTÓN DICE EL NÚMERO. Es la última lectura del importe antes de algo
        que no se puede deshacer, y es gratis: el cajero ya está mirando el
        botón que va a tocar. Con el importe en cero se queda en «Registrar
        venta» — repetir «Cobrar $0» no informa de nada.
      */}
      <Button
        type="submit"
        variant="brand"
        size="lg"
        pildora
        fullWidth
        loading={pending}
        icon={<Receipt size={17} />}
      >
        {hayImporte ? `Cobrar ${PESOS.format(valorFinal)}` : 'Registrar venta'}
      </Button>
      </div>
    </form>
  )
}
