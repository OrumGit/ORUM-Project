'use client'

import { ChevronDown, Clock } from 'lucide-react'
import { diaDeSemanaISO } from '@/lib/comercios/dias-promocion'
import { esFestivoColombia } from '@/lib/comercios/festivos-colombia'
import {
  ahoraEnBogota,
  estadoAhora,
  etiquetaDias,
  partesEstado,
  resumenHorario,
  sinCortarHoras,
  textoTramos,
  type HorarioSucursal,
} from '@/lib/comercios/horario'
import { useInstanteAlMinuto } from './use-minuto'
import estilos from './horario-sede.module.css'

/*
  EL HORARIO DE UNA SEDE EN LA FICHA  ·  rediseño del 28/10/2026
  ---------------------------------------------------------------------------
  Encargo: «que se evidencie en qué momento está abierto; si van a almorzar,
  en esos momentos está cerrado», y que se entienda mejor. Antes era una
  línea de estado y, debajo, la semana en frases con «Almuerzo 11:00 –
  3:30» al final: había que restar para saber cuándo ir.

  Ahora, en la fila del reloj:
    · el ESTADO en una píldora —punto lleno si está abierto, hueco si no;
      siempre con texto— y al lado lo que viene: «Cierra por almuerzo a las
      11:00 a. m.», «Reabre a las 3:30 p. m.», «Abre mañana a las 8:00»;
    · debajo, HOY con sus horas ABIERTAS en tramos («8:00 – 11:00 a. m. y
      3:30 – 10:00 p. m.»): el hueco del almuerzo se ve sin leer la palabra;
    · y la semana entera plegada en «Ver horario de la semana», en dos
      columnas (días · horas), con hoy marcado.

  De CLIENTE a propósito: las fichas salen de caché y lo de «ahora» se
  quedaría viejo. En el servidor no hay instante: se pinta la semana, y el
  estado y «hoy» aparecen al montar, sin desajuste.
*/
export function HorarioSede({ horario }: { horario: HorarioSucursal }) {
  const instante = useInstanteAlMinuto()
  if (horario.length === 0) return null

  const { grupos, festivos } = resumenHorario(horario)

  const estado = instante ? estadoAhora(horario, instante) : null
  const partes = estado ? partesEstado(estado) : null
  const hoy = instante ? ahoraEnBogota(instante).fecha : null
  const hoyEsFestivo = hoy !== null && festivos !== null && esFestivoColombia(hoy)
  const diaHoy = hoy !== null ? diaDeSemanaISO(hoy) : null
  const filaHoy = hoyEsFestivo
    ? festivos
    : diaHoy !== null
      ? (horario.find((f) => f.dia === diaHoy) ?? null)
      : null

  return (
    <div className={estilos.horario}>
      <Clock size={15} aria-hidden="true" className={estilos.icono} />

      <div className={estilos.cuerpo}>
        {partes && estado && (
          <p className={estilos.estadoLinea}>
            <span className={estilos.estado} data-tipo={estado.tipo}>
              <span className={estilos.punto} aria-hidden="true" />
              {partes.titulo}
            </span>
            {partes.detalle && <span className={estilos.detalle}>{sinCortarHoras(partes.detalle)}</span>}
          </p>
        )}

        {filaHoy && (
          <p className={estilos.hoy}>
            <span className={estilos.hoyRotulo}>Hoy{hoyEsFestivo ? ' (festivo)' : ''}</span>
            {sinCortarHoras(textoTramos(filaHoy))}
          </p>
        )}

        <details className={estilos.semana}>
          <summary className={estilos.resumen}>
            {filaHoy ? 'Ver horario de la semana' : 'Horario de atención'}
            <ChevronDown size={15} aria-hidden="true" className={estilos.flecha} />
          </summary>
          <dl className={estilos.tabla}>
            {grupos.map((g) => {
              const esHoy = !hoyEsFestivo && diaHoy !== null && g.dias.includes(diaHoy)
              return (
                <div key={g.dias[0]} className={estilos.fila} data-hoy={esHoy || undefined}>
                  <dt>
                    {etiquetaDias(g.dias)}
                    {esHoy && <span className="sr-only"> (hoy)</span>}
                  </dt>
                  <dd data-cerrado={g.fila.abre === null || undefined}>{sinCortarHoras(textoTramos(g.fila))}</dd>
                </div>
              )
            })}
            {festivos && (
              <div className={estilos.fila} data-hoy={hoyEsFestivo || undefined}>
                <dt>
                  Festivos
                  {hoyEsFestivo && <span className="sr-only"> (hoy)</span>}
                </dt>
                <dd data-cerrado={festivos.abre === null || undefined}>{sinCortarHoras(textoTramos(festivos))}</dd>
              </div>
            )}
          </dl>
        </details>
      </div>
    </div>
  )
}
