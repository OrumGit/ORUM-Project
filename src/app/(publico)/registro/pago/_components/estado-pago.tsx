'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Clock, CreditCard, Hourglass } from 'lucide-react'
import Image from 'next/image'
import { BienvenidaSocio } from '@/components/pago/bienvenida-socio'
import { CargadorLogo } from '@/components/pago/cargador-logo'
import { Button } from '@/components/ui/button'
import estrella from '@/components/ui/marca/estrella.png'
import { SONDEO_CADA_MS, SONDEO_TOPE_MS } from '@/lib/mercadopago/estado-pago-registro'
import { consultarPagoRegistro, type RespuestaPago } from '../actions'
import estilos from './estado-pago.module.css'

/*
  AL VOLVER DE MERCADO PAGO  ·  (diseño aprobado el 23/11/2026)
  ---------------------------------------------------------------------------
  No se fía de lo que traiga la URL: pregunta al servidor (`consultarPagoRegistro`)
  cada 3 s durante un minuto como máximo. Mientras tanto, el logo que se arma
  y la línea de tiempo (lo hecho en verde suave, lo de ahora girando en oro,
  lo que falta en gris). Al minuto, «Está tardando más de lo normal» con
  «Revisar de nuevo» —sin sondeo infinito—. Rechazado y pendiente tienen su
  tarjeta; la membresía activa, la bienvenida con el carnet.
*/

export type Vista = RespuestaPago['estado'] | 'consultando' | 'tardando'

export function EstadoPago({
  vistaPrevia,
}: {
  /** Solo `/dev/pago`: una vista fija con datos falsos, sin preguntar al servidor. */
  vistaPrevia?: { vista: Vista; respuesta?: RespuestaPago }
} = {}) {
  const [vista, setVista] = useState<Vista>(vistaPrevia?.vista ?? 'consultando')
  const [respuesta, setRespuesta] = useState<RespuestaPago | null>(vistaPrevia?.respuesta ?? null)
  const [ronda, setRonda] = useState(0)
  const router = useRouter()

  // El sondeo: pregunta, espera 3 s y vuelve a preguntar, hasta una respuesta
  // que decida o hasta el tope. Cada `ronda` («Revisar de nuevo») lo reinicia.
  useEffect(() => {
    if (vistaPrevia) return
    let vivo = true
    const inicio = Date.now()
    const sondear = async () => {
      while (vivo) {
        const r = await consultarPagoRegistro().catch(() => null)
        if (!vivo) return
        if (r && r.estado !== 'confirmando') {
          if (r.estado === 'sin_pago') {
            router.replace('/registro/completar')
            return
          }
          setRespuesta(r)
          setVista(r.estado)
          return
        }
        if (Date.now() - inicio >= SONDEO_TOPE_MS) {
          setVista('tardando')
          return
        }
        setVista('confirmando')
        await new Promise((ok) => window.setTimeout(ok, SONDEO_CADA_MS))
      }
    }
    void sondear()
    return () => {
      vivo = false
    }
  }, [ronda, router, vistaPrevia])

  if (vista === 'activa' && respuesta?.estado === 'activa' && respuesta.socio) {
    return (
      <main className={estilos.pagina}>
        <BienvenidaSocio socio={respuesta.socio} />
      </main>
    )
  }

  if (vista === 'activa') {
    return (
      <Aviso icono={<Check size={26} strokeWidth={1.8} />} titulo="Tu membresía está activa">
        <p>Ya puedes entrar al Portal de Miembros con tu correo o tu número de socio.</p>
        <Button href="/miembros" variant="brand" size="lg" pildora fullWidth>
          Ir a mi cuenta
        </Button>
      </Aviso>
    )
  }

  if (vista === 'rechazado') {
    return (
      <Aviso
        icono={<CreditCard size={26} strokeWidth={1.7} />}
        estado={{ texto: 'No aprobado', tono: 'peligro' }}
        titulo="Tu pago no se aprobó"
      >
        <p>
          Mercado Pago no aprobó el cobro: puede ser el cupo o un dato de la tarjeta.{' '}
          <strong>No se te cobró nada.</strong>
        </p>
        <Button href="/registro/completar" variant="brand" size="lg" pildora fullWidth>
          Intentar con otra tarjeta
        </Button>
        <Button href="/registro/completar" variant="ghost" size="lg" pildora fullWidth>
          Elegir otro plan
        </Button>
      </Aviso>
    )
  }

  if (vista === 'pendiente') {
    return (
      <Aviso
        icono={<Hourglass size={26} strokeWidth={1.7} />}
        estado={{ texto: 'Pendiente', tono: 'aviso' }}
        titulo="Tu pago está en revisión"
      >
        <p>
          Mercado Pago está revisando el cobro. Cuando lo apruebe, activamos tu membresía y{' '}
          <strong>te avisamos por correo</strong>. No tienes que hacer nada más.
        </p>
        <Button href="/" variant="brand" size="lg" pildora fullWidth>
          Entendido
        </Button>
      </Aviso>
    )
  }

  if (vista === 'tardando') {
    return (
      <Aviso
        icono={<Clock size={26} strokeWidth={1.7} />}
        estado={{ texto: 'Todavía sin confirmar', tono: 'aviso' }}
        titulo="Está tardando más de lo normal"
      >
        <p>
          Mercado Pago aún no nos confirma el cobro. Si ya pagaste, <strong>tu pago no se pierde</strong>: te
          escribimos al correo en cuanto llegue.
        </p>
        <Button
          variant="brand"
          size="lg"
          pildora
          fullWidth
          onClick={() => {
            setVista('consultando')
            setRonda((n) => n + 1)
          }}
        >
          Revisar de nuevo
        </Button>
        <Button href="/" variant="ghost" size="lg" pildora fullWidth>
          Volver al inicio
        </Button>
      </Aviso>
    )
  }

  if (vista === 'sin_sesion') {
    return (
      <Aviso icono={<Check size={26} strokeWidth={1.8} />} titulo="Entra para ver tu pago">
        <p>Tu sesión se cerró mientras pagabas. Entra con tu correo y tu contraseña y seguimos donde ibas.</p>
        <Button href="/miembros/login" variant="brand" size="lg" pildora fullWidth>
          Entrar
        </Button>
      </Aviso>
    )
  }

  // Consultando / confirmando.
  return (
    <main className={estilos.pagina}>
      <div className={estilos.confirmando}>
        <CargadorLogo />
        <div className={estilos.encabezado}>
          <h1 className={estilos.titulo}>
            Estamos confirmando tu <em>pago</em>
          </h1>
          <p role="status" className={estilos.texto}>
            Suele tardar unos segundos. No hace falta que recargues: esta pantalla se actualiza sola.
          </p>
        </div>

        <ol className={estilos.linea} aria-label="En qué va tu pago">
          <li className={estilos.hito} data-estado="hecho">
            <span className={estilos.riel}>
              <span className={estilos.punto}>
                <Check size={15} strokeWidth={2.6} aria-hidden="true" />
              </span>
              <span className={estilos.tramo} aria-hidden="true" />
            </span>
            <span>
              <span className={estilos.hitoTitulo}>Pagaste en Mercado Pago</span>
              <span className={estilos.hitoNota}>Hace un momento</span>
            </span>
          </li>
          <li className={estilos.hito} data-estado="ahora" aria-current="step">
            <span className={estilos.riel}>
              <span className={estilos.punto}>
                <span className={estilos.arco} aria-hidden="true" />
                <Image className={estilos.chispa} src={estrella} alt="" width={15} height={15} />
              </span>
              <span className={estilos.tramo} aria-hidden="true">
                <span className={estilos.flujo} />
              </span>
            </span>
            <span>
              <span className={estilos.hitoTitulo}>Mercado Pago confirma el cobro</span>
              <span className={estilos.hitoNota}>
                <strong className={estilos.enCurso}>
                  En curso
                  <span className={estilos.puntos} aria-hidden="true">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </strong>{' '}
                suele tardar unos segundos
              </span>
            </span>
          </li>
          <li className={estilos.hito} data-estado="falta">
            <span className={estilos.riel}>
              <span className={estilos.punto}>
                <CreditCard size={15} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className={estilos.tramo} aria-hidden="true" />
            </span>
            <span>
              <span className={estilos.hitoTitulo}>Activamos tu membresía</span>
              <span className={estilos.hitoNota}>Te damos tu número de socio y tu carnet</span>
            </span>
          </li>
          <li className={estilos.hito} data-estado="falta">
            <span className={estilos.riel}>
              <span className={estilos.punto}>
                <Image className={estilos.estrellaGris} src={estrella} alt="" width={14} height={14} />
              </span>
            </span>
            <span>
              <span className={estilos.hitoTitulo}>Te damos la bienvenida a ORUM</span>
              <span className={estilos.hitoNota}>Entras directo a tu cuenta</span>
            </span>
          </li>
        </ol>

        <p className={estilos.pie}>
          Si pasa más de un minuto, te damos la opción de revisar de nuevo. Tu pago no se pierde: también te
          avisaremos por correo.
        </p>
      </div>
    </main>
  )
}

function Aviso({
  icono,
  estado,
  titulo,
  children,
}: {
  icono: React.ReactNode
  estado?: { texto: string; tono: 'peligro' | 'aviso' }
  titulo: string
  children: React.ReactNode
}) {
  return (
    <main className={estilos.pagina}>
      <section className={estilos.aviso} aria-labelledby="titulo-aviso">
        <span className={estilos.aro} aria-hidden="true">
          {icono}
        </span>
        {estado && (
          <p className={estilos.estado} data-tono={estado.tono}>
            <span className={estilos.estadoPunto} aria-hidden="true" />
            {estado.texto}
          </p>
        )}
        <h1 id="titulo-aviso" className={estilos.titulo}>
          {titulo}
        </h1>
        <div className={estilos.avisoCuerpo}>{children}</div>
      </section>
    </main>
  )
}
