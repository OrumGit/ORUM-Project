'use client'

import { useRouter } from 'next/navigation'
import { Overlay } from '@/components/ui/overlay'
import { FlujoRegistro, type CiudadRegistro, type PlanRegistro } from './flujo-registro'
import estilos from './pagina-registro.module.css'

/*
  EL REGISTRO ENCIMA DE LOS PLANES  ·  (ruta interceptada `@modal/(.)registro`)
  ---------------------------------------------------------------------------
  «Adquirir» en la portada abre esta ventana sin salir de la página. Cerrar
  es `router.back()`: la portada queda donde estaba. En el teléfono es la
  hoja inferior a pantalla casi completa (`large`), con los pasos arriba y el
  botón en el pie pegado.
*/
export function VentanaRegistro({
  planes,
  ciudades,
  planInicial,
}: {
  planes: PlanRegistro[]
  ciudades: CiudadRegistro[]
  planInicial: number
}) {
  const router = useRouter()

  return (
    <FlujoRegistro
      planes={planes}
      ciudades={ciudades}
      planInicial={planInicial}
      marco={({ encabezado, cuerpo, pie, titulo }) => (
        <Overlay
          open
          onClose={() => router.back()}
          ariaLabel={titulo}
          encabezado={encabezado}
          footer={pie}
          width="620px"
          detent="large"
        >
          {cuerpo}
        </Overlay>
      )}
    />
  )
}

/** La misma ventana, a pantalla completa (un enlace directo a `/registro`). */
export function PaginaRegistro({
  planes,
  ciudades,
  planInicial,
}: {
  planes: PlanRegistro[]
  ciudades: CiudadRegistro[]
  planInicial: number
}) {
  return (
    <FlujoRegistro
      planes={planes}
      ciudades={ciudades}
      planInicial={planInicial}
      marco={({ encabezado, cuerpo, pie, titulo }) => (
        <main className={estilos.pagina}>
          <div className={estilos.tarjeta} role="region" aria-label={titulo}>
            <div className={estilos.cabecera}>{encabezado}</div>
            <div className={estilos.cuerpo}>{cuerpo}</div>
            <div className={estilos.pie}>{pie}</div>
          </div>
        </main>
      )}
    />
  )
}
