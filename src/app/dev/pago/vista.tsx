'use client'

import { CompletarMembresia } from '@/app/(publico)/registro/completar/_components/completar-membresia'
import { EstadoPago, type Vista } from '@/app/(publico)/registro/pago/_components/estado-pago'
import { FlujoRegistro, type PlanRegistro } from '@/app/(publico)/registro/_components/flujo-registro'
import { PaginaRegistro, VentanaRegistro } from '@/app/(publico)/registro/_components/ventana-registro'
import { Overlay } from '@/components/ui/overlay'

const PLANES: PlanRegistro[] = [
  { id: 1, nombre: 'Mensual', precio: 30000, precioTexto: '$30.000', periodo: 'mes' },
  { id: 2, nombre: 'Anual', precio: 250000, precioTexto: '$250.000', periodo: 'año' },
]
const CIUDADES = [
  { id: 1, nombre: 'Bogotá' },
  { id: 2, nombre: 'Tuluá' },
]
const SOCIO = {
  nombre: 'Daniela',
  nombreCompleto: 'Daniela Gómez Ruiz',
  numero: '00012345',
  plan: 'Anual',
  vigenteHasta: '23 nov 2027',
  pagado: '$250.000',
}

export function VistaPago({ caso }: { caso: string }) {
  if (caso === 'pagina') return <PaginaRegistro planes={PLANES} ciudades={CIUDADES} planInicial={2} />
  if (caso === 'completar') return <CompletarMembresia nombre="Daniela" planes={PLANES} planInicial={2} />

  const vistas: Record<string, Vista> = {
    confirmando: 'confirmando',
    tardando: 'tardando',
    rechazado: 'rechazado',
    pendiente: 'pendiente',
    bienvenida: 'activa',
  }
  if (caso in vistas) {
    return (
      <EstadoPago
        vistaPrevia={{
          vista: vistas[caso],
          respuesta: caso === 'bienvenida' ? { estado: 'activa', socio: SOCIO } : undefined,
        }}
      />
    )
  }

  // La ventana, en el paso pedido (1 por defecto).
  const paso = caso === 'codigo' ? 2 : caso === 'pagar' ? 3 : 1
  if (paso === 1) return <VentanaRegistro planes={PLANES} ciudades={CIUDADES} planInicial={2} />
  return (
    <FlujoRegistro
      planes={PLANES}
      ciudades={CIUDADES}
      planInicial={2}
      vistaPrevia={{ paso, correo: 'daniela.gomez@gmail.com', nombre: 'Daniela' }}
      marco={({ encabezado, cuerpo, pie, titulo }) => (
        <Overlay open onClose={() => {}} ariaLabel={titulo} encabezado={encabezado} footer={pie} width="620px">
          {cuerpo}
        </Overlay>
      )}
    />
  )
}
