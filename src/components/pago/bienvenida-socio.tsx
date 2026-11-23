'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import estrella from '@/components/ui/marca/estrella.png'
import monograma from '@/components/ui/marca/monograma.png'
import orumDorado from '@/components/ui/marca/orum-dorado.png'
import estilos from './bienvenida-socio.module.css'

/*
  LA BIENVENIDA DEL SOCIO NUEVO  ·  (diseño aprobado el 23/11/2026)
  ---------------------------------------------------------------------------
  Al confirmarse el primer pago. La protagonista es la TARJETA del socio
  —blanca, con su sombra, sin borde—: la marca una sola vez, «Activa», el
  número de socio grande en la letra de la marca (cifras parejas) en dos
  bloques con un punto dorado en medio, el botón de copiar (solo el icono),
  el nombre y la vigencia, y al pie lo pagado y la próxima renovación.

  Arriba, el monograma con las estrellas de ORUM que salen y titilan; la
  tarjeta entra levantándose y un brillo dorado la cruza UNA vez. Estado
  base = final: con movimiento reducido todo está en su sitio.
*/

export type DatosSocioNuevo = {
  nombre: string
  nombreCompleto: string
  numero: string
  plan: string
  vigenteHasta: string
  pagado: string
}

const CHISPAS = [
  { clase: 'chispa1' },
  { clase: 'chispa2' },
  { clase: 'chispa3' },
  { clase: 'chispa4' },
] as const

export function BienvenidaSocio({ socio }: { socio: DatosSocioNuevo }) {
  const [copiado, setCopiado] = useState(false)
  const [sinCopiar, setSinCopiar] = useState(false)
  const bloques = [socio.numero.slice(0, 4), socio.numero.slice(4)].filter(Boolean)

  // Solo dice «Copiado» si de verdad se copió: sin permiso del navegador (o en
  // una página sin HTTPS) lo dice y deja el número a la vista para copiarlo a mano.
  const copiar = async () => {
    try {
      if (!navigator.clipboard) throw new Error('sin portapapeles')
      await navigator.clipboard.writeText(socio.numero)
      setSinCopiar(false)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 1800)
    } catch {
      setCopiado(false)
      setSinCopiar(true)
    }
  }

  return (
    <div className={estilos.bienvenida}>
      <div className={estilos.marca} aria-hidden="true">
        {CHISPAS.map((c) => (
          <Image key={c.clase} className={`${estilos.chispa} ${estilos[c.clase]}`} src={estrella} alt="" />
        ))}
        <Image className={estilos.logo} src={monograma} alt="" priority />
      </div>

      <div className={estilos.saludo}>
        <h1 className={estilos.titulo}>
          Te damos la bienvenida a <em>ORUM</em>, {socio.nombre}
        </h1>
        <p className={estilos.apoyo}>Tu pago se confirmó y tu membresía ya está activa.</p>
      </div>

      <section className={estilos.carnet} aria-label="Tu carnet de socio">
        <div className={estilos.carnetCabeza}>
          <Image className={estilos.membrete} src={orumDorado} alt="ORUM" />
          <span className={estilos.activa}>
            <span className={estilos.punto} aria-hidden="true" />
            Activa
          </span>
        </div>

        <div>
          <p className={estilos.etiqueta} id="etiqueta-numero">
            Número de socio
          </p>
          <div className={estilos.filaNumero}>
            <p className={estilos.numero} aria-labelledby="etiqueta-numero">
              <span className={estilos.oculto}>{bloques.join(' ')}</span>
              {bloques.map((b, i) => (
                <span key={i} className={estilos.grupoNumero} aria-hidden="true">
                  {i > 0 && <span className={estilos.separador} />}
                  <span className={estilos.cifras} data-orden={i}>
                    {b}
                  </span>
                </span>
              ))}
            </p>
            <button
              type="button"
              className={estilos.copiar}
              data-hecho={copiado ? '' : undefined}
              onClick={copiar}
              aria-label={copiado ? 'Número de socio copiado' : 'Copiar el número de socio'}
              title={copiado ? 'Copiado' : 'Copiar el número de socio'}
            >
              {copiado ? (
                <Check key="hecho" className={estilos.iconoHecho} size={20} strokeWidth={2.4} aria-hidden="true" />
              ) : (
                <Copy size={20} strokeWidth={1.7} aria-hidden="true" />
              )}
            </button>
          </div>
          <p role="status" className={sinCopiar ? estilos.avisoCopia : estilos.oculto}>
            {copiado
              ? 'Número de socio copiado'
              : sinCopiar
                ? 'No pudimos copiarlo: mantén pulsado el número para copiarlo a mano.'
                : ''}
          </p>
        </div>

        <div className={estilos.titular}>
          <p className={estilos.nombre}>{socio.nombreCompleto}</p>
          <p className={estilos.vigencia}>
            {socio.plan}
            {socio.vigenteHasta && ` · vigente hasta el ${socio.vigenteHasta}`}
          </p>
        </div>

        <dl className={estilos.datos}>
          <div>
            <dt>Pagaste</dt>
            <dd>{socio.pagado}</dd>
          </div>
          <div>
            <dt>Próxima renovación</dt>
            <dd>{socio.vigenteHasta}</dd>
          </div>
        </dl>
      </section>

      <div className={estilos.acciones}>
        <Button href="/miembros/perfil" variant="brand" size="lg" pildora fullWidth>
          Ver mi carnet
        </Button>
        <Button href="/miembros" variant="secondary" size="lg" pildora fullWidth>
          Explorar comercios
        </Button>
      </div>
      <p className={estilos.nota}>
        Ya entraste a tu cuenta. La próxima vez, entra con tu correo o tu número de socio.
      </p>
    </div>
  )
}
