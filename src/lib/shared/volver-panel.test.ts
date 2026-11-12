import { describe, expect, it } from 'vitest'
import {
  TOPE_PILA,
  anotarVisita,
  destinoVolver,
  hayVolver,
  rutaDe,
  rutaPadre,
  textoVolver,
} from './volver-panel'

describe('rutaDe', () => {
  it('quita la consulta y la barra final', () => {
    expect(rutaDe('/OrumAdminLogin/comercios?estado=ocultos')).toBe('/OrumAdminLogin/comercios')
    expect(rutaDe('/OrumAdminLogin/comercios/')).toBe('/OrumAdminLogin/comercios')
    expect(rutaDe('/OrumAdminLogin#x')).toBe('/OrumAdminLogin')
  })
})

describe('anotarVisita', () => {
  it('añade los lugares nuevos', () => {
    expect(anotarVisita(['/OrumAdminLogin'], '/OrumAdminLogin/comercios')).toEqual(['/OrumAdminLogin', '/OrumAdminLogin/comercios'])
  })

  it('cambiar de pestaña o filtro no apila: guarda la URL nueva del mismo lugar', () => {
    const pila = ['/OrumAdminLogin', '/OrumAdminLogin/comercios']
    expect(anotarVisita(pila, '/OrumAdminLogin/comercios?estado=ocultos')).toEqual([
      '/OrumAdminLogin',
      '/OrumAdminLogin/comercios?estado=ocultos',
    ])
  })

  it('volver a un lugar de la pila corta ahí (cerrar una ventana no la deja como anterior)', () => {
    const pila = ['/OrumAdminLogin/comercios', '/OrumAdminLogin/comercios/43', '/OrumAdminLogin/comercios/43/editar']
    expect(anotarVisita(pila, '/OrumAdminLogin/comercios/43')).toEqual(['/OrumAdminLogin/comercios', '/OrumAdminLogin/comercios/43'])
  })

  it('tiene tope', () => {
    let pila: string[] = []
    for (let i = 0; i < TOPE_PILA + 5; i++) pila = anotarVisita(pila, `/OrumAdminLogin/miembros/${i}`)
    expect(pila).toHaveLength(TOPE_PILA)
    expect(pila.at(-1)).toBe(`/OrumAdminLogin/miembros/${TOPE_PILA + 4}`)
  })
})

describe('ventanas encima (visto en producción el 11/11/2026)', () => {
  it('una ventana encima no se anota como lugar', () => {
    const pila = ['/OrumAdminLogin/metricas?desde=2026-01-01']
    expect(anotarVisita(pila, '/OrumAdminLogin/metricas/comercio/61?desde=2026-01-01')).toEqual(pila)
    expect(anotarVisita(['/OrumAdminLogin/miembros/12'], '/OrumAdminLogin/miembros/12/editar')).toEqual(['/OrumAdminLogin/miembros/12'])
  })

  it('limpia las ventanas que una versión anterior dejó anotadas', () => {
    expect(anotarVisita(['/OrumAdminLogin/metricas', '/OrumAdminLogin/metricas/comercio/61'], '/OrumAdminLogin/bitacora')).toEqual([
      '/OrumAdminLogin/metricas',
      '/OrumAdminLogin/bitacora',
    ])
  })

  it('Métricas → detalle de un comercio → Bitácora: «Volver» va a Métricas, no al detalle', () => {
    let pila: string[] = []
    for (const url of ['/OrumAdminLogin/metricas?desde=2026-01-01', '/OrumAdminLogin/metricas/comercio/61', '/OrumAdminLogin/bitacora']) {
      pila = anotarVisita(pila, url)
    }
    expect(destinoVolver(pila, '/OrumAdminLogin/bitacora')).toBe('/OrumAdminLogin/metricas?desde=2026-01-01')
  })

  it('un formulario a pantalla completa vuelve al lugar desde el que se abrió', () => {
    expect(destinoVolver(['/OrumAdminLogin', '/OrumAdminLogin/miembros?ver=vigentes'], '/OrumAdminLogin/miembros/nuevo')).toBe(
      '/OrumAdminLogin/miembros?ver=vigentes',
    )
    // Sin pila (enlace directo), al lugar que lo contiene.
    expect(destinoVolver([], '/OrumAdminLogin/miembros/nuevo')).toBe('/OrumAdminLogin/miembros')
    expect(destinoVolver([], '/OrumAdminLogin/metricas/comercio/61')).toBe('/OrumAdminLogin/metricas')
  })
})

describe('destinoVolver', () => {
  it('vuelve al lugar anterior tal como se dejó, con sus filtros', () => {
    const pila = ['/OrumAdminLogin', '/OrumAdminLogin/comercios?estado=ocultos&pagina=2', '/OrumAdminLogin/comercios/43']
    expect(destinoVolver(pila, '/OrumAdminLogin/comercios/43?pestana=imagenes')).toBe(
      '/OrumAdminLogin/comercios?estado=ocultos&pagina=2',
    )
  })

  it('respeta de dónde se vino: de Reseñas a la ficha, vuelve a Reseñas', () => {
    const pila = ['/OrumAdminLogin/resenas?ver=por_revisar', '/OrumAdminLogin/comercios/43']
    expect(destinoVolver(pila, '/OrumAdminLogin/comercios/43')).toBe('/OrumAdminLogin/resenas?ver=por_revisar')
  })

  it('sin pila (enlace directo, recarga) sube al lugar de arriba', () => {
    expect(destinoVolver([], '/OrumAdminLogin/comercios/43')).toBe('/OrumAdminLogin/comercios')
    expect(destinoVolver(['/OrumAdminLogin/comercios/43'], '/OrumAdminLogin/comercios/43')).toBe('/OrumAdminLogin/comercios')
  })
})

describe('rutaPadre', () => {
  it('las secciones suben al inicio', () => {
    expect(rutaPadre('/OrumAdminLogin/comercios')).toBe('/OrumAdminLogin')
    expect(rutaPadre('/OrumAdminLogin/bitacora?accion=alta')).toBe('/OrumAdminLogin')
  })

  it('los formularios suben al lugar que los contiene', () => {
    expect(rutaPadre('/OrumAdminLogin/miembros/12/renovar')).toBe('/OrumAdminLogin/miembros/12')
    expect(rutaPadre('/OrumAdminLogin/miembros/12/foto/retirar')).toBe('/OrumAdminLogin/miembros/12')
    expect(rutaPadre('/OrumAdminLogin/miembros/nuevo')).toBe('/OrumAdminLogin/miembros')
    expect(rutaPadre('/OrumAdminLogin/miembros/numeros/cargar')).toBe('/OrumAdminLogin/miembros/numeros')
    expect(rutaPadre('/OrumAdminLogin/usuarios/abc/editar')).toBe('/OrumAdminLogin/usuarios')
    expect(rutaPadre('/OrumAdminLogin/cuenta/password')).toBe('/OrumAdminLogin')
    expect(rutaPadre('/OrumAdminLogin/metricas/comercio/5')).toBe('/OrumAdminLogin/metricas')
  })

  it('lo de la ficha del comercio vuelve a SU pestaña', () => {
    expect(rutaPadre('/OrumAdminLogin/comercios/43/sucursales/nueva')).toBe('/OrumAdminLogin/comercios/43?pestana=sucursales')
    expect(rutaPadre('/OrumAdminLogin/comercios/43/promociones/7/editar')).toBe('/OrumAdminLogin/comercios/43?pestana=promociones')
    expect(rutaPadre('/OrumAdminLogin/comercios/43/imagenes')).toBe('/OrumAdminLogin/comercios/43?pestana=imagenes')
    expect(rutaPadre('/OrumAdminLogin/comercios/43/editar')).toBe('/OrumAdminLogin/comercios/43')
  })
})

describe('textoVolver y hayVolver', () => {
  it('nombra el destino cuando lo conoce', () => {
    expect(textoVolver('/OrumAdminLogin')).toBe('Volver al inicio')
    expect(textoVolver('/OrumAdminLogin/comercios?estado=ocultos')).toBe('Volver a Comercios')
    expect(textoVolver('/OrumAdminLogin/comercios/43?pestana=sucursales')).toBe('Volver al comercio')
    expect(textoVolver('/OrumAdminLogin/miembros/12')).toBe('Volver al miembro')
    expect(textoVolver('/OrumAdminLogin/algo/raro')).toBe('Volver')
  })

  it('no hay «volver» en la portada del panel', () => {
    expect(hayVolver('/OrumAdminLogin')).toBe(false)
    expect(hayVolver('/OrumAdminLogin/comercios')).toBe(true)
    expect(hayVolver('/miembros')).toBe(false)
  })
})
