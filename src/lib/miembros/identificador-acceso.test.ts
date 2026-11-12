import { describe, expect, it } from 'vitest'
import { clasificarIdentificador } from './identificador-acceso'

describe('clasificarIdentificador', () => {
  it('reconoce un número de membresía de 8 dígitos, con ceros a la izquierda', () => {
    expect(clasificarIdentificador('00044150')).toEqual({ tipo: 'numero', valor: '00044150' })
    expect(clasificarIdentificador('  00044150 ')).toEqual({ tipo: 'numero', valor: '00044150' })
  })

  it('reconoce un correo y lo normaliza', () => {
    expect(clasificarIdentificador('  Ana.Perez@Gmail.COM ')).toEqual({
      tipo: 'correo',
      valor: 'ana.perez@gmail.com',
    })
  })

  it('rechaza vacío', () => {
    expect(clasificarIdentificador('   ')).toBeNull()
  })

  it('rechaza un número que no tiene 8 dígitos', () => {
    expect(clasificarIdentificador('1234567')).toBeNull()
    expect(clasificarIdentificador('123456789')).toBeNull()
  })

  it('rechaza algo que no es ni número ni correo', () => {
    expect(clasificarIdentificador('ana perez')).toBeNull()
    expect(clasificarIdentificador('ana@gmail')).toBeNull()
  })
})
