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
    expect(rutaDe('/admin/comercios?estado=ocultos')).toBe('/admin/comercios')
    expect(rutaDe('/admin/comercios/')).toBe('/admin/comercios')
    expect(rutaDe('/admin#x')).toBe('/admin')
  })
})

describe('anotarVisita', () => {
  it('añade los lugares nuevos', () => {
    expect(anotarVisita(['/admin'], '/admin/comercios')).toEqual(['/admin', '/admin/comercios'])
  })

  it('cambiar de pestaña o filtro no apila: guarda la URL nueva del mismo lugar', () => {
    const pila = ['/admin', '/admin/comercios']
    expect(anotarVisita(pila, '/admin/comercios?estado=ocultos')).toEqual([
      '/admin',
      '/admin/comercios?estado=ocultos',
    ])
  })

  it('volver a un lugar de la pila corta ahí (cerrar una ventana no la deja como anterior)', () => {
    const pila = ['/admin/comercios', '/admin/comercios/43', '/admin/comercios/43/editar']
    expect(anotarVisita(pila, '/admin/comercios/43')).toEqual(['/admin/comercios', '/admin/comercios/43'])
  })

  it('tiene tope', () => {
    let pila: string[] = []
    for (let i = 0; i < TOPE_PILA + 5; i++) pila = anotarVisita(pila, `/admin/miembros/${i}`)
    expect(pila).toHaveLength(TOPE_PILA)
    expect(pila.at(-1)).toBe(`/admin/miembros/${TOPE_PILA + 4}`)
  })
})

describe('ventanas encima (visto en producción el 11/11/2026)', () => {
  it('una ventana encima no se anota como lugar', () => {
    const pila = ['/admin/metricas?desde=2026-01-01']
    expect(anotarVisita(pila, '/admin/metricas/comercio/61?desde=2026-01-01')).toEqual(pila)
    expect(anotarVisita(['/admin/miembros/12'], '/admin/miembros/12/editar')).toEqual(['/admin/miembros/12'])
  })

  it('limpia las ventanas que una versión anterior dejó anotadas', () => {
    expect(anotarVisita(['/admin/metricas', '/admin/metricas/comercio/61'], '/admin/bitacora')).toEqual([
      '/admin/metricas',
      '/admin/bitacora',
    ])
  })

  it('Métricas → detalle de un comercio → Bitácora: «Volver» va a Métricas, no al detalle', () => {
    let pila: string[] = []
    for (const url of ['/admin/metricas?desde=2026-01-01', '/admin/metricas/comercio/61', '/admin/bitacora']) {
      pila = anotarVisita(pila, url)
    }
    expect(destinoVolver(pila, '/admin/bitacora')).toBe('/admin/metricas?desde=2026-01-01')
  })

  it('un formulario a pantalla completa vuelve al lugar desde el que se abrió', () => {
    expect(destinoVolver(['/admin', '/admin/miembros?ver=vigentes'], '/admin/miembros/nuevo')).toBe(
      '/admin/miembros?ver=vigentes',
    )
    // Sin pila (enlace directo), al lugar que lo contiene.
    expect(destinoVolver([], '/admin/miembros/nuevo')).toBe('/admin/miembros')
    expect(destinoVolver([], '/admin/metricas/comercio/61')).toBe('/admin/metricas')
  })
})

describe('destinoVolver', () => {
  it('vuelve al lugar anterior tal como se dejó, con sus filtros', () => {
    const pila = ['/admin', '/admin/comercios?estado=ocultos&pagina=2', '/admin/comercios/43']
    expect(destinoVolver(pila, '/admin/comercios/43?pestana=imagenes')).toBe(
      '/admin/comercios?estado=ocultos&pagina=2',
    )
  })

  it('respeta de dónde se vino: de Reseñas a la ficha, vuelve a Reseñas', () => {
    const pila = ['/admin/resenas?ver=por_revisar', '/admin/comercios/43']
    expect(destinoVolver(pila, '/admin/comercios/43')).toBe('/admin/resenas?ver=por_revisar')
  })

  it('sin pila (enlace directo, recarga) sube al lugar de arriba', () => {
    expect(destinoVolver([], '/admin/comercios/43')).toBe('/admin/comercios')
    expect(destinoVolver(['/admin/comercios/43'], '/admin/comercios/43')).toBe('/admin/comercios')
  })
})

describe('rutaPadre', () => {
  it('las secciones suben al inicio', () => {
    expect(rutaPadre('/admin/comercios')).toBe('/admin')
    expect(rutaPadre('/admin/bitacora?accion=alta')).toBe('/admin')
  })

  it('los formularios suben al lugar que los contiene', () => {
    expect(rutaPadre('/admin/miembros/12/renovar')).toBe('/admin/miembros/12')
    expect(rutaPadre('/admin/miembros/12/foto/retirar')).toBe('/admin/miembros/12')
    expect(rutaPadre('/admin/miembros/nuevo')).toBe('/admin/miembros')
    expect(rutaPadre('/admin/miembros/numeros/cargar')).toBe('/admin/miembros/numeros')
    expect(rutaPadre('/admin/usuarios/abc/editar')).toBe('/admin/usuarios')
    expect(rutaPadre('/admin/cuenta/password')).toBe('/admin')
    expect(rutaPadre('/admin/metricas/comercio/5')).toBe('/admin/metricas')
  })

  it('lo de la ficha del comercio vuelve a SU pestaña', () => {
    expect(rutaPadre('/admin/comercios/43/sucursales/nueva')).toBe('/admin/comercios/43?pestana=sucursales')
    expect(rutaPadre('/admin/comercios/43/promociones/7/editar')).toBe('/admin/comercios/43?pestana=promociones')
    expect(rutaPadre('/admin/comercios/43/imagenes')).toBe('/admin/comercios/43?pestana=imagenes')
    expect(rutaPadre('/admin/comercios/43/editar')).toBe('/admin/comercios/43')
  })
})

describe('textoVolver y hayVolver', () => {
  it('nombra el destino cuando lo conoce', () => {
    expect(textoVolver('/admin')).toBe('Volver al inicio')
    expect(textoVolver('/admin/comercios?estado=ocultos')).toBe('Volver a Comercios')
    expect(textoVolver('/admin/comercios/43?pestana=sucursales')).toBe('Volver al comercio')
    expect(textoVolver('/admin/miembros/12')).toBe('Volver al miembro')
    expect(textoVolver('/admin/algo/raro')).toBe('Volver')
  })

  it('no hay «volver» en la portada del panel', () => {
    expect(hayVolver('/admin')).toBe(false)
    expect(hayVolver('/admin/comercios')).toBe(true)
    expect(hayVolver('/miembros')).toBe(false)
  })
})
