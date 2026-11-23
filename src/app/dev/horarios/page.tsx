import { notFound } from 'next/navigation'
import { FichaComercio, type SedeFicha } from '@/components/comercios/ficha-comercio'
import { EditorHorario } from '@/app/OrumAdminLogin/comercios/[id]/sucursales/_components/editor-horario'
import type { DiaHorario } from '@/lib/comercios/horario'
import portal from '@/app/miembros/(portal)/portal.module.css'
import estilos from './horarios.module.css'

export const metadata = {
  title: 'Vista previa de horarios · ORUM',
}

/**
 * El editor de horario y su aspecto en la ficha, con datos FALSOS y solo en
 * desarrollo. Las pantallas reales exigen una sesión de administrador y una
 * base con la tabla `sucursal_horarios`; aquí se monta sin ninguna de las dos.
 *
 * `?caso=vacio` (sin horario), `?caso=noche` (cierra pasada la medianoche) o,
 * por defecto, lunes a viernes con almuerzo, sábado reducido y festivos cerrados.
 */

const fila = (
  dia: number,
  abre: string | null,
  cierra: string | null,
  almuerzo: [string, string] | null = null,
): DiaHorario => ({
  dia,
  abre,
  cierra,
  almuerzoDesde: almuerzo?.[0] ?? null,
  almuerzoHasta: almuerzo?.[1] ?? null,
})

const SEMANA: DiaHorario[] = [
  ...[1, 2, 3, 4, 5].map((d) => fila(d, '09:00', '18:00', ['12:00', '13:00'])),
  fila(6, '10:00', '14:00'),
  fila(7, null, null),
  fila(8, null, null),
]

const NOCHE: DiaHorario[] = [
  ...[4, 5, 6].map((d) => fila(d, '22:00', '02:00')),
  fila(8, '22:00', '03:00'),
]

export default async function VistaPreviaHorarios({
  searchParams,
}: {
  searchParams: Promise<{ caso?: string }>
}) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { caso } = await searchParams

  const horario = caso === 'vacio' ? [] : caso === 'noche' ? NOCHE : SEMANA

  const sedes: SedeFicha[] = [
    {
      id: 1,
      nombre: 'Sede Centro',
      direccion: 'Calle 10 # 5-20',
      ciudadNombre: 'Bogotá',
      telefono: '601 555 0100',
      horario,
    },
    {
      id: 2,
      nombre: 'Sede Norte',
      direccion: null,
      ciudadNombre: 'Bogotá',
      horario: [fila(1, '08:00', '17:00')],
    },
    {
      id: 3,
      nombre: 'Sede Sur',
      direccion: 'Carrera 30 # 40-10',
      ciudadNombre: 'Medellín',
    },
  ]

  return (
    <div className={estilos.pagina}>
      <section className={estilos.bloque}>
        <h2 className={estilos.titulo}>Editor (panel de administración)</h2>
        <form className={estilos.formulario}>
          <EditorHorario inicial={horario} />
        </form>
      </section>

      <section className={estilos.bloque}>
        <h2 className={estilos.titulo}>Ficha del comercio</h2>
        <div className={portal.portal} data-theme="light">
          <FichaComercio
            nombre="Café de prueba"
            detalle="Restaurantes · Bogotá"
            logoUrl={null}
            portadaUrl={null}
            sedes={sedes}
            descripcion="Un comercio inventado para revisar el horario sin base de datos."
            fotos={[]}
            beneficio={<p>Beneficio de ejemplo</p>}
          />
        </div>
      </section>
    </div>
  )
}
