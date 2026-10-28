import { describe, expect, it } from 'vitest'
import {
  cedula,
  contrasena,
  correo,
  entero,
  errorDe,
  fecha,
  igualA,
  largo,
  leerPesos,
  nombrePersona,
  noAntesDe,
  obligatorio,
  porcentaje,
  precio,
  salvoCortesia,
  telefono,
  validarTodo,
} from './reglas'

const sinOtros = {}

describe('salvoCortesia', () => {
  const regla = salvoCortesia(obligatorio('Escribe el precio.'))

  it('aplica la regla cuando la casilla no está marcada', () => {
    expect(regla('', {})).toBe('Escribe el precio.')
    expect(regla('', { es_cortesia: '' })).toBe('Escribe el precio.')
    expect(regla('50000', {})).toBeNull()
  })

  it('la salta cuando la casilla está marcada', () => {
    expect(regla('', { es_cortesia: 'on' })).toBeNull()
  })
})

describe('obligatorio y largo', () => {
  it('obligatorio rechaza lo vacío o solo espacios', () => {
    expect(obligatorio()('  ', sinOtros)).not.toBeNull()
    expect(obligatorio()('x', sinOtros)).toBeNull()
  })

  it('largo deja pasar lo vacío y mide sin espacios de los bordes', () => {
    const r = largo(3, 10, 'El nombre')
    expect(r('', sinOtros)).toBeNull()
    expect(r(' ab ', sinOtros)).toMatch(/corto/)
    expect(r('a'.repeat(11), sinOtros)).toMatch(/pasar/)
    expect(r('aaaab', sinOtros)).toMatch(/repetidas/)
    expect(r('Café', sinOtros)).toBeNull()
  })
})

describe('personas', () => {
  it('nombres con tildes, ñ y guiones', () => {
    expect(nombrePersona('María José', sinOtros)).toBeNull()
    expect(nombrePersona('Peña-Ordóñez', sinOtros)).toBeNull()
    expect(nombrePersona('J', sinOtros)).not.toBeNull()
    expect(nombrePersona('Juan3', sinOtros)).toMatch(/letras/)
  })

  it('cédula de 5 a 10 cifras, admite puntos', () => {
    expect(cedula('1.032.456.789', sinOtros)).toBeNull()
    expect(cedula('1234', sinOtros)).toMatch(/entre 5 y 10/)
    expect(cedula('12345678901', sinOtros)).toMatch(/entre 5 y 10/)
    expect(cedula('11111111', sinOtros)).toMatch(/iguales/)
    expect(cedula('12a45', sinOtros)).toMatch(/solo números/)
  })

  it('teléfono colombiano', () => {
    expect(telefono('300 482 9031', sinOtros)).toBeNull()
    expect(telefono('+57 316 482 9031', sinOtros)).toBeNull()
    expect(telefono('12345', sinOtros)).not.toBeNull()
    expect(telefono('', sinOtros)).toBeNull()
  })

  it('correo, con los dominios mal escritos', () => {
    expect(correo('laura@gmail.com', sinOtros)).toBeNull()
    expect(correo('laura@gmial.com', sinOtros)).toMatch(/dominio/)
    expect(correo('hola.sinarroba.co', sinOtros)).not.toBeNull()
  })
})

describe('números', () => {
  it('entero con mínimo y máximo', () => {
    const r = entero(1, 60, 'La duración')
    expect(r('12', sinOtros)).toBeNull()
    expect(r('0', sinOtros)).toMatch(/mínimo/)
    expect(r('61', sinOtros)).toMatch(/pasar/)
    expect(r('1.5', sinOtros)).toMatch(/entero/)
  })

  it('precio admite separadores y signo de pesos', () => {
    const r = precio()
    expect(r('$ 120.000', sinOtros)).toBeNull()
    expect(r('0', sinOtros)).toMatch(/mayor que cero/)
    expect(r('abc', sinOtros)).toMatch(/solo con números/)
    expect(r('999999999', sinOtros)).toMatch(/pasar/)
    expect(precio(undefined, true)('0', sinOtros)).toBeNull()
  })

  it('leerPesos distingue puntos de miles de decimales', () => {
    expect(leerPesos('$ 120.000')).toBe(120000)
    expect(leerPesos('1.200.000')).toBe(1200000)
    expect(leerPesos('120000.5')).toBe(120000.5)
    expect(leerPesos('')).toBeNaN()
  })

  it('porcentaje de 1 a 100', () => {
    expect(porcentaje('15', sinOtros)).toBeNull()
    expect(porcentaje('15%', sinOtros)).toBeNull()
    expect(porcentaje('0', sinOtros)).not.toBeNull()
    expect(porcentaje('120', sinOtros)).not.toBeNull()
  })
})

describe('fechas', () => {
  it('fecha real', () => {
    expect(fecha('2026-10-15', sinOtros)).toBeNull()
    expect(fecha('2026-02-30', sinOtros)).toMatch(/no existe/)
    expect(fecha('15/10/2026', sinOtros)).not.toBeNull()
  })

  it('no antes de otro campo', () => {
    const r = noAntesDe('inicio', 'Termina antes de empezar.')
    expect(r('2026-10-01', { inicio: '2026-10-15' })).toMatch(/Termina/)
    expect(r('2026-10-20', { inicio: '2026-10-15' })).toBeNull()
  })
})

describe('acceso', () => {
  it('contraseña: la política de toda la app (largo, sin series, ni común)', () => {
    expect(contrasena('el perro toby come arepas', sinOtros)).toBeNull()
    expect(contrasena('corta1', sinOtros)).toMatch(/12/)
    expect(contrasena('Colombia2024!', sinOtros)).toMatch(/común/)
  })

  it('repetir la contraseña', () => {
    const r = igualA('clave', 'No coinciden.')
    expect(r('orum2026', { clave: 'orum2026' })).toBeNull()
    expect(r('orum2025', { clave: 'orum2026' })).toBe('No coinciden.')
  })
})

describe('validarTodo', () => {
  it('el primer error de cada campo, en orden', () => {
    const reglas = { nombres: [obligatorio('Falta el nombre.'), nombrePersona], cedula: [obligatorio(), cedula] }
    expect(validarTodo(reglas, { nombres: '', cedula: '12' })).toEqual({
      nombres: 'Falta el nombre.',
      cedula: 'Debe tener entre 5 y 10 cifras.',
    })
    expect(errorDe('nombres', reglas, { nombres: 'Ana' })).toBeNull()
  })
})
