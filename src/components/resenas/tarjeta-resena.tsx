import type { ReactNode } from 'react'
import { Store } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { EstrellasLectura } from '@/components/ui/estrellas-lectura'
import { EstrellaOrum } from '@/components/ui/marca/marca'
import { etiquetaEstrellas } from '@/lib/resenas/resenas'
import estilos from './resenas.module.css'

/*
  UNA RESEÑA con sus respuestas debajo (rediseño del 29/10/2026). Sin
  directiva: la pintan la lista (servidor) y la caja y el panel (cliente).
  Sin superficie: la pone quien la usa.

    (MG)  María G.                         26 de octubre de 2026
          ★★★★★ Excelente
          Muy buena atención y el descuento se aplicó sin problema.
          │ 🏪 Respuesta del comercio
          │ ¡Gracias, María! Te esperamos pronto.

  El avatar es decorativo: el nombre ya está escrito al lado. Las
  estrellas llevan al lado lo que significan, como en el selector. La
  respuesta de ORUM firma con la estrella de la marca; la del comercio, con
  su tienda.
*/

type TarjetaProps = {
  autor: string
  estrellas: number
  mensaje: string | null
  fecha: string
  respuestaComercio: string | null
  respuestaAdmin: string | null
  /** Controles bajo las respuestas (responder, quitar, eliminar). */
  acciones?: ReactNode
}

export function TarjetaResena({
  autor,
  estrellas,
  mensaje,
  fecha,
  respuestaComercio,
  respuestaAdmin,
  acciones,
}: TarjetaProps) {
  return (
    <article className={estilos.resena}>
      <Avatar nombre={autor} size="md" decorativo />
      <div className={estilos.resenaCuerpo}>
        <div className={estilos.resenaCabeza}>
          <p className={estilos.autor}>{autor}</p>
          {fecha && <p className={estilos.fecha}>{fecha}</p>}
        </div>
        <p className={estilos.nota5}>
          <EstrellasLectura valor={estrellas} />
          <span aria-hidden="true">{etiquetaEstrellas(estrellas)}</span>
        </p>
        {mensaje && <p className={estilos.mensaje}>{mensaje}</p>}
        {respuestaComercio && (
          <Respuesta
            quien="Respuesta del comercio"
            icono={<Store size={13} aria-hidden="true" className={estilos.respuestaIcono} />}
            texto={respuestaComercio}
          />
        )}
        {respuestaAdmin && (
          <Respuesta
            quien="Respuesta de ORUM"
            icono={<EstrellaOrum className={estilos.respuestaEstrella} />}
            texto={respuestaAdmin}
          />
        )}
        {acciones && <div className={estilos.acciones}>{acciones}</div>}
      </div>
    </article>
  )
}

function Respuesta({ quien, icono, texto }: { quien: string; icono: ReactNode; texto: string }) {
  return (
    <div className={estilos.respuesta}>
      <p className={estilos.respuestaQuien}>
        {icono}
        {quien}
      </p>
      <p className={estilos.respuestaTexto}>{texto}</p>
    </div>
  )
}
