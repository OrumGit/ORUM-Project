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
  EL HORARIO DE ATENCIÓN DE UNA SEDE  ·  cuarta versión (29/10/2026)
  ---------------------------------------------------------------------------
  La tercera (título en versales, píldora roja con un círculo, «HOY» en
  negro y todo en negrita) no gustó: «todo muy exagerado; quiero algo
  minimalista y que se entienda a la primera». Ahora es una fila más de la
  sede, como la dirección y el teléfono, con su reloj dorado:

    🕘 Cerrado ahora · abre hoy a las 6:00 p. m.
       Todos los días        6:00 p. m. – 9:00 p. m.

  Peso normal en todo. Lo único con color es la palabra del estado, en SU
  color de texto (verde, ámbar, rojo; los tres pasan AA sobre blanco) y
  diciendo el estado con palabras: el color nunca va solo. Sin píldora, sin
  punto, sin recuadro, sin título. Con varias filas, la de hoy va en tinta
  plena con un «hoy» discreto y las demás un paso más claras; con una sola
  fila no hace falta marcar nada. Se conserva lo que la tercera arregló:
  los días enteros, las horas completas, un turno por renglón y el almuerzo
  dicho con palabras. **No vuelvas a la píldora, al «HOY» negro ni a la
  negrita.**

  De CLIENTE a propósito: las fichas salen de caché y lo de «ahora» se
  quedaría viejo. En el servidor se pinta la semana; el estado y «hoy»
  aparecen al montar, sin desajuste (`useInstanteAlMinuto`).
*/

function Jornada({ fila }: { fila: DiaHorario }) {
  const j = jornadaLegible(fila)
  if (j.cerrado) return <span>Cerrado</span>
  return (
    <>
      {j.turnos.map((t) => (
        <span key={t}>{sinCortarHoras(t)}</span>
      ))}
      {j.pausa && <span className={estilos.pausa}>{sinCortarHoras(j.pausa)}</span>}
    </>
  )
}

/** «Abre hoy…» → «abre hoy…»: sigue a «Cerrado ahora ·» en la misma frase. */
const enMinuscula = (texto: string) => texto.charAt(0).toLowerCase() + texto.slice(1)

export function HorarioSede({ horario }: { horario: HorarioSucursal }) {
  const instante = useInstanteAlMinuto()
  if (horario.length === 0) return null

  const { grupos, festivos } = resumenHorario(horario)

  const estado = instante ? estadoAhora(horario, instante) : null
  const partes = estado ? partesEstado(estado) : null
  const hoy = instante ? ahoraEnBogota(instante).fecha : null
  const hoyEsFestivo = hoy !== null && festivos !== null && esFestivoColombia(hoy)
  const diaHoy = hoy !== null ? diaDeSemanaISO(hoy) : null
  // Con una sola fila, «hoy» no distingue nada.
  const marcarHoy = grupos.length + (festivos ? 1 : 0) > 1

  const filas = [
    ...grupos.map((g) => ({
      clave: String(g.dias[0]),
      dias: nombreDias(g.dias),
      fila: g.fila,
      esHoy: !hoyEsFestivo && diaHoy !== null && g.dias.includes(diaHoy),
    })),
    ...(festivos ? [{ clave: 'festivos', dias: 'Festivos', fila: festivos, esHoy: hoyEsFestivo }] : []),
  ]

  return (
    <section className={estilos.horario} aria-label="Horario de atención">
      <Clock size={15} aria-hidden="true" className={estilos.icono} />
      <div className={estilos.cuerpo}>
        {partes && estado && (
          <p className={estilos.estado}>
            <span className={estilos.palabra} data-tipo={estado.tipo}>
              {partes.titulo}
            </span>
            {partes.detalle && <> · {sinCortarHoras(enMinuscula(partes.detalle))}</>}
          </p>
        )}

        <dl className={estilos.semana} data-marca-hoy={(marcarHoy && hoy !== null) || undefined}>
          {filas.map((f) => (
            <div key={f.clave} className={estilos.fila} data-hoy={(marcarHoy && f.esHoy) || undefined}>
              <dt className={estilos.dias}>
                {f.dias}
                {marcarHoy && f.esHoy && <span className={estilos.hoy}> · hoy</span>}
              </dt>
              <dd className={estilos.horas}>
                <Jornada fila={f.fila} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
