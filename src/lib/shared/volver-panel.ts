/*
  «VOLVER» EN EL PANEL  ·  puro (07/11/2026)
  ---------------------------------------------------------------------------
  Encargo del propietario: «añade la funcionalidad para ir atrás, en todos
  los apartados del portal administrador».

  No es el «atrás» del navegador: las pestañas, los filtros y las páginas de
  una lista viven en la URL, así que el historial tiene un paso por cada
  pestaña tocada y «atrás» las recorrería una a una. Aquí se lleva una PILA
  de LUGARES (una entrada por ruta, con la última URL que tuvo, filtros
  incluidos):

    · `anotarVisita`: al llegar a una ruta que ya está en la pila, se corta
      ahí (volver a un sitio no apila otro paso: así, cerrar una ventana
      encima no deja la ventana como «anterior»); si es nueva, se añade.
    · `destinoVolver`: el lugar anterior, tal como se dejó; si no hay (se
      entró por un enlace directo o se recargó), el lugar de arriba
      (`rutaPadre`).
*/

/** Cuántos lugares se recuerdan. Más atrás nadie vuelve paso a paso. */
export const TOPE_PILA = 20

export type Pila = readonly string[]

/** La ruta sin la consulta: «/admin/comercios?estado=ocultos» → «/admin/comercios». */
export function rutaDe(url: string): string {
  const sinConsulta = url.split(/[?#]/)[0] || '/'
  return sinConsulta.length > 1 ? sinConsulta.replace(/\/+$/, '') : sinConsulta
}

export function anotarVisita(pila: Pila, url: string): string[] {
  const ruta = rutaDe(url)
  const i = pila.findIndex((u) => rutaDe(u) === ruta)
  if (i >= 0) return [...pila.slice(0, i), url]
  return [...pila, url].slice(-TOPE_PILA)
}

/**
 * Los LUGARES del panel: donde se trabaja (listas y fichas). Un formulario
 * (`nuevo`, `editar`, `renovar`…) no es un lugar: «volver» desde él va al
 * lugar que lo contiene.
 */
const LUGARES: readonly RegExp[] = [
  /^\/admin$/,
  /^\/admin\/(anuncios|bitacora|comercios|metricas|miembros|planes|publicidad|resenas|usuarios)$/,
  /^\/admin\/comercios\/\d+$/,
  /^\/admin\/miembros\/\d+$/,
  /^\/admin\/miembros\/numeros$/,
  /^\/admin\/metricas\/comercio\/\d+$/,
]

const esLugar = (ruta: string) => LUGARES.some((r) => r.test(ruta))

/** Las partes de la ficha del comercio que son una pestaña de ella. */
const PESTANA_COMERCIO = /^\/admin\/comercios\/(\d+)\/(sucursales|promociones|imagenes|resenas)(\/|$)/

/** El lugar de arriba: el que contiene a esta pantalla. */
export function rutaPadre(url: string): string {
  const ruta = rutaDe(url)
  const pestana = PESTANA_COMERCIO.exec(ruta)
  if (pestana) return `/admin/comercios/${pestana[1]}?pestana=${pestana[2]}`

  const partes = ruta.split('/').filter(Boolean)
  for (let n = partes.length - 1; n >= 1; n--) {
    const arriba = `/${partes.slice(0, n).join('/')}`
    if (esLugar(arriba)) return arriba
  }
  return '/admin'
}

/** Adónde lleva «Volver» desde `actual`. */
export function destinoVolver(pila: Pila, actual: string): string {
  const ruta = rutaDe(actual)
  const i = pila.findIndex((u) => rutaDe(u) === ruta)
  if (i > 0) return pila[i - 1]
  return rutaPadre(actual)
}

const NOMBRES: Record<string, string> = {
  '/admin': 'Volver al inicio',
  '/admin/anuncios': 'Volver a Novedades',
  '/admin/bitacora': 'Volver a Bitácora',
  '/admin/comercios': 'Volver a Comercios',
  '/admin/metricas': 'Volver a Métricas',
  '/admin/miembros': 'Volver a Miembros',
  '/admin/planes': 'Volver a Planes',
  '/admin/publicidad': 'Volver a Publicidad',
  '/admin/resenas': 'Volver a Reseñas',
  '/admin/usuarios': 'Volver a Usuarios',
  '/admin/miembros/numeros': 'Volver a Números de registro',
}

/** Lo que dice el botón: adónde va, cuando se sabe nombrarlo. */
export function textoVolver(destino: string): string {
  const ruta = rutaDe(destino)
  if (NOMBRES[ruta]) return NOMBRES[ruta]
  if (/^\/admin\/comercios\/\d+$/.test(ruta)) return 'Volver al comercio'
  if (/^\/admin\/miembros\/\d+$/.test(ruta)) return 'Volver al miembro'
  if (/^\/admin\/metricas\/comercio\/\d+$/.test(ruta)) return 'Volver al detalle de ventas'
  return 'Volver'
}

/** En la portada del panel no hay adónde volver. */
export function hayVolver(url: string): boolean {
  const ruta = rutaDe(url)
  return ruta.startsWith('/admin/') && ruta !== '/admin'
}
