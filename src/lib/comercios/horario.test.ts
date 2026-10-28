import { describe, expect, it } from 'vitest'
import {
  almuerzoCabe,
  ahoraEnBogota,
  DIA_FESTIVOS,
  estadoAhora,
  etiquetaDias,
  formatearHora,
  normalizarHora,
  partesEstado,
  resumenHorario,
  sinCortarHoras,
  textoEstado,
  textoGrupo,
  textoTramos,
  validarHorario,
  type DiaHorario,
  type HorarioSucursal,
} from './horario'

const dia = (
  n: number,
  abre: string | null,
  cierra: string | null,
  almuerzo: [string, string] | null = null,
): DiaHorario => ({
  dia: n,
  abre,
  cierra,
  almuerzoDesde: almuerzo?.[0] ?? null,
  almuerzoHasta: almuerzo?.[1] ?? null,
})

/** Un instante a partir de la hora de pared de Bogotá (UTC−5). */
const bogota = (fecha: string, hora: string) => new Date(`${fecha}T${hora}:00-05:00`)

/** Lunes a viernes 09:00–18:00 con almuerzo 12:00–13:00. */
const SEMANA: HorarioSucursal = [1, 2, 3, 4, 5].map((n) => dia(n, '09:00', '18:00', ['12:00', '13:00']))

describe('normalizarHora', () => {
  it('quita los segundos que devuelve la base', () => {
    expect(normalizarHora('08:00:00')).toBe('08:00')
  })
  it('rechaza lo que no es una hora', () => {
    expect(normalizarHora('x')).toBeNull()
    expect(normalizarHora('25:00')).toBeNull()
    expect(normalizarHora(null)).toBeNull()
  })
})

describe('formatearHora', () => {
  it('pasa a 12 horas con a. m. / p. m.', () => {
    expect(formatearHora('09:00')).toBe('9:00 a. m.')
    expect(formatearHora('12:00')).toBe('12:00 p. m.')
    expect(formatearHora('00:00')).toBe('12:00 a. m.')
    expect(formatearHora('23:59')).toBe('11:59 p. m.')
  })
})

describe('validarHorario', () => {
  it('acepta una jornada con almuerzo dentro', () => {
    expect(validarHorario([dia(1, '09:00', '18:00', ['12:00', '13:00'])])).toBeNull()
  })
  it('acepta cierre pasada la medianoche y 24 horas', () => {
    expect(validarHorario([dia(5, '22:00', '02:00')])).toBeNull()
    expect(validarHorario([dia(6, '00:00', '23:59')])).toBeNull()
  })
  it('acepta un día cerrado y el de festivos', () => {
    expect(validarHorario([dia(7, null, null), dia(DIA_FESTIVOS, '10:00', '16:00')])).toBeNull()
  })
  it('rechaza un almuerzo con una sola hora', () => {
    const fila: DiaHorario = { ...dia(1, '09:00', '18:00'), almuerzoDesde: '12:00' }
    expect(validarHorario([fila])).toMatch(/almuerzo/i)
  })
  it('rechaza un almuerzo en un día cerrado', () => {
    expect(validarHorario([dia(1, null, null, ['12:00', '13:00'])])).toMatch(/almuerzo/i)
  })
  it('rechaza un almuerzo fuera de la jornada', () => {
    expect(validarHorario([dia(1, '09:00', '18:00', ['08:00', '10:00'])])).toMatch(/almuerzo/i)
    expect(validarHorario([dia(1, '09:00', '18:00', ['17:30', '19:00'])])).toMatch(/almuerzo/i)
  })
  it('rechaza abrir y cerrar a la misma hora', () => {
    expect(validarHorario([dia(1, '09:00', '09:00')])).not.toBeNull()
  })
  it('rechaza una sola de las dos horas de la jornada', () => {
    expect(validarHorario([dia(1, '09:00', null)])).not.toBeNull()
  })
  it('rechaza una hora mal formada', () => {
    expect(validarHorario([dia(1, '25:00', '18:00')])).not.toBeNull()
  })
  it('rechaza un día fuera de 1–8 o repetido', () => {
    expect(validarHorario([dia(9, '09:00', '18:00')])).not.toBeNull()
    expect(validarHorario([dia(1, '09:00', '18:00'), dia(1, '10:00', '17:00')])).not.toBeNull()
  })
})

describe('estadoAhora', () => {
  it('sin filas no hay horario', () => {
    expect(estadoAhora([], bogota('2026-10-26', '10:00'))).toEqual({
      tipo: 'sin_horario',
      proximo: null,
    })
  })

  it('lunes 10:00 está abierto hasta el almuerzo', () => {
    expect(estadoAhora(SEMANA, bogota('2026-10-26', '10:00'))).toEqual({
      tipo: 'abierto',
      proximo: { cuando: 'hoy', hora: '12:00', accion: 'almuerzo' },
    })
  })

  it('lunes 12:30 está en pausa de almuerzo', () => {
    expect(estadoAhora(SEMANA, bogota('2026-10-26', '12:30'))).toEqual({
      tipo: 'almuerzo',
      proximo: { cuando: 'hoy', hora: '13:00', accion: 'reabre' },
    })
  })

  it('lunes 15:00 está abierto hasta el cierre', () => {
    expect(estadoAhora(SEMANA, bogota('2026-10-26', '15:00'))).toEqual({
      tipo: 'abierto',
      proximo: { cuando: 'hoy', hora: '18:00', accion: 'cierra' },
    })
  })

  it('lunes 19:00 está cerrado y abre mañana', () => {
    expect(estadoAhora(SEMANA, bogota('2026-10-26', '19:00'))).toEqual({
      tipo: 'cerrado',
      proximo: { cuando: 'manana', hora: '09:00', accion: 'abre' },
    })
  })

  it('el sábado cerrado dice que abre el lunes', () => {
    expect(estadoAhora(SEMANA, bogota('2026-10-24', '10:00'))).toEqual({
      tipo: 'cerrado',
      proximo: { cuando: 1, hora: '09:00', accion: 'abre' },
    })
  })

  it('el cierre pasada la medianoche cuenta para el día siguiente', () => {
    const bar = [dia(1, '22:00', '02:00')]
    expect(estadoAhora(bar, bogota('2026-10-27', '01:00'))).toEqual({
      tipo: 'abierto',
      proximo: { cuando: 'hoy', hora: '02:00', accion: 'cierra' },
    })
    expect(estadoAhora(bar, bogota('2026-10-27', '03:00')).tipo).toBe('cerrado')
  })

  it('el día y la hora salen de Bogotá, no de UTC', () => {
    // 03:00Z del 24 de octubre es viernes 23, 22:00 en Bogotá.
    const viernes = [dia(5, '18:00', '23:00')]
    expect(estadoAhora(viernes, new Date('2026-10-24T03:00:00Z')).tipo).toBe('abierto')
  })

  it('un festivo manda la fila de festivos sobre la del día', () => {
    const conFestivos = [...SEMANA, dia(DIA_FESTIVOS, '10:00', '16:00')]
    // Lunes 18 de mayo de 2026 es festivo: a las 17:00 el lunes normal estaría abierto.
    expect(estadoAhora(conFestivos, bogota('2026-05-18', '17:00')).tipo).toBe('cerrado')
    expect(estadoAhora(conFestivos, bogota('2026-05-18', '11:00')).tipo).toBe('abierto')
  })

  it('un festivo con la fila de festivos cerrada no abre', () => {
    const cerradoFestivos = [...SEMANA, dia(DIA_FESTIVOS, null, null)]
    expect(estadoAhora(cerradoFestivos, bogota('2026-05-18', '10:00')).tipo).toBe('cerrado')
  })

  it('sin fila de festivos, el festivo se rige por su día de la semana', () => {
    expect(estadoAhora(SEMANA, bogota('2026-05-18', '10:00')).tipo).toBe('abierto')
  })
})

describe('almuerzoCabe', () => {
  it('cabe dentro de la jornada', () => {
    expect(almuerzoCabe('09:00', '18:00', '12:00', '13:00')).toBe(true)
  })
  it('no cabe si la jornada es más corta o no lo contiene', () => {
    expect(almuerzoCabe('10:00', '12:00', '12:00', '13:00')).toBe(false)
    expect(almuerzoCabe('09:00', '18:00', '08:00', '10:00')).toBe(false)
  })
  it('cabe en una jornada pasada la medianoche', () => {
    expect(almuerzoCabe('22:00', '02:00', '23:30', '00:30')).toBe(true)
  })
  it('un día cerrado o una hora inválida no lo admite', () => {
    expect(almuerzoCabe(null, null, '12:00', '13:00')).toBe(false)
    expect(almuerzoCabe('09:00', '18:00', '', '13:00')).toBe(false)
  })
})

describe('ahoraEnBogota', () => {
  it('03:00Z del 24 de octubre es el 23 a las 22:00 en Bogotá', () => {
    expect(ahoraEnBogota(new Date('2026-10-24T03:00:00Z'))).toEqual({
      fecha: '2026-10-23',
      minutos: 22 * 60,
    })
  })
})

describe('textoEstado', () => {
  it('abierto dice cuándo cierra', () => {
    expect(textoEstado(estadoAhora(SEMANA, bogota('2026-10-26', '15:00')))).toBe(
      'Abierto ahora · cierra a las 6:00 p. m.',
    )
  })
  it('abierto antes del almuerzo dice cuándo empieza la pausa', () => {
    expect(textoEstado(estadoAhora(SEMANA, bogota('2026-10-26', '10:00')))).toBe(
      'Abierto ahora · pausa de almuerzo a las 12:00 p. m.',
    )
  })
  it('en pausa dice cuándo reabre, con «a la» para la 1:00', () => {
    expect(textoEstado(estadoAhora(SEMANA, bogota('2026-10-26', '12:30')))).toBe(
      'En pausa de almuerzo · reabre a la 1:00 p. m.',
    )
  })
  it('cerrado dice hoy, mañana o el día', () => {
    expect(textoEstado(estadoAhora(SEMANA, bogota('2026-10-26', '19:00')))).toBe(
      'Cerrado · abre mañana a las 9:00 a. m.',
    )
    expect(textoEstado(estadoAhora(SEMANA, bogota('2026-10-24', '10:00')))).toBe(
      'Cerrado · abre el lunes a las 9:00 a. m.',
    )
    expect(textoEstado(estadoAhora(SEMANA, bogota('2026-10-26', '07:00')))).toBe(
      'Cerrado · abre hoy a las 9:00 a. m.',
    )
  })
  it('sin horario no dice nada', () => {
    expect(textoEstado({ tipo: 'sin_horario', proximo: null })).toBe('')
  })
})

describe('resumenHorario', () => {
  it('junta los días consecutivos iguales', () => {
    const { grupos, festivos } = resumenHorario(SEMANA)
    expect(grupos).toHaveLength(1)
    expect(grupos[0].dias).toEqual([1, 2, 3, 4, 5])
    expect(festivos).toBeNull()
  })

  it('separa el sábado distinto y deja fuera el domingo sin fila', () => {
    const { grupos } = resumenHorario([...SEMANA, dia(6, '10:00', '14:00')])
    expect(grupos.map((g) => g.dias)).toEqual([[1, 2, 3, 4, 5], [6]])
  })

  it('no junta días iguales separados por un día distinto', () => {
    const { grupos } = resumenHorario([
      dia(1, '09:00', '18:00'),
      dia(2, '10:00', '14:00'),
      dia(3, '09:00', '18:00'),
    ])
    expect(grupos.map((g) => g.dias)).toEqual([[1], [2], [3]])
  })

  it('devuelve aparte la fila de festivos', () => {
    const { festivos } = resumenHorario([...SEMANA, dia(DIA_FESTIVOS, null, null)])
    expect(festivos?.dia).toBe(DIA_FESTIVOS)
  })
})

describe('textoGrupo', () => {
  it('dice el rango de días, la jornada y el almuerzo', () => {
    const { grupos } = resumenHorario(SEMANA)
    expect(textoGrupo(grupos[0])).toBe(
      'Lun–vie · 9:00 a. m. – 6:00 p. m. · Almuerzo 12:00 p. m. – 1:00 p. m.',
    )
  })

  it('un día cerrado dice Cerrado', () => {
    const { grupos } = resumenHorario([dia(6, null, null)])
    expect(textoGrupo(grupos[0])).toBe('Sáb · Cerrado')
  })
})

describe('la ficha nueva: tramos, días y estado en dos partes', () => {
  it('dice las horas en que está ABIERTO, con el hueco del almuerzo', () => {
    expect(textoTramos(dia(1, '08:00', '22:00', ['11:00', '15:30']))).toBe('8:00 – 11:00 a. m. y 3:30 – 10:00 p. m.')
    expect(textoTramos(dia(1, '09:00', '18:00'))).toBe('9:00 a. m. – 6:00 p. m.')
    expect(textoTramos(dia(1, null, null))).toBe('Cerrado')
    expect(textoTramos(dia(5, '18:00', '02:00'))).toBe('6:00 p. m. – 2:00 a. m.')
  })

  it('los días de un grupo, en corto', () => {
    expect(etiquetaDias([1, 2, 3, 4, 5, 6])).toBe('Lun a sáb')
    expect(etiquetaDias([6, 7])).toBe('Sáb y dom')
    expect(etiquetaDias([7])).toBe('Dom')
  })

  it('el estado en titular y detalle', () => {
    expect(partesEstado(estadoAhora(SEMANA, bogota('2026-10-26', '10:00')))).toEqual({
      titulo: 'Abierto ahora',
      detalle: 'Cierra por almuerzo a las 12:00 p. m.',
    })
    expect(partesEstado(estadoAhora(SEMANA, bogota('2026-10-26', '12:30')))).toEqual({
      titulo: 'Cerrado por almuerzo',
      detalle: 'Reabre a la 1:00 p. m.',
    })
    expect(partesEstado(estadoAhora(SEMANA, bogota('2026-10-26', '15:00')))).toEqual({
      titulo: 'Abierto ahora',
      detalle: 'Cierra a las 6:00 p. m.',
    })
    expect(partesEstado(estadoAhora(SEMANA, bogota('2026-10-26', '19:00')))).toEqual({
      titulo: 'Cerrado',
      detalle: 'Abre mañana a las 9:00 a. m.',
    })
    expect(partesEstado({ tipo: 'sin_horario', proximo: null })).toBeNull()
  })
})

describe('sinCortarHoras', () => {
  it('pega «a. m.» a su hora y no parte un rango', () => {
    expect(sinCortarHoras('8:00 – 9:30 a. m. y 6:00 p. m.')).toBe('8:00\u00a0–\u00a09:30\u00a0a.\u00a0m. y 6:00\u00a0p.\u00a0m.')
  })
})
