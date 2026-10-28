'use client'

import { Clock } from 'lucide-react'
import { diaDeSemanaISO } from '@/lib/comercios/dias-promocion'
import { esFestivoColombia } from '@/lib/comercios/festivos-colombia'
import {
  ahoraEnBogota,
  estadoAhora,
  jornadaLegible,
  nombreDias,
  partesEstado,
  resumenHorario,
  sinCortarHoras,
  type DiaHorario,
  type HorarioSucursal,
} from '@/lib/comercios/horario'
import { useInstanteAlMinuto } from './use-minuto'
import estilos from './horario-sede.module.css'

/*
  EL HORARIO DE ATENCIÓN DE UNA SEDE  ·  tercera versión (29/10/2026)
  ---------------------------------------------------------------------------
  Un probador, mirando la anterior: «como usuario, no lo entiendo». Tenía
  el reloj sin título, una línea «Hoy» que repetía la tabla, los días en
  corto («Lun a sáb») y las horas que compartían «a. m.» («8:00 – 11:00
  a. m. y 3:30 – 10:00 p. m.»): había que descifrarlo. Ahora se lee solo:

    HORARIO DE ATENCIÓN                         ← su título, con el reloj
    [● Abierto ahora]  Cierra a las 11:00 a. m. para almorzar
    Lunes a sábado  HOY   8:00 a. m. – 11:00 a. m.
                          3:30 p. m. – 10:00 p. m.
                          Cerrado por almuerzo de 11:00 a. m. a 3:30 p. m.
    Domingo               …

  Los días enteros, las horas completas, un turno por renglón y el
  almuerzo dicho con palabras; hoy, marcado con su etiqueta. La semana se ve
  entera, sin plegar: son pocas filas y es justo lo que se viene a mirar.

  De CLIENTE a propósito: las fichas salen de caché y lo de «ahora» se
  quedaría viejo. En el servidor se pinta la semana; el estado y «Hoy»
  aparecen al montar, sin desajuste (`useInstanteAlMinuto`).
*/

function Jornada({ fila }: { fila: DiaHorario }) {
  const j = jornadaLegible(fila)
  if (j.cerrado) return <span className={estilos.cerrado}>Cerrado</span>
  return (
    <>
      {j.turnos.map((t) => (
        <span key={t} className={estilos.turno}>
          {sinCortarHoras(t)}
        </span>
      ))}
      {j.pausa && <span className={estilos.pausa}>{sinCortarHoras(j.pausa)}</span>}
    </>
  )
}

export function HorarioSede({ horario }: { horario: HorarioSucursal }) {
  const instante = useInstanteAlMinuto()
  if (horario.length === 0) return null

  const { grupos, festivos } = resumenHorario(horario)

  const estado = instante ? estadoAhora(horario, instante) : null
  const partes = estado ? partesEstado(estado) : null
  const hoy = instante ? ahoraEnBogota(instante).fecha : null
  const hoyEsFestivo = hoy !== null && festivos !== null && esFestivoColombia(hoy)
  const diaHoy = hoy !== null ? diaDeSemanaISO(hoy) : null

  return (
    <section className={estilos.horario} aria-label="Horario de atención">
      <p className={estilos.titulo}>
        <Clock size={15} aria-hidden="true" className={estilos.icono} />
        Horario de atención
      </p>

      {partes && estado && (
        <p className={estilos.estadoLinea}>
          <span className={estilos.estado} data-tipo={estado.tipo}>
            <span className={estilos.punto} aria-hidden="true" />
            {partes.titulo}
          </span>
          {partes.detalle && <span className={estilos.detalle}>{sinCortarHoras(partes.detalle)}</span>}
        </p>
      )}

      <dl className={estilos.semana}>
        {grupos.map((g) => {
          const esHoy = !hoyEsFestivo && diaHoy !== null && g.dias.includes(diaHoy)
          return (
            <div key={g.dias[0]} className={estilos.fila} data-hoy={esHoy || undefined}>
              <dt className={estilos.dias}>
                {nombreDias(g.dias)}
                {esHoy && <span className={estilos.hoy}>Hoy</span>}
              </dt>
              <dd className={estilos.horas}>
                <Jornada fila={g.fila} />
              </dd>
            </div>
          )
        })}
        {festivos && (
          <div className={estilos.fila} data-hoy={hoyEsFestivo || undefined}>
            <dt className={estilos.dias}>
              Festivos
              {hoyEsFestivo && <span className={estilos.hoy}>Hoy</span>}
            </dt>
            <dd className={estilos.horas}>
              <Jornada fila={festivos} />
            </dd>
          </div>
        )}
      </dl>
    </section>
  )
}
