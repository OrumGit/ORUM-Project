import { notFound } from 'next/navigation'
import { FichaComercio, type SedeFicha } from '@/components/comercios/ficha-comercio'
import { BeneficiosSocio, type BeneficioSocio } from '@/components/comercios/beneficios-socio'
import fichaEstilos from '@/components/comercios/ficha-comercio.module.css'
import { AdornoEstrella } from '@/components/ui/marca/marca'
import { PromocionForm } from '@/app/admin/comercios/[id]/promociones/_components/promocion-form'
import { cuandoUsarlo, normalizarFranjas } from '@/lib/comercios/franjas-promocion'
import type { DiaHorario } from '@/lib/comercios/horario'
import portal from '@/app/miembros/(portal)/portal.module.css'
import estilos from '../horarios/horarios.module.css'

export const metadata = {
  title: 'Vista previa de beneficios · ORUM',
}

/**
 * La ficha del socio con beneficios que valen en ciertas horas, y el editor
 * de franjas del panel, con datos FALSOS y solo en desarrollo. Las pantallas
 * reales exigen sesión de socio o de administrador; esta no.
 *
 * Los datos imitan a Coraje (el caso que lo pidió): dos turnos martes y
 * miércoles y otros dos el fin de semana.
 */

const fila = (
  dia: number,
  abre: string | null,
  cierra: string | null,
  almuerzo: [string, string] | null = null,
): DiaHorario => ({ dia, abre, cierra, almuerzoDesde: almuerzo?.[0] ?? null, almuerzoHasta: almuerzo?.[1] ?? null })

const HORARIO: DiaHorario[] = [
  ...[1, 2, 3, 4, 5, 6].map((d) => fila(d, '08:00', '22:00', ['11:00', '15:30'])),
  fila(7, '08:00', '21:00', ['11:00', '15:30']),
  fila(8, '09:00', '20:00'),
]

const FRANJAS = normalizarFranjas([
  { dias: [2, 3], desde: '08:00', hasta: '09:30' },
  { dias: [2, 3], desde: '18:00', hasta: '19:00' },
  { dias: [6, 7], desde: '08:00', hasta: '09:00' },
  { dias: [6, 7], desde: '19:00', hasta: '20:00' },
])

const BENEFICIOS: BeneficioSocio[] = [
  {
    id: 1,
    tipo: 'porcentaje',
    valor: '10% de descuento',
    asunto: 'Toda la carta',
    descripcion: null,
    cuando: cuandoUsarlo([2, 3, 6, 7], FRANJAS),
    dias: [2, 3, 6, 7],
    franjas: FRANJAS,
    restricciones:
      'No aplica para domicilios.\nNo acumulable con otras promociones.\nEl beneficio no aplica sobre consumo de terceros cuyo pago no esté a cargo del miembro ORUM.',
  },
  {
    id: 2,
    tipo: 'porcentaje',
    valor: '10% de descuento',
    asunto: 'Brunch',
    descripcion: null,
    cuando: cuandoUsarlo([2, 3, 4], null),
    dias: [2, 3, 4],
    franjas: null,
    restricciones: 'Incluye a todos los integrantes de la mesa.',
  },
  {
    id: 3,
    tipo: 'regalo',
    valor: 'Regalo',
    asunto: 'Bebida GRATIS',
    descripcion: 'Por cada desayuno consumido te obsequiamos tu bebida.',
    cuando: cuandoUsarlo([1, 2, 3, 4, 5, 6], null),
    dias: [1, 2, 3, 4, 5, 6],
    franjas: null,
    restricciones: 'Aplica en todas las bebidas de la carta. Solo para la persona que tiene la membresía.',
  },
]

export default async function VistaPreviaBeneficios() {
  if (process.env.NODE_ENV === 'production') notFound()

  const sedes: SedeFicha[] = [
    {
      id: 1,
      nombre: 'Sede principal',
      direccion: 'Cra 23 # 30a - 17',
      ciudadNombre: 'Tuluá',
      telefono: '3001325756',
      horario: HORARIO,
    },
  ]

  return (
    <div className={estilos.pagina}>
      <section className={estilos.bloque}>
        <h2 className={estilos.titulo}>Ficha del socio</h2>
        <div className={portal.portal} data-theme="light">
          <FichaComercio
            nombre="Coraje"
            detalle="Gastronomía (Cafés) · Tuluá"
            logoUrl={null}
            portadaUrl={null}
            sedes={sedes}
            descripcion="Coraje Coffee Co. es un café restaurante en Tuluá que combina café de especialidad, desayunos, brunch y platos fuertes."
            fotos={[]}
            beneficio={
              <div className={fichaEstilos.beneficioTextos}>
                <p className={fichaEstilos.beneficioEtiqueta}>
                  <AdornoEstrella />
                  Tus beneficios ORUM
                </p>
                <BeneficiosSocio beneficios={BENEFICIOS} />
              </div>
            }
          />
        </div>
      </section>

      <section className={estilos.bloque}>
        <h2 className={estilos.titulo}>Editor de la promoción (panel)</h2>
        <div className={`${portal.portal} ${estilos.formulario}`} data-theme="light">
          <PromocionForm
            comercioId={1}
            tipos={[
              { id: 1, codigo: 'porcentaje', nombre: 'Porcentaje' },
              { id: 4, codigo: 'regalo', nombre: 'Regalo' },
            ]}
            promocion={{
              id: 1,
              titulo: 'Toda la carta',
              descripcion: null,
              tipo_beneficio_id: 1,
              valor: 10,
              fecha_inicio: null,
              fecha_fin: null,
              dias_semana: [2, 3, 6, 7],
              restricciones: 'No aplica para domicilios.',
              franjas_horarias: FRANJAS,
            }}
          />
        </div>
      </section>
    </div>
  )
}
