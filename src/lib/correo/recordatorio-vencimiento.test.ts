import { describe, expect, it } from 'vitest'
import { construirCorreoRecordatorio, fechaCivilLarga } from './recordatorio-vencimiento'

const base = {
  nombre: 'Ana <Pérez>',
  fechaFin: '2026-12-01',
  dias: 5,
  urlPortal: 'https://www.cluborum.com/miembros/perfil',
}

describe('fechaCivilLarga', () => {
  it('escribe la fecha civil sin correrla de día', () => {
    expect(fechaCivilLarga('2026-12-01')).toBe('1 de diciembre de 2026')
    expect(fechaCivilLarga('2027-01-31')).toBe('31 de enero de 2027')
  })
})

describe('construirCorreoRecordatorio', () => {
  it('pone la fecha de vencimiento en el asunto', () => {
    const c = construirCorreoRecordatorio(base)
    expect(c.asunto).toBe('Tu membresía ORUM vence el 1 de diciembre de 2026')
  })

  it('dice cuántos días faltan, en singular y plural', () => {
    expect(construirCorreoRecordatorio(base).texto).toContain('en 5 días')
    expect(construirCorreoRecordatorio({ ...base, dias: 1 }).texto).toContain('en 1 día.')
  })

  it('escapa el nombre en el HTML y lleva al portal', () => {
    const c = construirCorreoRecordatorio(base)
    expect(c.html).toContain('Ana &lt;Pérez&gt;')
    expect(c.html).not.toContain('Ana <Pérez>')
    expect(c.html).toContain(base.urlPortal)
    expect(c.texto).toContain(base.urlPortal)
  })
})
