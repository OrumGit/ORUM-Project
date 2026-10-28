'use client'

import { useActionState, useEffect } from 'react'
import { AlertCircle, RotateCcw, X } from 'lucide-react'
import type { HistorialVisitas } from '@/lib/comercios/visitas'
import { iniciales } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { error as vibrarError, exito as vibrarExito } from '@/lib/shared/haptica'
import { registrarVenta, type MiembroEncontrado, type RegistrarVentaState } from '../actions'
import { AcuseVenta } from './acuse-venta'
import { ConfirmarVentaForm } from './confirmar-venta-form'
import type { MetodoRegistroVenta, TipoBeneficioCodigo } from '@/lib/supabase/database.types'
import styles from './verificar.module.css'

type Sucursal = { id: number; nombre: string | null }
type Promocion = {
  id: number
  titulo: string
  tipoCodigo: TipoBeneficioCodigo
  valor: number | null
  disponibleHoy: boolean
  /** «Hoy aplica desde las 6:00 p. m.», «Hoy no aplica»: por qué no se puede elegir ahora. */
  ahoraTexto?: string | null
  diasTexto: string | null
  restricciones: string | null
}

const estadoInicial: RegistrarVentaState = {}

/*
  EL FOCO INICIAL DE LA VENTANA, EN LA X.

  `showModal()` enfoca el primer elemento enfocable del diálogo, y ese resultó
  ser la propia ventana: es un contenedor con desplazamiento, y Chrome los
  hace enfocables. El foco caía en la tarjeta entera, con su anillo dorado
  alrededor.

  Con el atributo `autofocus` el navegador sabe a quién dárselo. Se pone por
  `ref` y no con la prop `autoFocus` de React, que no escribe el atributo:
  llama a `focus()` al montar, cuando el diálogo todavía está cerrado y nada
  de dentro puede recibirlo.
*/
const enfocarAlAbrir = (nodo: HTMLButtonElement | null) => {
  nodo?.setAttribute('autofocus', '')
}

/*
  LA VENTANA DEL VEREDICTO  ·  04/10/2026
  ---------------------------------------------------------------------------
  Encargo del propietario: «cuando se lee el QR o se pone el número y la
  persona está activa o no, mejora el diseño del formulario y quiero que sea
  una ventana encima; no quiero que vaya debajo».

  Antes el veredicto y la venta eran dos tarjetas bajo la de buscar: en un
  teléfono quedaban fuera de la vista y había que bajar para saber si la
  membresía valía. Ahora el resultado LLEGA: una ventana encima de la página,
  que es a la vez el dictamen y —si la membresía vale— el formulario de venta.

  LA VENTANA ES LA TARJETA (`Modal desnudo`), como el carnet del socio: no hay
  un panel con otra tarjeta dentro. Su cabeza es el veredicto.

    · LA CABEZA es la franja de color sólido con el dictamen en mayúsculas.
      Se queda PEGADA arriba al desplazar el formulario: mientras se teclea
      el importe, el cajero sigue viendo si la membresía vale.
    · EL SOCIO, justo debajo: iniciales, nombre, plan y número. El nombre es
      lo que confirma que el carnet es de quien lo entrega.
    · Si está ACTIVA, el formulario de venta. Si NO, qué hacer y la vuelta.
    · Al registrar, la ventana entera pasa a ser el ACUSE (`AcuseVenta`): el
      recibo, con el logotipo de ORUM y la animación de pagar.

  NO SE CIERRA AL PULSAR FUERA (`cerrarAlPulsarFuera={false}`): hay un
  importe a medio teclear y un toque en el velo lo perdería. La cierran su X,
  Escape y «Verificar otro socio», y las tres dejan la caja lista para el
  siguiente.

  POR QUÉ NO `StatusBadge` AQUÍ, Y POR QUÉ ESO NO CONTRADICE AL SISTEMA:
  `StatusBadge` sigue siendo lo correcto en una lista. Lo que no puede hacer
  un badge es ser el contenido principal: su tamaño —el diagnóstico exacto de
  `AUDIT-a11y` #9— es justo lo que falla cuando el dato que decide la
  transacción es el más pequeño de la pantalla. Lo que se hereda es su PATRÓN:
  punto lleno / punto hueco, texto siempre, nunca el color solo.

  CONTRASTE, MEDIDO. Relleno `--success` / `--danger` con texto `--surface`,
  que en este portal (siempre en claro) es blanco puro:

    activa    #137a3b con texto #ffffff .......... 5,37:1
    inactiva  #c1121f con texto #ffffff .......... 6,16:1

  El motivo de una inactiva se omite a propósito: `buscar_miembro_comercio`
  solo devuelve `vigente`, y no se inventa un «vencida» que podría ser
  «suspendida».
*/
export function VentanaVeredicto({
  abierta,
  consultaId,
  miembro,
  metodo,
  sucursales,
  promociones,
  onCerrar,
}: {
  abierta: boolean
  /** Cambia con cada búsqueda: arranca el contenido en limpio. */
  consultaId: number
  miembro: MiembroEncontrado | null
  metodo: MetodoRegistroVenta
  sucursales: Sucursal[]
  promociones: Promocion[]
  onCerrar: () => void
}) {
  /* El nombre del diálogo ES el veredicto: es lo primero que anuncia un
     lector de pantalla al abrirse, sin tener que ir a buscarlo. */
  const etiqueta = miembro
    ? `${miembro.vigente ? 'Membresía activa' : 'Membresía inactiva'}: ${miembro.nombreCompleto}`
    : 'Resultado de la verificación'

  return (
    <Modal
      open={abierta}
      onClose={onCerrar}
      ariaLabel={etiqueta}
      width="520px"
      desnudo
      cerrarAlPulsarFuera={false}
    >
      {miembro && (
        <Contenido
          key={consultaId}
          miembro={miembro}
          metodo={metodo}
          sucursales={sucursales}
          promociones={promociones}
          onCerrar={onCerrar}
        />
      )}
    </Modal>
  )
}

/*
  LAS ÚLTIMAS VISITAS DEL SOCIO A ESTE COMERCIO (08/10/2026). Solo cuándo
  vino: fecha y hora, y la sucursal si el comercio tiene varias. Sin importes
  ni promoción, y sin juzgar si es «primera vez».

  SI FALLA, NO SE CALLA: filas de relleno DIFUMINADAS con el aviso encima.
  Las filas son decoración (`aria-hidden`): lo que informa —también al lector
  de pantalla— es el texto. Un bloque que desaparece sin más haría creer al
  cajero que el socio no ha venido nunca, y eso es un dato falso.
*/
const FILAS_RELLENO = [0, 1, 2]

function HistorialVisitasLista({ historial }: { historial: HistorialVisitas }) {
  return (
    <section className={styles.historial} aria-labelledby="titulo-visitas">
      <h3 id="titulo-visitas" className={styles.historialTitulo}>
        Visitas a este comercio
      </h3>

      {!historial.ok ? (
        <div className={styles.historialError} role="status">
          <ul className={styles.historialLista} aria-hidden="true">
            {FILAS_RELLENO.map((i) => (
              <li key={i} className={`${styles.visita} ${styles.visitaDifuminada}`}>
                <span>mié, 00 ooo 0000</span>
                <span>0:00 p. m.</span>
              </li>
            ))}
          </ul>
          <p className={styles.historialAviso}>
            <AlertCircle size={16} aria-hidden="true" />
            No se pudo cargar el historial. Cierra y vuelve a verificar al socio.
          </p>
        </div>
      ) : historial.visitas.length === 0 ? (
        <p className={styles.historialVacio}>Aún no ha visitado este comercio.</p>
      ) : (
        <ul className={styles.historialLista}>
          {historial.visitas.map((v) => (
            <li key={v.id} className={styles.visita}>
              <span>
                {v.fecha}
                {v.sucursal && <span className={styles.visitaSucursal}> · {v.sucursal}</span>}
              </span>
              <span className={styles.visitaHora}>{v.hora}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Contenido({
  miembro,
  metodo,
  sucursales,
  promociones,
  onCerrar,
}: {
  miembro: MiembroEncontrado
  metodo: MetodoRegistroVenta
  sucursales: Sucursal[]
  promociones: Promocion[]
  onCerrar: () => void
}) {
  /* El estado de la VENTA vive aquí y no en el formulario: al registrarse, la
     ventana entera cambia al acuse, y el formulario ya no está para contarlo. */
  const [venta, registrar, registrando] = useActionState(registrarVenta, estadoInicial)

  /* La vibración sí es un efecto de verdad: toca una API del sistema. Solo en
     el flanco, al pasar a `ok`. */
  useEffect(() => {
    if (venta.ok) vibrarExito()
  }, [venta.ok])

  useEffect(() => {
    if (venta.error) vibrarError()
  }, [venta.error])

  if (venta.ok) {
    return (
      <AcuseVenta
        valorFinal={venta.valorFinal ?? 0}
        valorCompra={venta.valorCompra ?? 0}
        valorDescuento={venta.valorDescuento ?? 0}
        nombre={miembro.nombreCompleto}
        numeroMembresia={miembro.numeroMembresia}
        hora={venta.hora ?? null}
        onCerrar={onCerrar}
      />
    )
  }

  const vigente = miembro.vigente

  return (
    <article className={styles.ventana}>
      <header
        className={`${styles.dictamen} ${vigente ? styles.dictamenActiva : styles.dictamenInactiva}`}
      >
        {/* La X, primera en el DOM para que el foco empiece por la salida (y
            no por el campo del importe: en un teléfono abriría el teclado
            encima del veredicto). El orden visual lo pone el CSS. */}
        <button
          ref={enfocarAlAbrir}
          type="button"
          className={styles.cerrarVentana}
          onClick={onCerrar}
          aria-label="Cerrar"
        >
          <X size={20} aria-hidden="true" />
        </button>

        <h2 className={styles.dictamenTexto}>
          {/*
            Punto LLENO frente a anillo HUECO: la diferencia es de forma, no de
            color, así que sobrevive al daltonismo y al sol dando en la pantalla
            del móvil en plena caja. El texto dice lo mismo que el color, y es
            quien manda.
          */}
          <span
            className={`${styles.punto} ${vigente ? '' : styles.puntoHueco}`}
            aria-hidden="true"
          />
          {vigente ? 'Membresía activa' : 'Membresía inactiva'}
        </h2>
      </header>

      {/* LO QUE DESPLAZA es esto, no la ventana entera: así la franja del
          veredicto se queda arriba a todo el ancho y la barra de
          desplazamiento (`data-barra`) empieza DEBAJO de ella. Cuando
          desplazaba la ventana, la barra le quitaba ancho a la franja y
          dejaba una tira blanca a su derecha. */}
      <div className={styles.ventanaCuerpo} data-barra="">
        <div className={styles.socio}>
          {/* LA FOTO DEL CARNET, para cotejar la cara; sin foto, las iniciales.
              Con texto alternativo: aquí la foto SÍ informa (es lo que se
              compara con quien está delante). `<img>` y no `next/image`: la URL
              es de Storage. */}
          {miembro.fotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL de Storage, no un asset local
            <img
              src={miembro.fotoUrl}
              alt={`Foto de ${miembro.nombreCompleto}`}
              className={styles.socioFoto}
              decoding="async"
            />
          ) : (
            <span className={styles.socioIniciales} aria-hidden="true">
              {iniciales(miembro.nombreCompleto)}
            </span>
          )}
          <div className={styles.socioDatos}>
            {/*
              El NOMBRE antes que el número: lo que confirma que el carnet es de
              quien lo está entregando es la cara y el nombre. El número baja a
              dato de cotejo, que es para lo que sirve.
            */}
            <p className={styles.nombre}>{miembro.nombreCompleto}</p>
            <p className={styles.socioMeta}>
              {vigente && miembro.planNombre && (
                <span className={styles.plan}>{miembro.planNombre}</span>
              )}
              <span className={styles.numero}>N.º {miembro.numeroMembresia}</span>
            </p>
          </div>
        </div>

        {vigente && <HistorialVisitasLista historial={miembro.historial} />}

        {vigente ? (
          <ConfirmarVentaForm
            miembroId={miembro.id}
            membresiaId={miembro.membresiaId}
            numeroMembresia={miembro.numeroMembresia}
            metodo={metodo}
            sucursales={sucursales}
            promociones={promociones}
            state={venta}
            formAction={registrar}
            pending={registrando}
          />
        ) : (
          <div className={styles.cuerpoVentana}>
            {/* Qué hacer, no solo qué pasa: un veredicto negativo sin
                instrucción deja al cajero decidiendo a solas delante del cliente. */}
            <p className={styles.instruccion}>
              No apliques el beneficio. El socio puede reactivar su membresía con el club.
            </p>

            <Button
              onClick={onCerrar}
              variant="brand"
              size="lg"
              pildora
              fullWidth
              icon={<RotateCcw size={17} />}
            >
              Verificar otro socio
            </Button>
          </div>
        )}
      </div>
    </article>
  )
}
